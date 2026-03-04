<?php

define('ZABBIX_PATH', dirname(__FILE__, 4));
require_once ZABBIX_PATH . '/include/config.inc.php';

header('Content-Type: application/json');

if (CWebUser::$data['alias'] === '') {
    echo json_encode(['error' => 'Niet ingelogd']);
    exit;
}

$action = $_GET['action_type'] ?? '';

if ($action === 'get_groups') {
    $groups = API::HostGroup()->get([
        'output' => ['groupid', 'name'],
        'real_hosts' => true,
        'monitored_hosts' => true,
        'sortfield' => 'name'
    ]);

    echo json_encode(array_values($groups));
    exit;
}

if ($action === 'get_hosts_by_group') {
    $hosts = API::Host()->get([
        'output' => ['hostid', 'name', 'available'],
        'groupids' => $_GET['groupid'] ?? [],
        'monitored_hosts' => true,
        'sortfield' => 'name'
    ]);

    echo json_encode(array_values($hosts));
    exit;
}

if ($action === 'save') {
    $hostid = $_GET['hostid'] ?? 0;
    CProfile::update('web.react_dashboard.hostid', $hostid, PROFILE_TYPE_ID);
    echo json_encode(['status' => 'ok']);
    exit;
}

if ($action === 'timestate_items') {
    $hostids = parse_hostids_csv((string) ($_GET['hostids_csv'] ?? ''));
    $item_key_search = trim((string) ($_GET['item_key_search'] ?? ''));
    $item_name_search = trim((string) ($_GET['item_name_search'] ?? ''));
    $max_rows = clamp_int((int) ($_GET['max_rows'] ?? 20), 1, 200);
    $filter_exact = ((int) ($_GET['filter_exact'] ?? 0)) === 1;

    if ($hostids === []) {
        echo json_encode(['items' => []]);
        exit;
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
        $search['key_'] = normalize_search_pattern($item_key_search);
    }
    if ($item_name_search !== '') {
        $search['name'] = normalize_search_pattern($item_name_search);
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

    echo json_encode(['items' => $result]);
    exit;
}

if ($action === 'timestate_data') {
    $hostids = parse_hostids_csv((string) ($_GET['hostids_csv'] ?? ''));
    $itemids = parse_itemids_csv((string) ($_GET['itemids_csv'] ?? ''));
    if ($hostids === [] && $itemids === []) {
        echo json_encode(['error' => 'Selecteer minstens een host of item.']);
        exit;
    }

    $item_key_search = trim((string) ($_GET['item_key_search'] ?? ''));
    $item_name_search = trim((string) ($_GET['item_name_search'] ?? ''));
    $lookback_hours = clamp_int((int) ($_GET['lookback_hours'] ?? 24), 1, 24 * 31);
    $max_rows = clamp_int((int) ($_GET['max_rows'] ?? 20), 1, 200);
    $history_points = clamp_int((int) ($_GET['history_points'] ?? 500), 50, 5000);
    $row_sort = clamp_int((int) ($_GET['row_sort'] ?? 0), 0, 2);
    $merge_equal_states = ((int) ($_GET['merge_equal_states'] ?? 1)) === 1;
    $state_map_raw = (string) ($_GET['state_map'] ?? '');

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
        $search['key_'] = normalize_search_pattern($item_key_search);
    }
    if ($item_name_search !== '') {
        $search['name'] = normalize_search_pattern($item_name_search);
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

    $value_map = parse_state_map($state_map_raw);
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

        $segments = build_segments($history, $time_from, $time_to, $value_map, $fallback_colors, $merge_equal_states);
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

    echo json_encode([
        'rows' => $rows,
        'time_from' => $time_from,
        'time_to' => $time_to,
        'error' => null
    ]);
    exit;
}

echo json_encode(['error' => 'Onbekende action_type']);

function parse_hostids_csv(string $raw): array {
    $tokens = preg_split('/[\s,]+/', trim($raw)) ?: [];
    $ids = [];

    foreach ($tokens as $token) {
        if ($token !== '' && ctype_digit($token)) {
            $ids[] = $token;
        }
    }

    return array_values(array_unique($ids));
}

function parse_itemids_csv(string $raw): array {
    return parse_hostids_csv($raw);
}

function clamp_int(int $value, int $min, int $max): int {
    return max($min, min($max, $value));
}

function normalize_search_pattern(string $value): string {
    $value = trim($value);
    if ($value === '') {
        return $value;
    }

    if (str_contains($value, '*') || str_contains($value, '?')) {
        return $value;
    }

    return '*' . $value . '*';
}

function parse_state_map(string $raw): array {
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

function resolve_state_info(string $value, array $state_map, array $fallback_colors): array {
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

function build_segments(array $history, int $time_from, int $time_to, array $state_map, array $fallback_colors, bool $merge_equal): array {
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
        $resolved = resolve_state_info($raw_value, $state_map, $fallback_colors);

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
