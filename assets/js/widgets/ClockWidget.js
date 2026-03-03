window.ClockWidget = ({ remove }) => {
    const [time, setTime] = React.useState(new Date().toLocaleTimeString());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="widget-card">
            <div className="widget-header">
                <span className="widget-title">SYSTEM TIME</span>
                <button className="btn-remove" onClick={remove}>✕</button>
            </div>
            <div className="widget-body">
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff' }}>
                    {time}
                </div>
            </div>
        </div>
    );
};
