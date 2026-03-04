window.ClockWidget = ({ remove, widgetId }) => {
    const [now, setNow] = React.useState(new Date());
    const [mode, setMode] = React.useState(() => {
        if (!widgetId) {
            return 'digital';
        }
        return localStorage.getItem(`zbx_clock_mode_${widgetId}`) || 'digital';
    });

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        if (widgetId) {
            localStorage.setItem(`zbx_clock_mode_${widgetId}`, mode);
        }
    }, [mode, widgetId]);

    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();

    const hourDegrees = (hour % 12) * 30 + minute * 0.5;
    const minuteDegrees = minute * 6 + second * 0.1;
    const secondDegrees = second * 6;
    const handTransform = (deg) => ({ transform: `translateX(-50%) rotate(${deg}deg)` });
    const tickTransform = (deg) => ({ transform: `translateX(-50%) rotate(${deg}deg)` });

    const digitalTime = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const digitalDate = now.toLocaleDateString([], {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="widget-card widget-card--clock">
            <div className="widget-header widget-header--clock">
                <span className="widget-title">SYSTEM TIME</span>

                <div className="clock-actions">
                    <div className="clock-mode-toggle" role="tablist" aria-label="Clock view">
                        <button
                            className={`clock-mode-btn ${mode === 'digital' ? 'is-active' : ''}`}
                            onClick={() => setMode('digital')}
                            role="tab"
                            aria-selected={mode === 'digital'}
                        >
                            Digital
                        </button>
                        <button
                            className={`clock-mode-btn ${mode === 'analog' ? 'is-active' : ''}`}
                            onClick={() => setMode('analog')}
                            role="tab"
                            aria-selected={mode === 'analog'}
                        >
                            Analog
                        </button>
                    </div>

                    <button className="btn-remove" onClick={remove}>✕</button>
                </div>
            </div>

            <div className="widget-body widget-body--clock">
                {mode === 'digital' ? (
                    <div className="clock-digital">
                        <div className="clock-time">{digitalTime}</div>
                        <div className="clock-date">{digitalDate}</div>
                    </div>
                ) : (
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
                    </div>
                )}
            </div>
        </div>
    );
};
