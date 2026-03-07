<?php

namespace Modules\ReactDashboard\Actions\Api;

final class ApiFilter {
    public static function resolveFilterInput(array $request): array {
        $filter_mode = strtolower(trim((string) ApiRequest::scalar($request, 'filter_mode', 'key')));
        $filter_mode = $filter_mode === 'name' ? 'name' : 'key';

        $item_filter = trim((string) ApiRequest::scalar($request, 'item_filter', ''));
        if ($item_filter !== '') {
            return [$filter_mode, $item_filter];
        }

        $legacy_key = trim((string) ApiRequest::scalar($request, 'item_key_search', ''));
        $legacy_name = trim((string) ApiRequest::scalar($request, 'item_name_search', ''));
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

    public static function normalizeSearchPattern(string $value): string {
        return trim($value);
    }

    public static function applyItemFilter(array $items, string $field, string $filter, bool $filter_exact): array {
        $filter = trim($filter);
        if ($filter === '') {
            return $items;
        }

        return array_values(array_filter($items, static function(array $item) use ($field, $filter, $filter_exact): bool {
            $candidate = (string) ($item[$field] ?? '');
            return self::matchesItemFilter($candidate, $filter, $filter_exact);
        }));
    }

    public static function compileSafeRegex(string $pattern, int $max_length): ?string {
        $pattern = trim($pattern);
        if ($pattern === '' || strlen($pattern) > $max_length) {
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

    private static function matchesItemFilter(string $candidate, string $filter, bool $filter_exact): bool {
        if ($filter_exact) {
            return strcasecmp($candidate, $filter) === 0;
        }

        if (!self::hasWildcard($filter)) {
            return strcasecmp($candidate, $filter) === 0;
        }

        $regex = self::compileWildcardRegex($filter);
        return $regex !== null && preg_match($regex, $candidate) === 1;
    }

    private static function hasWildcard(string $value): bool {
        return str_contains($value, '*') || str_contains($value, '?');
    }

    private static function compileWildcardRegex(string $pattern): ?string {
        if ($pattern === '') {
            return null;
        }

        $quoted = preg_quote($pattern, '/');
        $quoted = str_replace(['\\*', '\\?'], ['.*', '.'], $quoted);
        $regex = '/^'.$quoted.'$/iu';

        set_error_handler(static function(): bool {
            return true;
        }, E_WARNING);
        $is_valid = preg_match($regex, '') !== false;
        restore_error_handler();

        return $is_valid ? $regex : null;
    }
}
