<?php

namespace Modules\ReactDashboard\Actions\Api;

use API;

final class HostApiHandler {
    public function handle(string $action, array $request): ?array {
        if ($action === 'get_groups') {
            $groups = API::HostGroup()->get([
                'output' => ['groupid', 'name'],
                'real_hosts' => true,
                'monitored_hosts' => true,
                'sortfield' => 'name'
            ]) ?: [];

            return array_values($groups);
        }

        if ($action === 'get_hosts_by_group') {
            $groupid = (string) ApiRequest::scalar($request, 'groupid', '');
            $groupid = ctype_digit($groupid) ? $groupid : null;
            $hosts = API::Host()->get([
                'output' => ['hostid', 'name', 'available'],
                'groupids' => $groupid,
                'monitored_hosts' => true,
                'sortfield' => 'name'
            ]) ?: [];

            return array_values($hosts);
        }

        return null;
    }
}
