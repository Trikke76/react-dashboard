<?php
namespace Modules\ReactDashboard\Actions;

use CControllerResponseData;
use CController;
use API;
use CWebUser;
use CProfile;

class ReactDashboard extends CController {

    // Initialisatie: we zetten CSRF uit om AJAX-calls makkelijker te maken
    protected function init(): void {
        $this->disableCsrfValidation();
    }

    // Input controle: we accepteren alle input voor nu
    protected function checkInput(): bool {
        return true;
    }

    // Permissies: Alleen ingelogde Zabbix gebruikers mogen dit zien
    protected function checkPermissions(): bool {
        return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
    }

    protected function doAction(): void {
        // 1. Bepaal het pad op basis van de locatie van DIT bestand
        // __DIR__ is de 'actions' map, dirname() gaat één niveau omhoog naar de module root
        $module_path = dirname(__DIR__); 

        // 2. Haal de layout op uit de macro
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

        // 3. Laatst gekozen host ophalen uit de Zabbix profiel settings
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

        // 4. Stuur alle verzamelde data naar de view
        $this->setResponse(new CControllerResponseData([
            'title' => 'React Dashboard', // Engels
            'module_path' => $module_path,
            'saved_host' => $selected_host,
            'current_layout' => $current_layout,
            'user_theme' => getUserTheme(CWebUser::$data), 
            'user_data' => [
                'alias' => CWebUser::$data['username'] ?? 'Zabbix User'
            ]
        ]));
    }
}
