<?php
// Minimale Zabbix-omgeving laden
define('ZABBIX_PATH', dirname(__FILE__, 4));
require_once ZABBIX_PATH . '/include/config.inc.php';

// Check of de gebruiker is ingelogd
if (CWebUser::$data['alias'] === '') {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Niet ingelogd']);
    exit;
}

$action = $_GET['action_type'] ?? '';

// Groepen ophalen
if ($action === 'get_groups') {
    $groups = API::HostGroup()->get([
        'output' => ['groupid', 'name'],
        'real_hosts' => true,
        'monitored_hosts' => true,
        'sortfield' => 'name'
    ]);
    header('Content-Type: application/json');
    echo json_encode(array_values($groups));
    exit;
}

// Hosts per groep ophalen
if ($action === 'get_hosts_by_group') {
    $hosts = API::Host()->get([
        'output' => ['hostid', 'name', 'available'],
        'groupids' => $_GET['groupid'],
        'monitored_hosts' => true,
        'sortfield' => 'name'
    ]);
    header('Content-Type: application/json');
    echo json_encode(array_values($hosts));
    exit;
}

// Opslaan
if ($action === 'save') {
    $hostid = $_GET['hostid'];
    CProfile::update('web.react_dashboard.hostid', $hostid, PROFILE_TYPE_ID);
    echo json_encode(['status' => 'ok']);
    exit;
}
