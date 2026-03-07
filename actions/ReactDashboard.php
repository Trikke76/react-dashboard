<?php
namespace Modules\ReactDashboard\Actions;

use API;
use CController;
use CControllerResponseData;
use CProfile;
use CWebUser;
use Modules\ReactDashboard\Actions\Api\HostApiHandler;
use Modules\ReactDashboard\Actions\Api\TimeSeriesApiHandler;
use Modules\ReactDashboard\Actions\Api\TimeStateApiHandler;

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
        $request = $_REQUEST;
        $handlers = [
            new HostApiHandler(),
            new TimeStateApiHandler(),
            new TimeSeriesApiHandler()
        ];

        foreach ($handlers as $handler) {
            $payload = $handler->handle($action, $request);
            if ($payload !== null) {
                $this->respondJson($payload);
            }
        }

        $this->respondJson(['error' => 'Onbekende action_type']);
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
        $json = json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        if ($json === false) {
            http_response_code(500);
            echo '{"error":"JSON encoding failed"}';
            exit;
        }
        echo $json;
        exit;
    }
}
