<?php
namespace Modules\ReactDashboard\Actions;

use CControllerResponseData;
use CController;
use API;
use CWebUser;
use CProfile;

class ReactDashboard extends CController {

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
        $action = (string) $this->getInput('action_type', '');
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
            $hosts = API::Host()->get([
                'output' => ['hostid', 'name', 'available'],
                'groupids' => $this->getInput('groupid', null),
                'monitored_hosts' => true,
                'sortfield' => 'name'
            ]) ?: [];

            $this->respondJson(array_values($hosts));
        }

        if ($action === 'save') {
            $hostid = $this->getInput('hostid', 0);
            CProfile::update('web.react_dashboard.hostid', $hostid, PROFILE_TYPE_ID);
            $this->respondJson(['status' => 'ok']);
        }

        if ($action === 'timestate_items') {
            $hostids = $this->parseIds((string) $this->getInput('hostids_csv', ''));
            $item_key_search = trim((string) $this->getInput('item_key_search', ''));
            $item_name_search = trim((string) $this->getInput('item_name_search', ''));
            $max_rows = $this->clampInt((int) $this->getInput('max_rows', 20), 1, 200);
            $filter_exact = ((int) $this->getInput('filter_exact', 0)) === 1;

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

            $search = [];
            if ($item_key_search !== '') {
                $search['key_'] = $this->normalizeSearchPattern($item_key_search);
            }
            if ($item_name_search !== '') {
                $search['name'] = $this->normalizeSearchPattern($item_name_search);
            }
            if ($search !== []) {
                $params['search'] = $search;
                $params['searchByAny'] = true;
                $params['searchWildcardsEnabled'] = true;
            }

            $items = API::Item()->get($params) ?: [];
            if ($filter_exact) {
                $items = array_values(array_filter($items, static function(array $item) use ($item_key_search, $item_name_search): bool {
                    if ($item_key_search !== '') {
                        return strcasecmp((string) ($item['key_'] ?? ''), $item_key_search) === 0;
                    }
                    if ($item_name_search !== '') {
                        return strcasecmp((string) ($item['name'] ?? ''), $item_name_search) === 0;
                    }
                    return true;
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
            $hostids = $this->parseIds((string) $this->getInput('hostids_csv', ''));
            $itemids = $this->parseIds((string) $this->getInput('itemids_csv', ''));
            if ($hostids === [] && $itemids === []) {
                $this->respondJson(['error' => 'Selecteer minstens een host of item.']);
            }

            $item_key_search = trim((string) $this->getInput('item_key_search', ''));
            $item_name_search = trim((string) $this->getInput('item_name_search', ''));
            $lookback_hours = $this->clampInt((int) $this->getInput('lookback_hours', 24), 1, 24 * 31);
            $max_rows = $this->clampInt((int) $this->getInput('max_rows', 20), 1, 200);
            $history_points = $this->clampInt((int) $this->getInput('history_points', 500), 50, 5000);
            $row_sort = $this->clampInt((int) $this->getInput('row_sort', 0), 0, 2);
            $merge_equal_states = ((int) $this->getInput('merge_equal_states', 1)) === 1;
            $state_map_raw = (string) $this->getInput('state_map', '');

            $time_to = time();
            $time_from = $time_to - ($lookback_hours * 3600);

            $params = [
                'output' => ['itemid', 'name', 'key_', 'value_type'],
                'selectHosts' => ['name'],
                'monitored' => true,
                'limit' => $max_rows * 8
            ];

            if ($hostids !== []) {
                $params['hostids'] = $hostids;
            }
            if ($itemids !== []) {
                $params['itemids'] = $itemids;
            }

            $search = [];
            if ($item_key_search !== '') {
                $search['key_'] = $this->normalizeSearchPattern($item_key_search);
            }
            if ($item_name_search !== '') {
                $search['name'] = $this->normalizeSearchPattern($item_name_search);
            }
            if ($itemids === [] && $search !== []) {
                $params['search'] = $search;
                $params['searchByAny'] = true;
                $params['searchWildcardsEnabled'] = true;
            }

            $items = API::Item()->get($params) ?: [];
            usort($items, static function(array $a, array $b): int {
                $host_a = isset($a['hosts'][0]['name']) ? (string) $a['hosts'][0]['name'] : '';
                $host_b = isset($b['hosts'][0]['name']) ? (string) $b['hosts'][0]['name'] : '';
                $cmp = strcasecmp($host_a, $host_b);
                if ($cmp !== 0) {
                    return $cmp;
                }
                return strcasecmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
            });

            $value_map = $this->parseStateMap($state_map_raw);
            $fallback_colors = ['#2E7D32', '#C62828', '#EF6C00', '#1565C0', '#6A1B9A', '#00838F', '#5D4037', '#455A64'];
            $rows = [];
            $row_count = 0;

            foreach ($items as $item) {
                if ($row_count >= $max_rows) {
                    break;
                }

                $itemid = (string) ($item['itemid'] ?? '');
                if ($itemid === '') {
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
                    'time_from' => $time_from,
                    'time_till' => $time_to,
                    'sortfield' => 'clock',
                    'sortorder' => 'ASC',
                    'limit' => $history_points
                ]) ?: [];

                $segments = $this->buildSegments($history, $time_from, $time_to, $value_map, $fallback_colors, $merge_equal_states);
                if ($segments === []) {
                    continue;
                }

                $host_name = isset($item['hosts'][0]['name']) ? (string) $item['hosts'][0]['name'] : 'Host';
                $rows[] = [
                    'row_label' => sprintf('%s :: %s', $host_name, (string) ($item['name'] ?? 'Item')),
                    'host_name' => $host_name,
                    'itemid' => $itemid,
                    'key_' => (string) ($item['key_'] ?? ''),
                    'segments' => $segments
                ];
                $row_count++;
            }

            if ($row_sort === 1) {
                usort($rows, static function(array $a, array $b): int {
                    $la = (string) (($a['segments'][count($a['segments']) - 1]['state'] ?? ''));
                    $lb = (string) (($b['segments'][count($b['segments']) - 1]['state'] ?? ''));
                    $pa = $la === '1' ? 0 : 1;
                    $pb = $lb === '1' ? 0 : 1;
                    if ($pa !== $pb) {
                        return $pa <=> $pb;
                    }
                    return strcasecmp((string) ($a['row_label'] ?? ''), (string) ($b['row_label'] ?? ''));
                });
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

            $this->respondJson([
                'rows' => $rows,
                'time_from' => $time_from,
                'time_to' => $time_to,
                'error' => null
            ]);
        }

        $this->respondJson(['error' => 'Onbekende action_type']);
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

    private function parseStateMap(string $raw): array {
        $result = [];
        $chunks = array_filter(array_map('trim', explode(',', $raw)));

        foreach ($chunks as $chunk) {
            if (!str_starts_with($chunk, 'value:')) {
                continue;
            }

            $parts = explode('=', $chunk, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $value_key = trim(substr($parts[0], strlen('value:')));
            if ($value_key === '') {
                continue;
            }

            [$label, $color] = array_pad(explode('|', $parts[1], 2), 2, '');
            $result[(string) $value_key] = [
                'label' => trim((string) $label) !== '' ? trim((string) $label) : (string) $value_key,
                'color' => trim((string) $color)
            ];
        }

        return $result;
    }

    private function resolveStateInfo(string $value, array $state_map, array $fallback_colors): array {
        if (isset($state_map[$value])) {
            $map = $state_map[$value];
            return [
                'state' => $value,
                'label' => (string) ($map['label'] ?? $value),
                'color' => (string) ($map['color'] ?? '') !== '' ? (string) $map['color'] : '#607D8B'
            ];
        }

        $hash = abs(crc32($value));
        $color = $fallback_colors[$hash % count($fallback_colors)];

        return [
            'state' => $value,
            'label' => is_numeric($value) ? 'Value' : $value,
            'color' => $color
        ];
    }

    private function buildSegments(array $history, int $time_from, int $time_to, array $state_map, array $fallback_colors, bool $merge_equal): array {
        if ($history === []) {
            return [];
        }

        $segments = [];
        $count = count($history);

        for ($i = 0; $i < $count; $i++) {
            $entry = $history[$i];
            $from = max($time_from, (int) ($entry['clock'] ?? 0));

            if ($i < $count - 1) {
                $to = min($time_to, (int) ($history[$i + 1]['clock'] ?? $time_to));
            }
            else {
                $to = $time_to;
            }

            if ($to <= $from) {
                continue;
            }

            $raw_value = isset($entry['value']) ? (string) $entry['value'] : '';
            $resolved = $this->resolveStateInfo($raw_value, $state_map, $fallback_colors);

            $next = [
                't_from' => $from,
                't_to' => $to,
                'state' => $resolved['state'],
                'label' => $resolved['label'],
                'color' => $resolved['color'],
                'raw_value' => $raw_value
            ];

            if ($merge_equal && $segments !== []) {
                $last_index = count($segments) - 1;
                $last = $segments[$last_index];
                if ($last['state'] === $next['state'] && $last['color'] === $next['color']) {
                    $segments[$last_index]['t_to'] = $next['t_to'];
                    continue;
                }
            }

            $segments[] = $next;
        }

        return $segments;
    }
}
