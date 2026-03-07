<?php

namespace Modules\ReactDashboard\Actions\Api;

final class ApiRequest {
    public static function scalar(array $request, string $name, $default = null) {
        if (!array_key_exists($name, $request)) {
            return $default;
        }

        $value = $request[$name];
        return is_scalar($value) ? $value : $default;
    }

    public static function parseIds(string $raw): array {
        $tokens = preg_split('/[\s,]+/', trim($raw)) ?: [];
        $ids = [];

        foreach ($tokens as $token) {
            if ($token !== '' && ctype_digit($token)) {
                $ids[] = $token;
            }
        }

        return array_values(array_unique($ids));
    }

    public static function clampInt(int $value, int $min, int $max): int {
        return max($min, min($max, $value));
    }
}
