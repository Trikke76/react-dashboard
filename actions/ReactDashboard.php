<?php
namespace Modules\ReactDashboard\Actions;

use API;
use CController;
use CControllerResponseData;
use CProfile;
use CWebUser;

class ReactDashboard extends CController {
    private const DEFAULT_LOOKBACK_HOURS = 24;
    private const DEFAULT_MAX_ROWS = 20;
    private const DEFAULT_HISTORY_POINTS = 500;
    private const DEFAULT_STATE_MAP = 'value:1=OK|#2E7D32,value:0=Problem|#C62828';
    private const MAX_DATASETS = 20;
    private const MAX_STATE_MAP_LENGTH = 2048;
    private const MAX_REGEX_PATTERN_LENGTH = 128;

    protected function init(): void {
        $this->disableCsrfValidation();
    }

    protected function checkInput(): bool {
        return true;
    }

    protected function checkPermissions(): bool {
        return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
    }

    protected function doAction(): void {
        $action = (string) $this->req('action_type', '');
        if ($action !== '') {
            $this->handleApiAction($action);
            return;
        }

        $module_path = dirname(__DIR__);

        $layout_macro = API::UserMacro()->get([
            'output' => ['value'],
            'globalmacro' => true,
            'macro' => '{$REACT_DASHBOARD_LAYOUT}'
        ]);

        $default_layout = [
            ['i' => 'w1', 'x' => 0, 'y' => 0, 'w' => 6, 'h' => 6, 'type' => 'Clock'],
            ['i' => 'w2', 'x' => 6, 'y' => 0, 'w' => 3, 'h' => 4, 'type' => 'Clock']
        ];

        $current_layout = ($layout_macro && !empty($layout_macro[0]['value']))
            ? json_decode($layout_macro[0]['value'], true)
            : $default_layout;

        $saved_hostid = CProfile::get('web.react_dashboard.hostid', 0);
        $selected_host = null;
        if ($saved_hostid > 0) {
            $hosts = API::Host()->get([
                'output' => ['hostid', 'name'],
                'hostids' => $saved_hostid
            ]);
            if ($hosts) {
                $selected_host = ['id' => $hosts[0]['hostid'], 'name' => $hosts[0]['name']];
            }
        }

        $this->setResponse(new CControllerResponseData([
            'title' => 'React Dashboard',
            'module_path' => $module_path,
            'saved_host' => $selected_host,
            'current_layout' => $current_layout,
            'user_theme' => getUserTheme(CWebUser::$data),
            'user_data' => [
                'alias' => CWebUser::$data['username'] ?? 'Zabbix User'
            ]
        ]));
    }

    private function handleApiAction(string $action): void {
        if ($action === 'get_groups') {
            $groups = API::HostGroup()->get([
                'output' => ['groupid', 'name'],
                'real_hosts' => true,
                'monitored_hosts' => true,
                'sortfield' => 'name'
            ]) ?: [];

            $this->respondJson(array_values($groups));
        }

        if ($action === 'get_hosts_by_group') {
            $groupid = (string) $this->req('groupid', '');
            $groupid = ctype_digit($groupid) ? $groupid : null;
            $hosts = API::Host()->get([
                'output' => ['hostid', 'name', 'available'],
                'groupids' => $groupid,
                'monitored_hosts' => true,
                'sortfield' => 'name'
            ]) ?: [];

            $this->respondJson(array_values($hosts));
        }

        if ($action === 'timestate_items') {
            $hostids = $this->parseIds((string) $this->req('hostids_csv', ''));
            [$filter_mode, $item_filter] = $this->resolveFilterInput();
            $max_rows = $this->clampInt((int) $this->req('max_rows', 20), 1, 200);
            $filter_exact = ((int) $this->req('filter_exact', 0)) === 1;

            if ($hostids === []) {
                $this->respondJson(['items' => []]);
            }

            $params = [
                'output' => ['itemid', 'name', 'key_', 'value_type'],
                'selectHosts' => ['name'],
                'hostids' => $hostids,
                'monitored' => true,
                'limit' => min(5000, $max_rows * 10)
            ];

            if ($item_filter !== '') {
                $search_field = $filter_mode === 'name' ? 'name' : 'key_';
                $params['search'] = [
                    $search_field => $this->normalizeSearchPattern($item_filter)
                ];
                $params['searchWildcardsEnabled'] = true;
            }

            $items = API::Item()->get($params) ?: [];
            if ($filter_exact) {
                $items = array_values(array_filter($items, static function(array $item) use ($item_filter, $filter_mode): bool {
                    if ($item_filter === '') {
                        return true;
                    }

                    $field = $filter_mode === 'name' ? 'name' : 'key_';
                    return strcasecmp((string) ($item[$field] ?? ''), $item_filter) === 0;
                }));
            }

            usort($items, static function(array $a, array $b): int {
                $host_a = isset($a['hosts'][0]['name']) ? (string) $a['hosts'][0]['name'] : '';
                $host_b = isset($b['hosts'][0]['name']) ? (string) $b['hosts'][0]['name'] : '';
                $host_cmp = strcasecmp($host_a, $host_b);
                if ($host_cmp !== 0) {
                    return $host_cmp;
                }
                return strcasecmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
            });

            $result = [];
            foreach ($items as $item) {
                $host_name = isset($item['hosts'][0]['name']) ? (string) $item['hosts'][0]['name'] : 'Host';
                $result[] = [
                    'itemid' => (string) ($item['itemid'] ?? ''),
                    'name' => (string) ($item['name'] ?? ''),
                    'key_' => (string) ($item['key_'] ?? ''),
                    'host' => $host_name,
                    'label' => sprintf('%s :: %s [%s]', $host_name, (string) ($item['name'] ?? ''), (string) ($item['key_'] ?? ''))
                ];
                if (count($result) >= $max_rows) {
                    break;
                }
            }

            $this->respondJson(['items' => $result]);
        }

        if ($action === 'timestate_data') {
            $hostids = $this->parseIds((string) $this->req('hostids_csv', ''));
            $itemids = $this->parseIds((string) $this->req('itemids_csv', ''));
            if ($hostids === [] && $itemids === []) {
                $this->respondJson(['error' => 'Selecteer minstens een host of item.']);
            }

            [$legacy_filter_mode, $legacy_item_filter] = $this->resolveFilterInput();
            $row_sort = $this->clampInt((int) $this->req('row_sort', 0), 0, 2);
            $fallback_data_set = [
                'filter_type' => $legacy_filter_mode,
                'filter_value' => $legacy_item_filter,
                'filter_exact' => ((int) $this->req('filter_exact', 0)) === 1 ? 1 : 0,
                'lookback_hours' => $this->clampInt((int) $this->req('lookback_hours', self::DEFAULT_LOOKBACK_HOURS), 1, 24 * 31),
                'max_rows' => $this->clampInt((int) $this->req('max_rows', self::DEFAULT_MAX_ROWS), 1, 200),
                'history_points' => $this->clampInt((int) $this->req('history_points', self::DEFAULT_HISTORY_POINTS), 50, 5000),
                'merge_equal_states' => ((int) $this->req('merge_equal_states', 1)) === 1 ? 1 : 0,
                'merge_shorter_than' => $this->clampInt((int) $this->req('merge_shorter_than', 0), 0, 3600),
                'null_gap_mode' => ((int) $this->req('null_gap_mode', 0)) === 1 ? 1 : 0,
                'null_gap_backfill_first' => ((int) $this->req('null_gap_backfill_first', 0)) === 1 ? 1 : 0,
                'state_map' => (string) $this->req('state_map', self::DEFAULT_STATE_MAP)
            ];
            $datasets = $this->parseDataSets((string) $this->req('datasets_json', ''), $fallback_data_set);

            $time_to = time();
            $global_time_from = $time_to;
            $base_colors = $this->buildBaseColorMap();
            $rows = [];
            $seen_itemids = [];

            foreach ($datasets as $data_set_idx => $data_set) {
                $lookback_hours = (int) $data_set['lookback_hours'];
                $dataset_time_from = $time_to - ($lookback_hours * 3600);
                $global_time_from = min($global_time_from, $dataset_time_from);

                $params = [
                    'output' => ['itemid', 'name', 'key_', 'value_type'],
                    'selectHosts' => ['name'],
                    'monitored' => true,
                    'limit' => ((int) $data_set['max_rows']) * 8
                ];

                if ($hostids !== []) {
                    $params['hostids'] = $hostids;
                }
                if ($itemids !== []) {
                    $params['itemids'] = $itemids;
                }

                $filter_type = (string) ($data_set['filter_type'] ?? 'key');
                $filter_value = trim((string) ($data_set['filter_value'] ?? ''));
                if ($itemids === [] && $filter_value !== '') {
                    $search_field = $filter_type === 'name' ? 'name' : 'key_';
                    $params['search'] = [
                        $search_field => $this->normalizeSearchPattern($filter_value)
                    ];
                    $params['searchWildcardsEnabled'] = true;
                }

                $items = API::Item()->get($params) ?: [];
                if ((int) ($data_set['filter_exact'] ?? 0) === 1 && $filter_value !== '') {
                    $items = array_values(array_filter($items, static function(array $item) use ($filter_value, $filter_type): bool {
                        $field = $filter_type === 'name' ? 'name' : 'key_';
                        return strcasecmp((string) ($item[$field] ?? ''), $filter_value) === 0;
                    }));
                }

                usort($items, static function(array $a, array $b): int {
                    $host_a = isset($a['hosts'][0]['name']) ? (string) $a['hosts'][0]['name'] : '';
                    $host_b = isset($b['hosts'][0]['name']) ? (string) $b['hosts'][0]['name'] : '';
                    $cmp = strcasecmp($host_a, $host_b);
                    if ($cmp !== 0) {
                        return $cmp;
                    }
                    return strcasecmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
                });

                $rows_from_dataset = 0;
                $dataset_name = trim((string) ($data_set['name'] ?? ''));
                if ($dataset_name === '') {
                    $dataset_name = 'Data source #'.($data_set_idx + 1);
                }
                $rules = is_array($data_set['rules']) ? $data_set['rules'] : [];

                foreach ($items as $item) {
                    if ($rows_from_dataset >= (int) $data_set['max_rows']) {
                        break;
                    }

                    $itemid = (string) ($item['itemid'] ?? '');
                    if ($itemid === '' || isset($seen_itemids[$itemid])) {
                        continue;
                    }

                    $value_type = (int) ($item['value_type'] ?? -1);
                    if (!in_array($value_type, [0, 1, 2, 3, 4], true)) {
                        continue;
                    }

                    $history = API::History()->get([
                        'output' => ['clock', 'value'],
                        'itemids' => [$itemid],
                        'history' => $value_type,
                        'time_from' => $dataset_time_from,
                        'time_till' => $time_to,
                        'sortfield' => 'clock',
                        'sortorder' => 'ASC',
                        'limit' => (int) $data_set['history_points']
                    ]) ?: [];

                    $segments = $this->buildSegments(
                        $history,
                        $dataset_time_from,
                        $time_to,
                        $rules,
                        $base_colors,
                        ((int) $data_set['merge_equal_states']) === 1,
                        ((int) $data_set['null_gap_mode']) === 1,
                        (int) $data_set['merge_shorter_than'],
                        ((int) $data_set['null_gap_backfill_first']) === 1
                    );
                    if ($segments === []) {
                        continue;
                    }

                    $host_name = isset($item['hosts'][0]['name']) ? (string) $item['hosts'][0]['name'] : 'Host';
                    $rows[] = [
                        'row_label' => sprintf('%s :: %s :: %s', $dataset_name, $host_name, (string) ($item['name'] ?? 'Item')),
                        'dataset_name' => $dataset_name,
                        'host_name' => $host_name,
                        'itemid' => $itemid,
                        'key_' => (string) ($item['key_'] ?? ''),
                        'segments' => $segments
                    ];
                    $seen_itemids[$itemid] = true;
                    $rows_from_dataset++;
                }
            }

            if ($row_sort === 1) {
                usort($rows, [$this, 'sortByCurrentState']);
            }
            elseif ($row_sort === 2) {
                usort($rows, static function(array $a, array $b): int {
                    $la = (int) (($a['segments'][count($a['segments']) - 1]['t_from'] ?? 0));
                    $lb = (int) (($b['segments'][count($b['segments']) - 1]['t_from'] ?? 0));
                    if ($la !== $lb) {
                        return $lb <=> $la;
                    }
                    return strcasecmp((string) ($a['row_label'] ?? ''), (string) ($b['row_label'] ?? ''));
                });
            }
            else {
                usort($rows, static function(array $a, array $b): int {
                    return strcasecmp((string) ($a['row_label'] ?? ''), (string) ($b['row_label'] ?? ''));
                });
            }

            $this->respondJson([
                'rows' => $rows,
                'time_from' => $global_time_from === $time_to ? ($time_to - (self::DEFAULT_LOOKBACK_HOURS * 3600)) : $global_time_from,
                'time_to' => $time_to,
                'error' => null
            ]);
        }

        $this->respondJson(['error' => 'Onbekende action_type']);
    }

    private function sortByCurrentState(array $a, array $b): int {
        $la = (string) (($a['segments'][count($a['segments']) - 1]['state'] ?? 'unknown'));
        $lb = (string) (($b['segments'][count($b['segments']) - 1]['state'] ?? 'unknown'));
        $pa = $this->stateSortPriority($la);
        $pb = $this->stateSortPriority($lb);
        if ($pa !== $pb) {
            return $pa <=> $pb;
        }
        return strcasecmp((string) ($a['row_label'] ?? ''), (string) ($b['row_label'] ?? ''));
    }

    private function stateSortPriority(string $state): int {
        if ($state === '0') {
            return 0;
        }
        if ($state === 'unknown') {
            return 1;
        }
        return 2;
    }

    private function req(string $name, $default = null) {
        if (!array_key_exists($name, $_REQUEST)) {
            return $default;
        }

        $value = $_REQUEST[$name];
        return is_scalar($value) ? $value : $default;
    }

    private function respondJson($payload): void {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload);
        exit;
    }

    private function parseIds(string $raw): array {
        $tokens = preg_split('/[\s,]+/', trim($raw)) ?: [];
        $ids = [];

        foreach ($tokens as $token) {
            if ($token !== '' && ctype_digit($token)) {
                $ids[] = $token;
            }
        }

        return array_values(array_unique($ids));
    }

    private function clampInt(int $value, int $min, int $max): int {
        return max($min, min($max, $value));
    }

    private function resolveFilterInput(): array {
        $filter_mode = strtolower(trim((string) $this->req('filter_mode', 'key')));
        $filter_mode = $filter_mode === 'name' ? 'name' : 'key';

        $item_filter = trim((string) $this->req('item_filter', ''));
        if ($item_filter !== '') {
            return [$filter_mode, $item_filter];
        }

        $legacy_key = trim((string) $this->req('item_key_search', ''));
        $legacy_name = trim((string) $this->req('item_name_search', ''));
        if ($legacy_key === '' && $legacy_name === '') {
            return [$filter_mode, ''];
        }

        if ($legacy_name !== '' && $legacy_key === '') {
            return ['name', $legacy_name];
        }
        if ($legacy_key !== '' && $legacy_name === '') {
            return ['key', $legacy_key];
        }

        return $filter_mode === 'name'
            ? ['name', $legacy_name]
            : ['key', $legacy_key];
    }

    private function normalizeSearchPattern(string $value): string {
        $value = trim($value);
        if ($value === '') {
            return $value;
        }

        if (str_contains($value, '*') || str_contains($value, '?')) {
            return $value;
        }

        return '*' . $value . '*';
    }

    private function parseDataSets(string $raw, array $fallback): array {
        $raw = trim($raw);
        if ($raw === '') {
            return [$this->normalizeDataSet($fallback)];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return [$this->normalizeDataSet($fallback)];
        }

        $sets = [];
        foreach (array_slice($data, 0, self::MAX_DATASETS) as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $sets[] = $this->normalizeDataSet($entry);
        }

        return $sets !== [] ? $sets : [$this->normalizeDataSet($fallback)];
    }

    private function normalizeDataSet(array $entry): array {
        $lookback_hours = $this->clampInt((int) ($entry['lookback_hours'] ?? self::DEFAULT_LOOKBACK_HOURS), 1, 24 * 31);
        $max_rows = $this->clampInt((int) ($entry['max_rows'] ?? self::DEFAULT_MAX_ROWS), 1, 200);
        $history_points = $this->clampInt((int) ($entry['history_points'] ?? self::DEFAULT_HISTORY_POINTS), 10, 5000);
        $merge_shorter_than = $this->clampInt((int) ($entry['merge_shorter_than'] ?? 0), 0, 3600);
        $state_map_raw = trim((string) ($entry['state_map'] ?? self::DEFAULT_STATE_MAP));
        $state_map_raw = substr($state_map_raw, 0, self::MAX_STATE_MAP_LENGTH);
        if ($state_map_raw === '') {
            $state_map_raw = self::DEFAULT_STATE_MAP;
        }
        $rules = $this->parseValueMappings($state_map_raw);

        return [
            'name' => substr(trim((string) ($entry['name'] ?? '')), 0, 120),
            'filter_type' => $this->normalizeFilterType(
                (string) ($entry['filter_type'] ?? ''),
                trim((string) ($entry['item_key_search'] ?? '')),
                trim((string) ($entry['item_name_search'] ?? ''))
            ),
            'filter_value' => substr(trim((string) (
                $entry['filter_value']
                ?? $entry['item_key_search']
                ?? $entry['item_name_search']
                ?? ''
            )), 0, 255),
            'filter_exact' => ((int) ($entry['filter_exact'] ?? 0)) === 1 ? 1 : 0,
            'lookback_hours' => $lookback_hours,
            'max_rows' => $max_rows,
            'history_points' => $history_points,
            'merge_equal_states' => ((int) ($entry['merge_equal_states'] ?? 1)) === 1 ? 1 : 0,
            'merge_shorter_than' => $merge_shorter_than,
            'null_gap_mode' => ((int) ($entry['null_gap_mode'] ?? 0)) === 1 ? 1 : 0,
            'null_gap_backfill_first' => ((int) ($entry['null_gap_backfill_first'] ?? 0)) === 1 ? 1 : 0,
            'rules' => $rules !== [] ? $rules : $this->parseValueMappings(self::DEFAULT_STATE_MAP)
        ];
    }

    private function normalizeFilterType(string $type, string $legacy_key, string $legacy_name): string {
        $type = strtolower(trim($type));
        if ($type === 'key' || $type === 'name') {
            return $type;
        }
        if ($legacy_key !== '') {
            return 'key';
        }
        if ($legacy_name !== '') {
            return 'name';
        }
        return 'key';
    }

    private function parseValueMappings(string $raw): array {
        $rules = [];
        $normalized = str_replace(',', "\n", $raw);
        $lines = preg_split('/\r?\n/', $normalized) ?: [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '=') === false) {
                continue;
            }
            [$condition, $display] = array_map('trim', explode('=', $line, 2));
            if ($condition === '' || $display === '') {
                continue;
            }

            [$label, $color] = $this->parseMappingDisplay($display);
            $rule = [
                'type' => 'value',
                'label' => $label,
                'color' => $color
            ];

            if (str_starts_with($condition, 'value:')) {
                $rule['type'] = 'value';
                $rule['value'] = trim(substr($condition, 6));
            }
            elseif (str_starts_with($condition, 'range:')) {
                $range = trim(substr($condition, 6));
                [$min, $max] = array_map('trim', explode('..', $range, 2) + [null, null]);
                $rule['type'] = 'range';
                $rule['min'] = ($min === '' || $min === null) ? null : (float) $min;
                $rule['max'] = ($max === '' || $max === null) ? null : (float) $max;
            }
            elseif (str_starts_with($condition, 'regex:')) {
                $rule['type'] = 'regex';
                $rule['pattern'] = substr(trim(substr($condition, 6)), 0, self::MAX_REGEX_PATTERN_LENGTH);
            }
            elseif (str_starts_with($condition, 'special:')) {
                $rule['type'] = 'special';
                $rule['special'] = strtolower(trim(substr($condition, 8)));
            }
            else {
                $rule['type'] = 'value';
                $rule['value'] = $condition;
            }

            $rules[] = $rule;
        }

        return $rules;
    }

    private function parseMappingDisplay(string $display): array {
        $parts = array_map('trim', explode('|', $display, 2));
        $label = $parts[0] !== '' ? $parts[0] : $display;
        $color = null;
        if (isset($parts[1]) && preg_match('/^#[0-9A-Fa-f]{6}$/', $parts[1]) === 1) {
            $color = strtoupper($parts[1]);
        }

        return [$label, $color];
    }

    private function buildSegments(
        array $history,
        int $time_from,
        int $time_to,
        array $rules,
        array $base_colors,
        bool $merge_equal,
        bool $connect_null_gaps,
        int $merge_shorter_than,
        bool $backfill_first
    ): array {
        if ($history === []) {
            return [[
                't_from' => $time_from,
                't_to' => $time_to,
                'state' => 'unknown',
                'raw_value' => '',
                'label' => 'No data',
                'color' => $base_colors['unknown']
            ]];
        }

        $segments = [];
        $cursor = $time_from;
        $last_state = null;
        $sample_interval = $this->estimateSampleInterval($history, $time_from, $time_to);
        $max_expected_gap = max(2, (int) floor($sample_interval * 1.5));

        foreach ($history as $idx => $point) {
            $clock = (int) ($point['clock'] ?? 0);
            if ($clock < $time_from) {
                continue;
            }
            if ($clock > $time_to) {
                break;
            }

            $value = (string) ($point['value'] ?? '');
            $state = $this->normalizeStateValue($value);
            $next_clock = $idx + 1 < count($history)
                ? (int) ($history[$idx + 1]['clock'] ?? $time_to)
                : $time_to;
            $next_clock = max($clock + 1, min($next_clock, $time_to));
            $segment_end = $next_clock;

            if (!$connect_null_gaps && $sample_interval > 0 && ($next_clock - $clock) > $max_expected_gap) {
                $segment_end = min($time_to, $clock + max(1, $sample_interval));
            }

            if ($clock > $cursor) {
                if ($connect_null_gaps && $last_state !== null && !empty($segments)) {
                    $segments[count($segments) - 1]['t_to'] = $clock;
                    $last_state = $segments[count($segments) - 1];
                }
                else {
                    $segments[] = [
                        't_from' => $cursor,
                        't_to' => $clock,
                        'state' => 'unknown',
                        'raw_value' => '',
                        'label' => 'No data',
                        'color' => $base_colors['unknown']
                    ];
                }
            }

            $mapped = $this->mapValue($value, $state, $rules, $base_colors);

            $segment = [
                't_from' => $clock,
                't_to' => $segment_end,
                'state' => $mapped['state'],
                'raw_value' => $value,
                'label' => $mapped['label'],
                'color' => $mapped['color']
            ];

            if ($merge_equal && $last_state !== null && $this->canMerge($last_state, $segment)) {
                $segments[count($segments) - 1]['t_to'] = $segment['t_to'];
                $last_state = $segments[count($segments) - 1];
            }
            else {
                $segments[] = $segment;
                $last_state = $segment;
            }

            $cursor = $segment_end;
        }

        if ($cursor < $time_to) {
            if ($connect_null_gaps && $last_state !== null && !empty($segments)) {
                $segments[count($segments) - 1]['t_to'] = $time_to;
            }
            else {
                $segments[] = [
                    't_from' => $cursor,
                    't_to' => $time_to,
                    'state' => 'unknown',
                    'raw_value' => '',
                    'label' => 'No data',
                    'color' => $base_colors['unknown']
                ];
            }
        }

        $segments = array_values(array_filter($segments, static function(array $segment): bool {
            return ($segment['t_to'] ?? 0) > ($segment['t_from'] ?? 0);
        }));

        if ($merge_shorter_than > 0) {
            $segments = $this->mergeShortSegments($segments, $merge_shorter_than);
        }
        if ($backfill_first) {
            $segments = $this->applyLeadingBackfill($segments);
        }

        return $segments;
    }

    private function applyLeadingBackfill(array $segments): array {
        if (count($segments) < 2) {
            return $segments;
        }

        $first = $segments[0];
        $next = $segments[1];
        $is_leading_unknown = (string) ($first['state'] ?? '') === 'unknown';
        $is_next_known = (string) ($next['state'] ?? '') !== 'unknown';
        $is_contiguous = (int) ($first['t_to'] ?? 0) === (int) ($next['t_from'] ?? 0);

        if ($is_leading_unknown && $is_next_known && $is_contiguous) {
            $segments[1]['t_from'] = $segments[0]['t_from'];
            array_shift($segments);
        }

        return $segments;
    }

    private function mergeShortSegments(array $segments, int $threshold_seconds): array {
        if (count($segments) < 3 || $threshold_seconds <= 0) {
            return $segments;
        }

        $changed = true;
        while ($changed) {
            $changed = false;
            $len = count($segments);
            if ($len < 3) {
                break;
            }

            for ($i = 1; $i < $len - 1; $i++) {
                $curr = $segments[$i];
                $duration = (int) ($curr['t_to'] ?? 0) - (int) ($curr['t_from'] ?? 0);
                if ($duration <= 0 || $duration >= $threshold_seconds) {
                    continue;
                }

                $prev = $segments[$i - 1];
                $next = $segments[$i + 1];

                $same_neighbors = (string) ($prev['state'] ?? '') === (string) ($next['state'] ?? '')
                    && (string) ($prev['color'] ?? '') === (string) ($next['color'] ?? '');
                $contiguous = (int) ($prev['t_to'] ?? 0) === (int) ($curr['t_from'] ?? 0)
                    && (int) ($curr['t_to'] ?? 0) === (int) ($next['t_from'] ?? 0);

                if (!$same_neighbors || !$contiguous) {
                    continue;
                }

                $segments[$i - 1]['t_to'] = $next['t_to'];
                array_splice($segments, $i, 2);
                $changed = true;
                break;
            }
        }

        return $segments;
    }

    private function estimateSampleInterval(array $history, int $time_from, int $time_to): int {
        $clocks = [];
        foreach ($history as $point) {
            $clock = (int) ($point['clock'] ?? 0);
            if ($clock >= $time_from && $clock <= $time_to) {
                $clocks[] = $clock;
            }
        }

        if (count($clocks) < 2) {
            return 0;
        }

        sort($clocks);
        $deltas = [];
        for ($i = 1; $i < count($clocks); $i++) {
            $delta = $clocks[$i] - $clocks[$i - 1];
            if ($delta > 0) {
                $deltas[] = $delta;
            }
        }

        if ($deltas === []) {
            return 0;
        }

        sort($deltas);
        $mid = (int) floor(count($deltas) / 2);
        return $deltas[$mid];
    }

    private function normalizeStateValue(string $value): string {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return 'unknown';
        }

        if (is_numeric($trimmed)) {
            $number = (float) $trimmed;
            if (abs($number - round($number)) < 0.00001) {
                return (string) ((int) round($number));
            }
        }

        return $trimmed;
    }

    private function canMerge(array $a, array $b): bool {
        return (string) ($a['state'] ?? '') === (string) ($b['state'] ?? '')
            && (string) ($a['color'] ?? '') === (string) ($b['color'] ?? '')
            && (int) ($a['t_to'] ?? 0) === (int) ($b['t_from'] ?? 0);
    }

    private function mapValue(string $raw_value, string $state, array $rules, array $base_colors): array {
        $trimmed = trim($raw_value);
        $lower = strtolower($trimmed);

        foreach ($rules as $rule) {
            $type = (string) ($rule['type'] ?? 'value');
            $matched = false;

            if ($type === 'value') {
                $v = (string) ($rule['value'] ?? '');
                $matched = ($state === $v || $trimmed === $v);
            }
            elseif ($type === 'range') {
                if (is_numeric($state)) {
                    $num = (float) $state;
                    $min = $rule['min'] ?? null;
                    $max = $rule['max'] ?? null;
                    $ok_min = ($min === null) || $num >= (float) $min;
                    $ok_max = ($max === null) || $num <= (float) $max;
                    $matched = $ok_min && $ok_max;
                }
            }
            elseif ($type === 'regex') {
                $pattern = (string) ($rule['pattern'] ?? '');
                if ($pattern !== '') {
                    $regex = $this->compileSafeRegex($pattern);
                    if ($regex !== null) {
                        $matched = preg_match($regex, $trimmed) === 1 || preg_match($regex, $state) === 1;
                    }
                }
            }
            elseif ($type === 'special') {
                $special = (string) ($rule['special'] ?? '');
                $matched = match ($special) {
                    'null' => $lower === 'null',
                    'nan' => $lower === 'nan',
                    'true' => $lower === 'true',
                    'false' => $lower === 'false',
                    'empty' => $trimmed === '',
                    'unknown' => $state === 'unknown',
                    default => false
                };
            }

            if ($matched) {
                return [
                    'state' => $state,
                    'label' => (string) ($rule['label'] ?? $state),
                    'color' => (string) (($rule['color'] ?? '') !== '' ? $rule['color'] : $this->resolveStateColor($state, $base_colors))
                ];
            }
        }

        return [
            'state' => $state,
            'label' => $state,
            'color' => $this->resolveStateColor($state, $base_colors)
        ];
    }

    private function compileSafeRegex(string $pattern): ?string {
        $pattern = trim($pattern);
        if ($pattern === '' || strlen($pattern) > self::MAX_REGEX_PATTERN_LENGTH) {
            return null;
        }

        if (preg_match('/[[:cntrl:]]/', $pattern) === 1) {
            return null;
        }

        $body = $pattern;
        $flags = 'iu';

        if ($pattern[0] === '/' && strlen($pattern) > 2) {
            $last_slash = strrpos($pattern, '/');
            if ($last_slash !== false && $last_slash > 0) {
                $body = substr($pattern, 1, $last_slash - 1);
                $raw_flags = substr($pattern, $last_slash + 1);
                $flags = preg_replace('/[^imu]/', '', $raw_flags) ?: 'iu';
            }
        }

        if (preg_match('/\\\\[1-9]|\\(\\?R|\\(\\?0|\\(\\?&|\\(\\?<=|\\(\\?<!/', $body) === 1) {
            return null;
        }

        if (preg_match('/\\{\\d{4,}(?:,\\d{0,4})?\\}|\\{\\d{1,4},\\d{4,}\\}/', $body) === 1) {
            return null;
        }

        $regex = '/'.str_replace('/', '\\/', $body).'/'.$flags;
        set_error_handler(static function(): bool {
            return true;
        }, E_WARNING);
        $is_valid = preg_match($regex, '') !== false;
        restore_error_handler();
        if (!$is_valid) {
            return null;
        }

        return $regex;
    }

    private function resolveStateColor(string $state, array $base_colors): string {
        if ($state === '0') {
            return $base_colors['0'];
        }
        if ($state === '1') {
            return $base_colors['1'];
        }
        if ($state === 'unknown') {
            return $base_colors['unknown'];
        }

        $hash = hexdec(substr(md5($state), 0, 2));
        $h = (int) round(($hash / 255) * 360);
        return sprintf('hsl(%d 55%% 47%%)', $h);
    }

    private function buildBaseColorMap(): array {
        return [
            '0' => '#C62828',
            '1' => '#2E7D32',
            'unknown' => '#607D8B'
        ];
    }
}
