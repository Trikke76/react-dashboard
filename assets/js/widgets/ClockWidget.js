window.ClockWidget = ({ remove, widgetId }) => {
    const DEFAULT_SETTINGS = {
        mode: 'digital',
        hourFormat: '24',
        timezone: '__local__'
    };
    const TIMEZONE_OPTIONS = [
        { value: '__local__', label: 'Browser local' },
        { value: 'UTC', label: 'UTC' },
        { value: 'Europe/Brussels', label: 'Europe/Brussels' },
        { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam' },
        { value: 'Europe/London', label: 'Europe/London' },
        { value: 'America/New_York', label: 'America/New_York' },
        { value: 'America/Chicago', label: 'America/Chicago' },
        { value: 'America/Denver', label: 'America/Denver' },
        { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
        { value: 'Asia/Tokyo', label: 'Asia/Tokyo' }
    ];

    const [now, setNow] = React.useState(new Date());
    const [isEditing, setIsEditing] = React.useState(false);
    const [settings, setSettings] = React.useState(() => {
        if (!widgetId) {
            return DEFAULT_SETTINGS;
        }

        try {
            const raw = localStorage.getItem(`zbx_clock_settings_${widgetId}`);
            if (!raw) {
                return DEFAULT_SETTINGS;
            }
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
        catch (error) {
            return DEFAULT_SETTINGS;
        }
    });

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        if (widgetId) {
            localStorage.setItem(`zbx_clock_settings_${widgetId}`, JSON.stringify(settings));
        }
    }, [settings, widgetId]);

    const resolvedTimezone = React.useMemo(() => {
        if (settings.timezone === '__local__') {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        try {
            new Intl.DateTimeFormat([], { timeZone: settings.timezone }).format(now);
            return settings.timezone;
        }
        catch (error) {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
    }, [settings.timezone, now]);

    const timeParts = React.useMemo(() => {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: resolvedTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(now);
        const valueByType = parts.reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});
        return {
            hour: Number(valueByType.hour || 0),
            minute: Number(valueByType.minute || 0),
            second: Number(valueByType.second || 0)
        };
    }, [now, resolvedTimezone]);

    const hour = timeParts.hour;
    const minute = timeParts.minute;
    const second = timeParts.second;

    const hourDegrees = (hour % 12) * 30 + minute * 0.5;
    const minuteDegrees = minute * 6 + second * 0.1;
    const secondDegrees = second * 6;
    const handTransform = (deg) => ({ transform: `translateX(-50%) rotate(${deg}deg)` });
    const tickTransform = (deg) => ({ transform: `translateX(-50%) rotate(${deg}deg)` });

    const digitalTime = new Intl.DateTimeFormat([], {
        timeZone: resolvedTimezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: settings.hourFormat === '12'
    }).format(now);

    const digitalDate = new Intl.DateTimeFormat([], {
        timeZone: resolvedTimezone,
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(now);

    const timezoneLabel = settings.timezone === '__local__'
        ? `Local (${resolvedTimezone})`
        : settings.timezone;

    const updateSetting = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const renderClock = () => {
        if (settings.mode === 'digital') {
            return (
                <div className="clock-digital">
                    <div className="clock-time">{digitalTime}</div>
                    <div className="clock-date">{digitalDate}</div>
                    <div className="clock-timezone">{timezoneLabel}</div>
                </div>
            );
        }

        return (
            <div className="clock-analog-wrap">
                <div className="clock-analog" aria-label={digitalTime}>
                    <div className="clock-hand clock-hand--hour" style={handTransform(hourDegrees)} />
                    <div className="clock-hand clock-hand--minute" style={handTransform(minuteDegrees)} />
                    <div className="clock-hand clock-hand--second" style={handTransform(secondDegrees)} />
                    <div className="clock-center-dot" />
                    {[...Array(12)].map((_, idx) => (
                        <div
                            key={idx}
                            className={`clock-tick ${idx % 3 === 0 ? 'clock-tick--major' : ''}`}
                            style={tickTransform(idx * 30)}
                        />
                    ))}
                </div>
                <div className="clock-date">{digitalDate}</div>
                <div className="clock-timezone">{timezoneLabel}</div>
            </div>
        );
    };

    const renderEditor = () => (
        <div className="clock-editor">
            <div className="clock-editor-row">
                <div className="clock-editor-label">Look</div>
                <div className="clock-editor-controls">
                    <button
                        className={`clock-option-btn ${settings.mode === 'digital' ? 'is-active' : ''}`}
                        onClick={() => updateSetting('mode', 'digital')}
                    >
                        Digitaal
                    </button>
                    <button
                        className={`clock-option-btn ${settings.mode === 'analog' ? 'is-active' : ''}`}
                        onClick={() => updateSetting('mode', 'analog')}
                    >
                        Analoog
                    </button>
                </div>
            </div>

            <div className="clock-editor-row">
                <div className="clock-editor-label">Tijdsformaat</div>
                <div className="clock-editor-controls">
                    <button
                        className={`clock-option-btn ${settings.hourFormat === '24' ? 'is-active' : ''}`}
                        onClick={() => updateSetting('hourFormat', '24')}
                    >
                        24 uur
                    </button>
                    <button
                        className={`clock-option-btn ${settings.hourFormat === '12' ? 'is-active' : ''}`}
                        onClick={() => updateSetting('hourFormat', '12')}
                    >
                        12 uur
                    </button>
                </div>
            </div>

            <div className="clock-editor-row">
                <div className="clock-editor-label">Timezone</div>
                <div className="clock-editor-controls">
                    <select
                        className="clock-timezone-select"
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                    >
                        {TIMEZONE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="clock-editor-footer">
                <button className="clock-done-btn" onClick={() => setIsEditing(false)}>Klaar</button>
            </div>
        </div>
    );

    return (
        <div className="widget-card widget-card--clock">
            <div className="widget-header widget-header--clock">
                <span className="widget-title">SYSTEM TIME</span>

                <div className="clock-actions">
                    <button className="btn-edit" onClick={() => setIsEditing((v) => !v)}>
                        {isEditing ? 'Close' : 'Edit'}
                    </button>
                    <button className="btn-remove" onClick={remove}>✕</button>
                </div>
            </div>

            <div className="widget-body widget-body--clock">
                {isEditing ? renderEditor() : renderClock()}
            </div>
        </div>
    );
};
