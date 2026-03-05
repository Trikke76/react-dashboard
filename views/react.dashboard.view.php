<?php
/** @var CView $this */
$page = (new CHtmlPage())->setTitle($data['title']);
$page->addItem((new CDiv(''))->setId('react-root'));
$page->show();
?>

<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://unpkg.com/lodash@4.17.21/lodash.min.js"></script>
<script src="https://unpkg.com/react-grid-layout@1.3.4/dist/react-grid-layout.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/react-grid-layout@1.3.4/css/styles.css">

<style>
    :root {
        <?php $is_dark = (isset($data['user_theme']) && strpos($data['user_theme'], 'dark') !== false); ?>
        --bg-color: <?php echo $is_dark ? '#2b2b2b' : '#ebedef'; ?>;
        --card-bg: <?php echo $is_dark ? '#383838' : '#ffffff'; ?>;
        --text-color: <?php echo $is_dark ? '#f2f2f2' : '#333333'; ?>;
        --header-bg: <?php echo $is_dark ? '#4f4f4f' : '#3c5559'; ?>;
        --border-color: <?php echo $is_dark ? '#555555' : '#dfe3e8'; ?>;
        --subtle-text: <?php echo $is_dark ? '#b8c1ca' : '#6b7783'; ?>;
        --panel-bg: <?php echo $is_dark ? '#30353b' : '#f5f7f9'; ?>;
        --input-bg: <?php echo $is_dark ? '#252a30' : '#ffffff'; ?>;
        --segment-bg: <?php echo $is_dark ? '#252a30' : '#edf1f4'; ?>;
        --segment-active: <?php echo $is_dark ? '#56616f' : '#d2dde8'; ?>;
    }

    body {
        background: var(--bg-color);
        color: var(--text-color);
        margin: 0;
        padding: 0;
    }

    .widget-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .widget-header {
        padding: 8px 12px;
        background: var(--header-bg);
        color: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
        gap: 8px;
    }

    .widget-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .widget-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .btn-zbx {
        background: rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.28);
        color: #fff;
        border-radius: 2px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        height: 26px;
        padding: 0 10px;
        cursor: pointer;
    }

    .btn-zbx:hover { background: rgba(0, 0, 0, 0.4); }

    .btn-danger {
        width: 26px;
        padding: 0;
        background: #a63f3f;
        border-color: #bd5a5a;
    }

    .btn-danger:hover { background: #c34d4d; }

    .widget-body {
        flex: 1;
        padding: 14px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 0;
        overflow: hidden;
    }

    .widget-floating-actions {
        position: absolute;
        right: 8px;
        top: 8px;
        z-index: 20;
        display: inline-flex;
        gap: 6px;
    }

    .clock-view {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-align: center;
    }

    .clock-time {
        font-size: var(--clock-time-size, 44px);
        font-weight: var(--clock-time-weight, 700);
        line-height: 1.02;
        color: var(--clock-time-color, var(--text-color));
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .clock-date {
        font-size: var(--clock-date-size, 13px);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--subtle-text);
    }

    .clock-timezone {
        font-size: var(--clock-date-size, 12px);
        color: var(--subtle-text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .clock-face {
        width: var(--clock-size, 180px);
        height: var(--clock-size, 180px);
        position: relative;
        border-radius: 50%;
        border: max(2px, calc(var(--clock-size) * 0.035)) solid <?php echo $is_dark ? '#111' : '#2a2a2a'; ?>;
        background: <?php echo $is_dark ? '#f3f3f3' : '#fff'; ?>;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
        flex: 0 0 auto;
    }

    .clock-tick {
        position: absolute;
        left: 50%;
        top: 50%;
        width: max(1px, calc(var(--clock-size) * 0.010));
        height: calc(var(--clock-size) * 0.06);
        background: #2e2e2e;
    }

    .clock-tick.major {
        height: calc(var(--clock-size) * 0.09);
        width: max(2px, calc(var(--clock-size) * 0.015));
        background: #111;
    }

    .clock-number {
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(var(--clock-size) * 0.17);
        height: calc(var(--clock-size) * 0.17);
        margin-left: calc(var(--clock-size) * -0.085);
        margin-top: calc(var(--clock-size) * -0.085);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #111;
        font-weight: 700;
        font-size: calc(var(--clock-size) * 0.1);
        user-select: none;
    }

    .clock-hand {
        position: absolute;
        left: 50%;
        bottom: 50%;
        transform-origin: 50% 100%;
        border-radius: 999px;
    }

    .clock-hand.hour {
        width: max(3px, calc(var(--clock-size) * 0.03));
        height: calc(var(--clock-size) * 0.24);
        background: #111;
    }

    .clock-hand.min {
        width: max(2px, calc(var(--clock-size) * 0.02));
        height: calc(var(--clock-size) * 0.34);
        background: #111;
    }

    .clock-hand.sec {
        width: max(1px, calc(var(--clock-size) * 0.012));
        height: calc(var(--clock-size) * 0.4);
        background: #b91515;
    }

    .clock-center {
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(var(--clock-size) * 0.06);
        height: calc(var(--clock-size) * 0.06);
        margin-left: calc(var(--clock-size) * -0.03);
        margin-top: calc(var(--clock-size) * -0.03);
        background: #111;
        border-radius: 50%;
    }

    .clock-editor {
        width: 100%;
        max-width: 620px;
        border: 1px solid var(--border-color);
        background: var(--panel-bg);
        border-radius: 4px;
        padding: 12px;
        overflow: auto;
        max-height: 100%;
    }

    .editor-title {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 10px;
    }

    .editor-grid {
        display: grid;
        grid-template-columns: 180px 1fr;
        row-gap: 10px;
        column-gap: 10px;
        align-items: center;
    }

    .editor-label {
        font-size: 12px;
        color: var(--subtle-text);
        font-weight: 700;
    }

    .editor-control input[type="text"],
    .editor-control select,
    .editor-control input[type="number"] {
        width: 100%;
        box-sizing: border-box;
        height: 30px;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        color: var(--text-color);
        border-radius: 2px;
        padding: 0 8px;
        font-size: 12px;
    }

    .editor-control .editor-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        color: var(--text-color);
        border-radius: 2px;
        padding: 6px 8px;
        resize: vertical;
        min-height: 62px;
        font-size: 12px;
    }

    .editor-host-list,
    .editor-item-list {
        max-height: 150px;
        overflow: auto;
        border: 1px solid var(--border-color);
        border-radius: 2px;
        background: var(--input-bg);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .editor-host-item,
    .editor-item-entry {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        min-height: 20px;
    }

    .editor-item-entry span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .editor-inline-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .editor-subtle {
        color: var(--subtle-text);
        font-size: 11px;
    }

    .editor-mapping-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .editor-mapping-row {
        display: grid;
        grid-template-columns: 92px 1fr 1fr 48px 30px;
        gap: 6px;
        align-items: center;
    }

    .editor-mapping-row input[type="color"] {
        width: 100%;
        height: 30px;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        padding: 2px;
        border-radius: 2px;
    }

    .editor-segment {
        display: inline-flex;
        border: 1px solid var(--border-color);
        background: var(--segment-bg);
        border-radius: 2px;
        padding: 2px;
        gap: 2px;
    }

    .editor-segment button {
        border: 0;
        background: transparent;
        color: var(--text-color);
        height: 24px;
        padding: 0 10px;
        font-size: 12px;
        font-weight: 700;
        border-radius: 2px;
        cursor: pointer;
    }

    .editor-segment button.active {
        background: var(--segment-active);
    }

    .editor-checks {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }

    .editor-checks label {
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .editor-advanced {
        margin-top: 12px;
        border-top: 1px solid var(--border-color);
        padding-top: 10px;
    }

    .editor-advanced-title {
        font-size: 12px;
        font-weight: 700;
        text-decoration: underline;
        margin-bottom: 8px;
    }

    .editor-footer {
        margin-top: 12px;
        display: flex;
        justify-content: flex-end;
    }

    .editor-footer .btn-zbx {
        height: 30px;
        background: <?php echo $is_dark ? '#546577' : '#6b8ba2'; ?>;
        border-color: <?php echo $is_dark ? '#687f96' : '#8ea6b8'; ?>;
    }

    .widget-body--timestate {
        justify-content: stretch;
        align-items: stretch;
    }

    .timestate-root {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
    }

    .timestate-table {
        flex: 1;
        min-height: 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-right: 4px;
    }

    .timestate-row {
        display: grid;
        grid-template-columns: minmax(160px, 260px) 1fr;
        gap: 8px;
        align-items: center;
        min-height: 24px;
    }

    .timestate-label {
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--subtle-text);
    }

    .timestate-lane {
        position: relative;
        height: 22px;
        border: 1px solid var(--border-color);
        border-radius: 2px;
        background: <?php echo $is_dark ? '#2a2f35' : '#f3f6f8'; ?>;
        overflow: hidden;
    }

    .timestate-segment {
        position: absolute;
        top: 0;
        bottom: 0;
        border-right: 1px solid rgba(0, 0, 0, 0.2);
    }

    .timestate-axis {
        display: flex;
        justify-content: space-between;
        color: var(--subtle-text);
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .timestate-empty,
    .timestate-error {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--subtle-text);
        font-size: 12px;
        text-align: center;
        padding: 12px;
    }

    .timestate-error {
        color: #d27878;
    }

    @media (max-width: 900px) {
        .editor-grid { grid-template-columns: 1fr; }
        .timestate-row { grid-template-columns: 1fr; gap: 4px; }
    }
</style>

<script>
    <?php $module_base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'); ?>
    window.ZABBIX_CONFIG = {
        module_base: '<?php echo $module_base; ?>',
        api_action_url: '<?php echo $module_base; ?>/zabbix.php?action=react.dashboard.api',
        api_url: '<?php echo $module_base; ?>/modules/react-dashboard/api.php',
        api_fallback_url: '<?php echo $module_base; ?>/modules/react-dashboard/api.php'
    };
</script>

<?php
$widgets_dir = $data['module_path'] . '/assets/js/widgets';
$timestate_widget_file = $widgets_dir . '/TimeStateWidget.js';
if (is_file($timestate_widget_file)) {
    echo '<script type="text/babel" data-presets="react">' . "\n";
    echo file_get_contents($timestate_widget_file);
    echo "\n</script>\n";
}
?>

<script type="text/babel">
    const { useState, useEffect, useMemo, useRef, useCallback } = React;
    const GridLayout = window.ReactGridLayout;

    const createDashboardApiClient = (config) => {
        const moduleBase = String((config && config.module_base) || '').replace(/\/+$/, '');
        const candidates = Array.from(new Set([
            config && config.api_url,
            config && config.api_fallback_url,
            `${moduleBase}/modules/react-dashboard/modules/react-dashboard/api.php`,
            `${moduleBase}/modules/react-dashboard/api.php`,
            'modules/react-dashboard/modules/react-dashboard/api.php',
            'modules/react-dashboard/api.php',
            '/modules/react-dashboard/modules/react-dashboard/api.php',
            '/modules/react-dashboard/api.php',
            config && config.api_action_url,
            `${moduleBase}/zabbix.php?action=react.dashboard.api`,
            'zabbix.php?action=react.dashboard.api'
        ].filter(Boolean)));

        const cache = new Map();
        const inFlight = new Map();

        const toParams = (paramsInput) => (
            paramsInput instanceof URLSearchParams
                ? paramsInput
                : new URLSearchParams(paramsInput || {})
        );

        const requestJson = async (paramsInput) => {
            const params = toParams(paramsInput);
            let lastError = null;

            for (const base of candidates) {
                const url = `${base}?${params.toString()}`;
                try {
                    const response = await fetch(url, { headers: { Accept: 'application/json' } });
                    const text = await response.text();
                    let payload = null;
                    try {
                        payload = JSON.parse(text);
                    }
                    catch (_parseError) {
                        throw new Error(`API response is geen JSON (${base}). Eerste bytes: ${text.slice(0, 80)}`);
                    }

                    if (!response.ok) {
                        throw new Error((payload && payload.error) ? payload.error : `HTTP ${response.status}`);
                    }
                    if (payload && typeof payload === 'object' && payload.error) {
                        throw new Error(payload.error);
                    }

                    return payload;
                }
                catch (err) {
                    lastError = err;
                }
            }

            throw (lastError || new Error('API request failed'));
        };

        const cachedRequest = async (paramsInput, ttlMs = 15000) => {
            const params = toParams(paramsInput);
            const key = params.toString();
            const now = Date.now();
            const hit = cache.get(key);
            if (hit && (now - hit.ts) < ttlMs) {
                return hit.payload;
            }

            if (inFlight.has(key)) {
                return inFlight.get(key);
            }

            const promise = requestJson(params).then((payload) => {
                cache.set(key, { ts: Date.now(), payload });
                inFlight.delete(key);
                return payload;
            }).catch((err) => {
                inFlight.delete(key);
                throw err;
            });

            inFlight.set(key, promise);
            return promise;
        };

        return { requestJson, cachedRequest };
    };

    const DEFAULT_WIDGET = {
        type: 'Clock',
        name: 'default',
        showHeader: true,
        refreshInterval: 'default',
        timeType: 'local',
        clockType: 'analog',
        showDate: true,
        showTime: true,
        showTimezone: false,
        background: 'theme',
        timeBold: false,
        showSeconds: true,
        hourFormat: '24',
        dateSize: 100,
        timezone: 'Europe/Brussels'
    };

    const REFRESH_OPTIONS = [
        { value: 'default', label: 'Default (15 minutes)', ms: 1000 },
        { value: '10s', label: '10 seconds', ms: 1000 },
        { value: '30s', label: '30 seconds', ms: 1000 },
        { value: '1m', label: '1 minute', ms: 1000 }
    ];

    const TIMEZONE_OPTIONS = [
        'Europe/Brussels',
        'Europe/Amsterdam',
        'Europe/London',
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Asia/Tokyo'
    ];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const ClockWidget = ({ remove, settings, updateSettings, widgetId }) => {
        const cfg = { ...DEFAULT_WIDGET, ...settings };
        const [editMode, setEditMode] = useState(false);
        const [now, setNow] = useState(new Date());
        const bodyRef = useRef(null);
        const [bodySize, setBodySize] = useState({ width: 320, height: 220 });

        const refreshMs = useMemo(() => {
            const found = REFRESH_OPTIONS.find((o) => o.value === cfg.refreshInterval);
            return found ? found.ms : 1000;
        }, [cfg.refreshInterval]);

        useEffect(() => {
            const timer = setInterval(() => setNow(new Date()), refreshMs);
            return () => clearInterval(timer);
        }, [refreshMs]);

        useEffect(() => {
            if (!bodyRef.current) {
                return;
            }

            const element = bodyRef.current;
            const updateSize = () => {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setBodySize({ width: rect.width, height: rect.height });
                }
            };

            updateSize();

            if (typeof ResizeObserver === 'undefined') {
                window.addEventListener('resize', updateSize);
                return () => window.removeEventListener('resize', updateSize);
            }

            const observer = new ResizeObserver(updateSize);
            observer.observe(element);
            return () => observer.disconnect();
        }, []);

        const timezone = cfg.timeType === 'local'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : cfg.timezone;

        const hour12 = cfg.hourFormat === '12';

        const timeOptions = {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12
        };

        if (cfg.showSeconds) {
            timeOptions.second = '2-digit';
        }

        const timeStr = new Intl.DateTimeFormat([], timeOptions).format(now);
        const dateStr = new Intl.DateTimeFormat([], {
            timeZone: timezone,
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(now);

        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(now).reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});

        const h = Number(parts.hour || 0);
        const m = Number(parts.minute || 0);
        const s = Number(parts.second || 0);

        const analogBaseSize = clamp(Math.min(bodySize.width - 30, bodySize.height - 54), 84, 560);
        const analogSize = Math.round(analogBaseSize * 0.8);
        const digitalTimeSize = Math.round(clamp(Math.min(bodySize.width * 0.2, bodySize.height * 0.35), 20, 100));
        const dateSize = Math.round(clamp(digitalTimeSize * 0.28 * (cfg.dateSize / 100), 9, 42));

        const setSafeShow = (key, checked) => {
            if (!checked) {
                const activeCount = [cfg.showDate, cfg.showTime, cfg.showTimezone].filter(Boolean).length;
                if (activeCount <= 1) {
                    return;
                }
            }
            updateSettings({ [key]: checked });
        };

        const faceStyle = { '--clock-size': `${analogSize}px` };
        const viewStyle = {
            '--clock-time-size': `${digitalTimeSize}px`,
            '--clock-date-size': `${dateSize}px`,
            '--clock-time-weight': cfg.timeBold ? 700 : 500,
            '--clock-time-color': cfg.background === 'dark' ? '#f5f8fb' : 'var(--text-color)',
            background: cfg.background === 'dark' ? '#1f252b' : 'transparent'
        };

        const renderAnalog = () => (
            <div className="clock-view" style={viewStyle}>
                <div className="clock-face" style={faceStyle}>
                    {[...Array(12)].map((_, i) => {
                        const angle = i * 30;
                        const tx = Math.sin(angle * Math.PI / 180) * analogSize * 0.44;
                        const ty = -Math.cos(angle * Math.PI / 180) * analogSize * 0.44;
                        return (
                            <div
                                key={`tick-${i}`}
                                className={`clock-tick ${i % 3 === 0 ? 'major' : ''}`}
                                style={{ transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${angle}deg)` }}
                            />
                        );
                    })}
                    {[...Array(12)].map((_, i) => {
                        const angle = i * 30;
                        const nx = Math.sin(angle * Math.PI / 180) * analogSize * 0.34;
                        const ny = -Math.cos(angle * Math.PI / 180) * analogSize * 0.34;
                        return (
                            <div
                                key={`num-${i}`}
                                className="clock-number"
                                style={{ transform: `translate(${nx}px, ${ny}px)` }}
                            >
                                {i === 0 ? 12 : i}
                            </div>
                        );
                    })}
                    <div className="clock-hand hour" style={{ transform: `translateX(-50%) rotate(${(h % 12) * 30 + m * 0.5}deg)` }} />
                    <div className="clock-hand min" style={{ transform: `translateX(-50%) rotate(${m * 6 + s * 0.1}deg)` }} />
                    {cfg.showSeconds && <div className="clock-hand sec" style={{ transform: `translateX(-50%) rotate(${s * 6}deg)` }} />}
                    <div className="clock-center" />
                </div>

                {cfg.showDate && <div className="clock-date">{dateStr}</div>}
                {cfg.showTimezone && <div className="clock-timezone">{timezone}</div>}
                {!cfg.showTime && cfg.showDate === false && cfg.showTimezone === false && <div className="clock-time">{timeStr}</div>}
            </div>
        );

        const renderDigital = () => (
            <div className="clock-view" style={viewStyle}>
                {cfg.showTime && <div className="clock-time">{timeStr}</div>}
                {cfg.showDate && <div className="clock-date">{dateStr}</div>}
                {cfg.showTimezone && <div className="clock-timezone">{timezone}</div>}
            </div>
        );

        return (
            <div className="widget-card">
                {cfg.showHeader && (
                    <div className="widget-header">
                        <span className="widget-title">{cfg.name || 'default'}</span>
                        <div className="widget-actions">
                            <button className="btn-zbx" onClick={() => setEditMode((v) => !v)}>
                                {editMode ? 'Close' : 'Edit'}
                            </button>
                            <button className="btn-zbx btn-danger" onClick={remove}>✕</button>
                        </div>
                    </div>
                )}

                <div className="widget-body" ref={bodyRef}>
                    {!cfg.showHeader && (
                        <div className="widget-floating-actions">
                            <button className="btn-zbx" onClick={() => setEditMode((v) => !v)}>
                                {editMode ? 'Close' : 'Edit'}
                            </button>
                            <button className="btn-zbx btn-danger" onClick={remove}>✕</button>
                        </div>
                    )}

                    {editMode ? (
                        <div className="clock-editor">
                            <div className="editor-title">Clock</div>
                            <div className="editor-grid">
                                <div className="editor-label">Name</div>
                                <div className="editor-control">
                                    <input
                                        type="text"
                                        value={cfg.name}
                                        onChange={(e) => updateSettings({ name: e.target.value })}
                                        placeholder="default"
                                    />
                                </div>

                                <div className="editor-label">Show header</div>
                                <div className="editor-control">
                                    <label><input type="checkbox" checked={cfg.showHeader} onChange={(e) => updateSettings({ showHeader: e.target.checked })} /> Header</label>
                                </div>

                                <div className="editor-label">Refresh interval</div>
                                <div className="editor-control">
                                    <select value={cfg.refreshInterval} onChange={(e) => updateSettings({ refreshInterval: e.target.value })}>
                                        {REFRESH_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>

                                <div className="editor-label">Time type</div>
                                <div className="editor-control">
                                    <select value={cfg.timeType} onChange={(e) => updateSettings({ timeType: e.target.value })}>
                                        <option value="local">Local time</option>
                                        <option value="custom">Custom time zone</option>
                                    </select>
                                </div>

                                {cfg.timeType === 'custom' && (
                                    <>
                                        <div className="editor-label">Time zone</div>
                                        <div className="editor-control">
                                            <select value={cfg.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })}>
                                                {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div className="editor-label">Clock type</div>
                                <div className="editor-control">
                                    <div className="editor-segment">
                                        <button className={cfg.clockType === 'analog' ? 'active' : ''} onClick={() => updateSettings({ clockType: 'analog' })}>Analog</button>
                                        <button className={cfg.clockType === 'digital' ? 'active' : ''} onClick={() => updateSettings({ clockType: 'digital' })}>Digital</button>
                                    </div>
                                </div>

                                <div className="editor-label">Show</div>
                                <div className="editor-control editor-checks">
                                    <label>
                                        <input type="checkbox" checked={cfg.showDate} onChange={(e) => setSafeShow('showDate', e.target.checked)} /> Date
                                    </label>
                                    <label>
                                        <input type="checkbox" checked={cfg.showTime} onChange={(e) => setSafeShow('showTime', e.target.checked)} /> Time
                                    </label>
                                    <label>
                                        <input type="checkbox" checked={cfg.showTimezone} onChange={(e) => setSafeShow('showTimezone', e.target.checked)} /> Time zone
                                    </label>
                                </div>
                            </div>

                            <div className="editor-advanced">
                                <div className="editor-advanced-title">Advanced configuration</div>
                                <div className="editor-grid">
                                    <div className="editor-label">Background colour</div>
                                    <div className="editor-control">
                                        <div className="editor-segment">
                                            <button className={cfg.background === 'theme' ? 'active' : ''} onClick={() => updateSettings({ background: 'theme' })}>Theme</button>
                                            <button className={cfg.background === 'dark' ? 'active' : ''} onClick={() => updateSettings({ background: 'dark' })}>Dark</button>
                                        </div>
                                    </div>

                                    <div className="editor-label">Time style</div>
                                    <div className="editor-control editor-checks">
                                        <label>
                                            <input type="checkbox" checked={cfg.timeBold} onChange={(e) => updateSettings({ timeBold: e.target.checked })} /> Bold
                                        </label>
                                        <label>
                                            <input type="checkbox" checked={cfg.showSeconds} onChange={(e) => updateSettings({ showSeconds: e.target.checked })} /> Seconds
                                        </label>
                                    </div>

                                    <div className="editor-label">Time format</div>
                                    <div className="editor-control">
                                        <div className="editor-segment">
                                            <button className={cfg.hourFormat === '24' ? 'active' : ''} onClick={() => updateSettings({ hourFormat: '24' })}>24-hour</button>
                                            <button className={cfg.hourFormat === '12' ? 'active' : ''} onClick={() => updateSettings({ hourFormat: '12' })}>12-hour</button>
                                        </div>
                                    </div>

                                    <div className="editor-label">Date size (%)</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="60"
                                            max="220"
                                            value={cfg.dateSize}
                                            onChange={(e) => updateSettings({ dateSize: clamp(Number(e.target.value) || 100, 60, 220) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="editor-footer">
                                <button className="btn-zbx" onClick={() => setEditMode(false)}>Done</button>
                            </div>
                        </div>
                    ) : (
                        cfg.clockType === 'analog' ? renderAnalog() : renderDigital()
                    )}
                </div>
            </div>
        );
    };

    const TIMESTATE_DEFAULT_WIDGET = {
        type: 'TimeState',
        name: 'Time State',
        showHeader: true,
        groupid: '',
        hostidsCsv: '',
        itemidsCsv: '',
        itemKeySearch: '',
        itemNameSearch: '',
        lookbackHours: 24,
        maxRows: 20,
        historyPoints: 500,
        rowSort: 0,
        mergeEqual: 1,
        refreshSec: 30,
        stateMap: 'value:0=OK|#2E7D32,value:1=Problem|#C62828'
    };

    const widgetDefaultsByType = (type) => {
        if (type === 'TimeState') {
            return TIMESTATE_DEFAULT_WIDGET;
        }
        return DEFAULT_WIDGET;
    };

    const mergeWithDefaults = (widget) => {
        const type = widget && widget.type ? widget.type : 'Clock';
        return { ...widgetDefaultsByType(type), ...widget, type };
    };

    const saveLayoutLocal = (items) => {
        localStorage.setItem('zbx_layout_v4', JSON.stringify(items));
    };

    const App = () => {
        const gridWrapRef = useRef(null);
        const [gridWidth, setGridWidth] = useState(1400);
        const apiClient = useMemo(() => createDashboardApiClient(window.ZABBIX_CONFIG || {}), []);
        const [globalData, setGlobalData] = useState({ groups: [], refreshedAt: 0 });
        const [layout, setLayout] = useState(() => {
            const saved = localStorage.getItem('zbx_layout_v4');
            if (saved) {
                return JSON.parse(saved).map(mergeWithDefaults);
            }
            return [
                { i: 'w1', x: 0, y: 0, w: 4, h: 8, ...DEFAULT_WIDGET },
                { i: 'w2', x: 4, y: 0, w: 8, h: 10, ...TIMESTATE_DEFAULT_WIDGET }
            ];
        });

        const onLayoutChange = (newLayout) => {
            const merged = newLayout.map((item) => {
                const old = layout.find((w) => w.i === item.i) || { type: 'Clock' };
                return mergeWithDefaults({ ...old, ...item });
            });
            setLayout(merged);
            saveLayoutLocal(merged);
        };

        const updateWidget = (id, patch) => {
            setLayout((prev) => {
                const next = prev.map((w) => (w.i === id ? { ...w, ...patch } : w));
                saveLayoutLocal(next);
                return next;
            });
        };

        const refreshAllData = useCallback(async () => {
            try {
                const groups = await apiClient.cachedRequest({ action_type: 'get_groups' }, 60000);
                setGlobalData({
                    groups: Array.isArray(groups) ? groups : [],
                    refreshedAt: Date.now()
                });
            }
            catch (_error) {
                setGlobalData((prev) => ({ ...prev, refreshedAt: Date.now() }));
            }
        }, [apiClient]);

        const removeWidget = (id) => {
            setLayout((prev) => {
                const next = prev.filter((w) => w.i !== id);
                saveLayoutLocal(next);
                return next;
            });
        };

        const addWidget = (type) => {
            const defaults = widgetDefaultsByType(type);
            setLayout((prev) => {
                const next = [
                    ...prev,
                    {
                        i: `w${Date.now()}`,
                        x: 0,
                        y: Infinity,
                        w: type === 'TimeState' ? 8 : 4,
                        h: type === 'TimeState' ? 10 : 8,
                        ...defaults
                    }
                ];
                saveLayoutLocal(next);
                return next;
            });
        };

        useEffect(() => {
            const updateGridWidth = () => {
                if (!gridWrapRef.current) {
                    return;
                }
                const rect = gridWrapRef.current.getBoundingClientRect();
                if (rect.width > 0) {
                    setGridWidth(Math.floor(rect.width));
                }
            };

            updateGridWidth();

            if (typeof ResizeObserver === 'undefined') {
                window.addEventListener('resize', updateGridWidth);
                return () => window.removeEventListener('resize', updateGridWidth);
            }

            const observer = new ResizeObserver(updateGridWidth);
            observer.observe(gridWrapRef.current);
            return () => observer.disconnect();
        }, []);

        useEffect(() => {
            refreshAllData();
            const timer = setInterval(refreshAllData, 60000);
            return () => clearInterval(timer);
        }, [refreshAllData]);

        const gridCols = gridWidth >= 1600 ? 36 : (gridWidth >= 1200 ? 24 : 12);

        const normalizedLayout = useMemo(() => (
            layout.map((item) => {
                const safeW = Math.max(1, Math.min(item.w || 1, gridCols));
                const maxX = Math.max(0, gridCols - safeW);
                const safeX = Math.max(0, Math.min(item.x || 0, maxX));
                return { ...item, w: safeW, x: safeX };
            })
        ), [layout, gridCols]);

        return (
            <div style={{ padding: '20px' }} ref={gridWrapRef}>
                <button className="btn-zbx" style={{ marginBottom: 20, marginRight: 8, background: '#248ad2', borderColor: '#4aa1de' }} onClick={() => addWidget('Clock')}>
                    + Add Clock
                </button>
                <button className="btn-zbx" style={{ marginBottom: 20, background: '#2f7d4a', borderColor: '#56a16e' }} onClick={() => addWidget('TimeState')}>
                    + Add Time State
                </button>

                <GridLayout
                    className="layout"
                    layout={normalizedLayout}
                    cols={gridCols}
                    rowHeight={30}
                    width={gridWidth}
                    draggableHandle=".widget-header"
                    onLayoutChange={onLayoutChange}
                >
                    {layout.map((w) => (
                        (() => {
                            const WidgetComponent = (w.type === 'TimeState' && window.TimeStateWidget)
                                ? window.TimeStateWidget
                                : ClockWidget;

                            return (
                                <div key={w.i}>
                                    <WidgetComponent
                                        widgetId={w.i}
                                        settings={w}
                                        updateSettings={(patch) => updateWidget(w.i, patch)}
                                        remove={() => removeWidget(w.i)}
                                        apiClient={apiClient}
                                        globalData={globalData}
                                        refreshAllData={refreshAllData}
                                    />
                                </div>
                            );
                        })()
                    ))}
                </GridLayout>
            </div>
        );
    };

    const root = ReactDOM.createRoot(document.getElementById('react-root'));
    root.render(<App />);
</script>
