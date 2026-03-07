window.ReactDashboardClockWidget = (() => {
    const DEFAULTS = {
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
        backgroundColor: '#1F252B',
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
    const toBoundedInt = (value, fallback, min, max) => {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return fallback;
        }
        return Math.max(min, Math.min(max, Math.round(num)));
    };
    const toBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
    const toText = (value, fallback, maxLength = 120) => {
        if (typeof value !== 'string') {
            return fallback;
        }
        return value.slice(0, maxLength);
    };
    const toHexColor = (value, fallback) => {
        const raw = String(value || '').trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
            return raw.toUpperCase();
        }
        return fallback;
    };

    const sanitizeSettings = (raw) => {
        const base = (raw && typeof raw === 'object') ? raw : {};
        const allowedRefresh = new Set(REFRESH_OPTIONS.map((option) => option.value));
        const allowedTimezone = new Set(TIMEZONE_OPTIONS);

        return {
            type: 'Clock',
            name: toText(base.name, DEFAULTS.name, 120),
            showHeader: toBoolean(base.showHeader, DEFAULTS.showHeader),
            refreshInterval: allowedRefresh.has(base.refreshInterval) ? base.refreshInterval : DEFAULTS.refreshInterval,
            timeType: base.timeType === 'custom' ? 'custom' : 'local',
            clockType: base.clockType === 'digital' ? 'digital' : 'analog',
            showDate: toBoolean(base.showDate, DEFAULTS.showDate),
            showTime: toBoolean(base.showTime, DEFAULTS.showTime),
            showTimezone: toBoolean(base.showTimezone, DEFAULTS.showTimezone),
            background: ['theme', 'dark', 'custom'].includes(base.background) ? base.background : DEFAULTS.background,
            backgroundColor: toHexColor(base.backgroundColor, DEFAULTS.backgroundColor),
            timeBold: toBoolean(base.timeBold, DEFAULTS.timeBold),
            showSeconds: toBoolean(base.showSeconds, DEFAULTS.showSeconds),
            hourFormat: base.hourFormat === '12' ? '12' : '24',
            dateSize: toBoundedInt(base.dateSize, DEFAULTS.dateSize, 60, 220),
            timezone: allowedTimezone.has(base.timezone) ? base.timezone : DEFAULTS.timezone
        };
    };

    window.ClockWidget = ({ remove, settings, updateSettings }) => {
        const { useState, useEffect, useMemo, useRef } = React;
        const ColorPickerField = window.ReactDashboardColorPickerField;

        const cfg = { ...DEFAULTS, ...sanitizeSettings(settings || {}) };

        const [editMode, setEditMode] = useState(false);
        const [now, setNow] = useState(new Date());
        const bodyRef = useRef(null);
        const [bodySize, setBodySize] = useState({ width: 320, height: 220 });
        const [dateSizeDraft, setDateSizeDraft] = useState(String(cfg.dateSize));

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

        useEffect(() => {
            setDateSizeDraft(String(cfg.dateSize));
        }, [cfg.dateSize, editMode]);

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

        const commitDateSizeDraft = () => {
            const raw = String(dateSizeDraft || '').trim();
            if (raw === '') {
                setDateSizeDraft(String(cfg.dateSize));
                return;
            }

            const parsed = Number(raw);
            if (!Number.isFinite(parsed)) {
                setDateSizeDraft(String(cfg.dateSize));
                return;
            }

            const next = Math.round(clamp(parsed, 60, 220));
            setDateSizeDraft(String(next));
            if (next !== Number(cfg.dateSize)) {
                updateSettings({ dateSize: next });
            }
        };

        const faceStyle = { '--clock-size': `${analogSize}px` };
        const resolvedBackground = cfg.background === 'dark'
            ? '#1f252b'
            : (cfg.background === 'custom' ? String(cfg.backgroundColor || '#1F252B') : 'transparent');
        const viewStyle = {
            '--clock-time-size': `${digitalTimeSize}px`,
            '--clock-date-size': `${dateSize}px`,
            '--clock-time-weight': cfg.timeBold ? 700 : 500,
            '--clock-time-color': cfg.background === 'theme' ? 'var(--text-color)' : '#f5f8fb',
            background: resolvedBackground
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
                                            <button className={cfg.background === 'custom' ? 'active' : ''} onClick={() => updateSettings({ background: 'custom' })}>Custom</button>
                                        </div>
                                    </div>

                                    {cfg.background === 'custom' && (
                                        <>
                                            <div className="editor-label">Custom bg colour</div>
                                            <div className="editor-control">
                                                {ColorPickerField ? (
                                                    <ColorPickerField
                                                        value={cfg.backgroundColor || '#1F252B'}
                                                        defaultColor="#1F252B"
                                                        onChange={(nextColor) => updateSettings({ backgroundColor: nextColor })}
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={cfg.backgroundColor || '#1F252B'}
                                                        onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                                                        placeholder="#1F252B"
                                                    />
                                                )}
                                            </div>
                                        </>
                                    )}

                                    <div className="editor-label">Time style</div>
                                    <div className="editor-control editor-checks">
                                        <label>
                                            <input type="checkbox" checked={cfg.timeBold} onChange={(e) => updateSettings({ timeBold: e.target.checked })} /> Bold
                                        </label>
                                        <label>
                                            <input type="checkbox" checked={cfg.showSeconds} onChange={(e) => updateSettings({ showSeconds: e.target.checked })} /> Seconds
                                        </label>
                                    </div>

                                    {cfg.clockType === 'digital' && (
                                        <>
                                            <div className="editor-label">Time format</div>
                                            <div className="editor-control">
                                                <div className="editor-segment">
                                                    <button className={cfg.hourFormat === '24' ? 'active' : ''} onClick={() => updateSettings({ hourFormat: '24' })}>24-hour</button>
                                                    <button className={cfg.hourFormat === '12' ? 'active' : ''} onClick={() => updateSettings({ hourFormat: '12' })}>12-hour</button>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="editor-label">Date size (%)</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="60"
                                            max="220"
                                            value={dateSizeDraft}
                                            onChange={(e) => setDateSizeDraft(e.target.value)}
                                            onBlur={commitDateSizeDraft}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitDateSizeDraft();
                                                }
                                            }}
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

    return {
        DEFAULTS,
        REFRESH_OPTIONS,
        TIMEZONE_OPTIONS,
        sanitizeSettings
    };
})();
