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
<script src="https://unpkg.com/lucide@latest"></script>
<link rel="stylesheet" href="https://unpkg.com/react-grid-layout@1.3.4/css/styles.css">

<style>
    :root {
        <?php $is_dark = (isset($data['user_theme']) && strpos($data['user_theme'], 'dark') !== false); ?>
        --bg-color: <?php echo $is_dark ? '#2b2b2b' : '#ebedef'; ?>;
        --card-bg: <?php echo $is_dark ? '#383838' : '#ffffff'; ?>;
        --text-color: <?php echo $is_dark ? '#f2f2f2' : '#333333'; ?>;
        --header-bg: <?php echo $is_dark ? '#4f4f4f' : '#3c5559'; ?>;
        --border-color: <?php echo $is_dark ? '#555555' : '#dfe3e8'; ?>;
        --btn-bg: <?php echo $is_dark ? '#555555' : '#e0e0e0'; ?>;
    }

    body { background-color: var(--bg-color); color: var(--text-color); margin: 0; padding: 0; }

    .widget-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        height: 100%;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        overflow: hidden;
    }

    .widget-header {
        padding: 8px 12px;
        background: var(--header-bg);
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
    }

    .btn-zbx {
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 4px 10px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 11px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .btn-zbx:hover { background: rgba(0,0,0,0.4); }
    
    /* DE RODE X */
    .btn-danger { background: #ae3f3f !important; }
    .btn-danger:hover { background: #cf4b4b !important; }

    .widget-body { 
        flex: 1; 
        padding: 20px; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center; 
        position: relative;
    }

    .clock-face {
        position: relative;
        width: 180px; height: 180px;
        background: white; border-radius: 50%;
        border: 8px solid #1a1a1a;
        flex-shrink: 0; /* Voorkomt dat de klok platgedrukt wordt */
    }
    .clock-tick { position: absolute; top: 50%; left: 50%; width: 2px; height: 8px; background: #333; }
    .tick-major { width: 4px; height: 14px; background: #000; }
    .clock-number { 
        position: absolute; top: 50%; left: 50%; width: 24px; height: 24px; 
        display: flex; align-items: center; justify-content: center; 
        color: black; font-weight: bold; font-size: 16px; 
    }
    .hand { position: absolute; left: 50%; bottom: 50%; transform-origin: 50% 100%; border-radius: 4px; }
    .h-hour { width: 6px; height: 45px; background: #000; z-index: 3; }
    .h-min { width: 4px; height: 65px; background: #000; z-index: 4; }
    .h-sec { width: 2px; height: 75px; background: #d40000; z-index: 5; }

    /* EXTRA INFO STYLING */
    .clock-info-footer {
        margin-top: 15px;
        text-align: center;
    }
    .clock-date-text {
        font-weight: bold;
        font-size: 13px;
        text-transform: uppercase;
        margin-bottom: 4px;
    }
    .clock-tz-text {
        font-size: 11px;
        opacity: 0.7;
    }

    .zbx-select {
        width: 100%;
        background: #111;
        color: white;
        border: 1px solid var(--border-color);
        padding: 8px;
        height: 45px !important;
        margin-top: 5px;
    }
</style>

<script type="text/babel">
    const { useState, useEffect } = React;
    const GridLayout = window.ReactGridLayout;

    const ClockWidget = ({ remove, settings, updateSettings }) => {
        const [editMode, setEditMode] = useState(false);
        const [time, setTime] = useState(new Date());

        useEffect(() => {
            const t = setInterval(() => setTime(new Date()), 1000);
            if(window.lucide) window.lucide.createIcons();
            return () => clearInterval(t);
        }, [editMode]);

        const timezone = settings.timezone || 'Europe/Brussels';
        const timeStr = time.toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false });
        const dateStr = time.toLocaleDateString('en-GB', { 
            timeZone: timezone, 
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
        });

        const [h, m, s] = timeStr.split(':').map(Number);

        const renderAnalog = () => (
            <React.Fragment>
                <div className="clock-face">
                    {[...Array(12)].map((_, i) => {
                        const angle = i * 30;
                        const tx = Math.sin(angle * Math.PI / 180) * 75;
                        const ty = -Math.cos(angle * Math.PI / 180) * 75;
                        const nx = Math.sin(angle * Math.PI / 180) * 55;
                        const ny = -Math.cos(angle * Math.PI / 180) * 55;
                        return (
                            <React.Fragment key={i}>
                                <div className={`clock-tick ${i%3===0?'tick-major':''}`} 
                                     style={{transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${angle}deg)`}} />
                                <div className="clock-number" style={{transform: `translate(-50%, -50%) translate(${nx}px, ${ny}px)`}}>
                                    {i === 0 ? 12 : i}
                                </div>
                            </React.Fragment>
                        );
                    })}
                    <div className="hand h-hour" style={{transform: `translateX(-50%) rotate(${(h%12)*30 + m*0.5}deg)`}} />
                    <div className="hand h-min" style={{transform: `translateX(-50%) rotate(${m*6}deg)`}} />
                    <div className="hand h-sec" style={{transform: `translateX(-50%) rotate(${s*6}deg)`}} />
                    <div style={{position:'absolute', top:'50%', left:'50%', width:10, height:10, background:'#000', borderRadius:'50%', transform:'translate(-50%,-50%)', zIndex:10}} />
                </div>
                {/* INFO ONDER ANALOGE KLOK */}
                <div className="clock-info-footer">
                    <div className="clock-date-text">{dateStr}</div>
                    <div className="clock-tz-text">Local ({timezone})</div>
                </div>
            </React.Fragment>
        );

        return (
            <div className="widget-card">
                <div className="widget-header">
                    <span style={{fontSize:11, fontWeight:'bold', textTransform:'uppercase'}}>System Time</span>
                    <div style={{display:'flex', gap:5}}>
                        <button className="btn-zbx" onClick={() => setEditMode(!editMode)}>
                            {editMode ? 'Close' : 'Edit'}
                        </button>
                        <button className="btn-zbx btn-danger" onClick={remove}>
                            <i data-lucide="x" style={{width:14, height:14}}></i>
                        </button>
                    </div>
                </div>
                <div className="widget-body">
                    {editMode ? (
                        <div style={{width:'100%'}}>
                            <label style={{fontSize:10, fontWeight:'bold'}}>MODE</label>
                            <div style={{display:'flex', gap:5, marginBottom:10, marginTop:5}}>
                                <button className="btn-zbx" onClick={() => updateSettings({mode:'analog'})}>Analog</button>
                                <button className="btn-zbx" onClick={() => updateSettings({mode:'digital'})}>Digital</button>
                            </div>
                            <label style={{fontSize:10, fontWeight:'bold'}}>TIMEZONE</label>
                            <select className="zbx-select" value={settings.timezone} onChange={(e) => updateSettings({timezone: e.target.value})}>
                                <option value="Europe/Brussels">Europe/Brussels</option>
                                <option value="UTC">UTC</option>
                            </select>
                            <button className="btn-zbx" style={{marginTop:10, width:'100%', justifyContent:'center'}} onClick={() => setEditMode(false)}>DONE</button>
                        </div>
                    ) : (
                        settings.mode === 'digital' ? (
                            <div style={{textAlign:'center'}}>
                                <h2 style={{fontSize:42, margin:0}}>{timeStr}</h2>
                                <div className="clock-info-footer">
                                    <div className="clock-date-text">{dateStr}</div>
                                    <div className="clock-tz-text">Local ({timezone})</div>
                                </div>
                            </div>
                        ) : renderAnalog()
                    )}
                </div>
            </div>
        );
    };

    const App = () => {
        const [layout, setLayout] = useState(() => {
            const saved = localStorage.getItem('zbx_layout_v4');
            return saved ? JSON.parse(saved) : [{ i: "w1", x: 0, y: 0, w: 4, h: 8, type: 'Clock', mode: 'analog', timezone: 'Europe/Brussels' }];
        });

        const onLayoutChange = (newLayout) => {
            const merged = newLayout.map(l => {
                const old = layout.find(o => o.i === l.i);
                return { ...l, ...old, x: l.x, y: l.y, w: l.w, h: l.h };
            });
            setLayout(merged);
            localStorage.setItem('zbx_layout_v4', JSON.stringify(merged));
        };

        const updateWidget = (id, newStuff) => {
            setLayout(layout.map(w => w.i === id ? {...w, ...newStuff} : w));
        };

        return (
            <div style={{ padding: '20px' }}>
                <button className="btn-zbx" style={{marginBottom:20, background:'#248ad2'}} onClick={() => setLayout([...layout, {i: 'w'+Date.now(), x:0, y:Infinity, w:4, h:8, type:'Clock', mode:'analog', timezone:'Europe/Brussels'}])}>
                    + Add Clock
                </button>
                <GridLayout 
                    className="layout" 
                    layout={layout} 
                    cols={12} 
                    rowHeight={30} 
                    width={1400}
                    draggableHandle=".widget-header"
                    onLayoutChange={onLayoutChange}
                >
                    {layout.map(w => (
                        <div key={w.i}>
                            <ClockWidget 
                                settings={w} 
                                updateSettings={(s) => updateWidget(w.i, s)} 
                                remove={() => setLayout(layout.filter(x => x.i !== w.i))} 
                            />
                        </div>
                    ))}
                </GridLayout>
            </div>
        );
    };

    const root = ReactDOM.createRoot(document.getElementById('react-root'));
    root.render(<App />);
</script>
