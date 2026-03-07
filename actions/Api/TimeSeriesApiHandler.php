<?php

namespace Modules\ReactDashboard\Actions\Api;

use API;

final class TimeSeriesApiHandler {
    private const DEFAULT_LOOKBACK_HOURS = 24;
    private const DEFAULT_HISTORY_POINTS = 500;
    private const MAX_LOOKBACK_HOURS = 24 * 14;
    private const MAX_HISTORY_POINTS = 2000;
    private const MAX_HISTORY_CALLS_PER_REQUEST = 250;
    private const MAX_TIMESERIES_SERIES = 12;

    public function handle(string $action, array $request): ?array {
        if ($action !== 'timeseries_data') {
            return null;
        }

        $hostids = ApiRequest::parseIds((string) ApiRequest::scalar($request, 'hostids_csv', ''));
        $lookback_hours = ApiRequest::clampInt((int) ApiRequest::scalar($request, 'lookback_hours', self::DEFAULT_LOOKBACK_HOURS), 1, self::MAX_LOOKBACK_HOURS);
        $history_points = ApiRequest::clampInt((int) ApiRequest::scalar($request, 'history_points', self::DEFAULT_HISTORY_POINTS), 50, self::MAX_HISTORY_POINTS);
        $series_defs = $this->parseTimeSeriesConfig((string) ApiRequest::scalar($request, 'series_json', ''));

        $time_to = time();
        $time_from = $time_to - ($lookback_hours * 3600);
        if ($series_defs === []) {
            return [
                'series' => [],
                'time_from' => $time_from,
                'time_to' => $time_to,
                'error' => null
            ];
        }

        $series = [];
        $history_budget = self::MAX_HISTORY_CALLS_PER_REQUEST;

        foreach ($series_defs as $index => $series_def) {
            if ($history_budget <= 0) {
                break;
            }

            $item_params = [
                'output' => ['itemid', 'name', 'key_', 'value_type'],
                'selectHosts' => ['hostid', 'name'],
                'itemids' => [$series_def['itemid']],
                'monitored' => true,
                'limit' => 1
            ];
            $effective_hostids = [];
            if (!empty($series_def['hostid'])) {
                $effective_hostids = [$series_def['hostid']];
            }
            elseif ($hostids !== []) {
                $effective_hostids = $hostids;
            }
            if ($effective_hostids !== []) {
                $item_params['hostids'] = $effective_hostids;
            }

            $items = API::Item()->get($item_params) ?: [];
            if ($items === []) {
                continue;
            }

            $item = $items[0];
            $value_type = (int) ($item['value_type'] ?? -1);
            if (!in_array($value_type, [0, 1, 2, 3, 4], true)) {
                continue;
            }

            $history = API::History()->get([
                'output' => ['clock', 'value'],
                'itemids' => [(string) $item['itemid']],
                'history' => $value_type,
                'time_from' => $time_from,
                'time_till' => $time_to,
                'sortfield' => 'clock',
                'sortorder' => 'ASC',
                'limit' => $history_points
            ]) ?: [];
            $history_budget--;

            $points = [];
            foreach ($history as $point) {
                $clock = (int) ($point['clock'] ?? 0);
                $raw_value = (string) ($point['value'] ?? '');
                if ($clock < $time_from || $clock > $time_to || !is_numeric($raw_value)) {
                    continue;
                }
                $points[] = [
                    't' => $clock,
                    'v' => (float) $raw_value
                ];
            }

            if ($points === []) {
                continue;
            }

            $host_name = isset($item['hosts'][0]['name']) ? (string) $item['hosts'][0]['name'] : 'Host';
            $series[] = [
                'series_id' => $series_def['series_id'],
                'itemid' => (string) ($item['itemid'] ?? ''),
                'label' => $series_def['label'] !== ''
                    ? $series_def['label']
                    : sprintf('%s :: %s', $host_name, (string) ($item['name'] ?? 'Item')),
                'name' => (string) ($item['name'] ?? ''),
                'key_' => (string) ($item['key_'] ?? ''),
                'host' => $host_name,
                'color' => $series_def['color'] ?: $this->defaultSeriesColor($index),
                'draw_style' => $series_def['draw_style'],
                'line_width' => $series_def['line_width'],
                'fill_opacity' => $series_def['fill_opacity'],
                'show_points' => $series_def['show_points'],
                'axis' => $series_def['axis'],
                'show_in_legend' => $series_def['show_in_legend'],
                'points' => $points
            ];
        }

        return [
            'series' => $series,
            'time_from' => $time_from,
            'time_to' => $time_to,
            'error' => null
        ];
    }

    private function parseTimeSeriesConfig(string $raw): array {
        $raw = trim($raw);
        if ($raw === '') {
            return [];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return [];
        }

        $series = [];
        foreach (array_slice($data, 0, self::MAX_TIMESERIES_SERIES) as $index => $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $normalized = $this->normalizeTimeSeriesConfigRow($entry, $index);
            if ($normalized !== null) {
                $series[] = $normalized;
            }
        }

        return $series;
    }

    private function normalizeTimeSeriesConfigRow(array $entry, int $index): ?array {
        $itemid = trim((string) ($entry['itemid'] ?? ''));
        if (!ctype_digit($itemid)) {
            return null;
        }

        $series_id = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($entry['id'] ?? ''));
        if ($series_id === null || $series_id === '') {
            $series_id = 'series_'.($index + 1);
        }

        $draw_style = strtolower(trim((string) ($entry['drawStyle'] ?? 'line')));
        if (!in_array($draw_style, ['line', 'points', 'bars'], true)) {
            $draw_style = 'line';
        }

        $color = strtoupper(trim((string) ($entry['color'] ?? '')));
        if (preg_match('/^#[0-9A-F]{6}$/', $color) !== 1) {
            $color = $this->defaultSeriesColor($index);
        }

        return [
            'series_id' => substr($series_id, 0, 80),
            'itemid' => $itemid,
            'hostid' => ctype_digit((string) ($entry['hostid'] ?? '')) ? (string) $entry['hostid'] : '',
            'label' => substr(trim((string) ($entry['label'] ?? '')), 0, 120),
            'color' => $color,
            'draw_style' => $draw_style,
            'line_width' => ApiRequest::clampInt((int) ($entry['lineWidth'] ?? 2), 1, 8),
            'fill_opacity' => ApiRequest::clampInt((int) ($entry['fillOpacity'] ?? 0), 0, 100),
            'show_points' => ((int) ($entry['showPoints'] ?? 0)) === 1 ? 1 : 0,
            'axis' => strtolower(trim((string) ($entry['axis'] ?? 'left'))) === 'right' ? 'right' : 'left',
            'show_in_legend' => ((int) ($entry['showInLegend'] ?? 1)) === 1 ? 1 : 0
        ];
    }

    private function defaultSeriesColor(int $index): string {
        $palette = [
            '#5794F2',
            '#73BF69',
            '#FADE2A',
            '#FF9830',
            '#E24D42',
            '#B877D9',
            '#56D2C6',
            '#F2495C',
            '#8AB8FF',
            '#7EE787',
            '#F6C25B',
            '#A3AED0'
        ];

        return $palette[$index % count($palette)];
    }
}
