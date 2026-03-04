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
        /* We bepalen hier of de gebruiker een donker thema heeft ingesteld */
        <?php $is_dark = (isset($data['user_theme']) && strpos($data['user_theme'], 'dark') !== false); ?>
        
        /* Variabelen die zich aanpassen aan het thema */
        --bg-color: <?php echo $is_dark ? '#2b2b2b' : '#ebedef'; ?>;
        --card-bg: <?php echo $is_dark ? '#383838' : '#ffffff'; ?>;
        --text-color: <?php echo $is_dark ? '#f2f2f2' : '#333333'; ?>;
        --header-bg: <?php echo $is_dark ? '#4f4f4f' : '#3c5559'; ?>;
        --border-color: <?php echo $is_dark ? '#555555' : '#dfe3e8'; ?>;
    }

    /* De achtergrond van de hele pagina */
    body { 
        background-color: var(--bg-color); 
        color: var(--text-color); 
        margin: 0; 
        padding: 0;
        transition: background-color 0.3s ease;
    }

    /* De container van de individuele widgets */
    .widget-card { 
        background: var(--card-bg); 
        border: 1px solid var(--border-color);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        height: 100%;
        box-shadow: 0 4px 6px rgba(0,0,0,<?php echo $is_dark ? '0.4' : '0.1'; ?>);
        overflow: hidden;
    }

    /* De donkere balk bovenin elke widget */
    .widget-header { 
        padding: 8px 12px; 
        background: var(--header-bg); 
        color: #ffffff;
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        cursor: grab; 
    }

    .widget-body { 
        flex: 1; 
        padding: 15px;
        display: flex; 
        justify-content: center; 
        align-items: center;
        text-align: center;
    }

    .btn-remove {
        border: 0;
        background: rgba(255,255,255,0.15);
        color: #ffffff;
        width: 26px;
        height: 26px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        transition: background 0.2s ease, transform 0.2s ease;
    }

    .btn-remove:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-1px);
    }

    .widget-card--clock {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px;
        box-shadow:
            0 12px 32px rgba(0,0,0,<?php echo $is_dark ? '0.45' : '0.16'; ?>),
            inset 0 1px 0 rgba(255,255,255,0.08);
        background:
            radial-gradient(circle at 12% 14%, rgba(255,255,255,0.14), transparent 42%),
            linear-gradient(160deg, <?php echo $is_dark ? '#1f2937' : '#f8fbff'; ?>, <?php echo $is_dark ? '#0f172a' : '#e8eef7'; ?>);
    }

    .widget-header--clock {
        background: linear-gradient(90deg, rgba(15,23,42,0.85), rgba(31,41,55,0.65));
        backdrop-filter: blur(6px);
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .clock-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .clock-mode-toggle {
        display: inline-flex;
        border: 1px solid rgba(255,255,255,0.26);
        border-radius: 999px;
        padding: 2px;
        background: rgba(0,0,0,0.22);
    }

    .clock-mode-btn {
        border: 0;
        background: transparent;
        color: rgba(255,255,255,0.78);
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        letter-spacing: 0.03em;
    }

    .clock-mode-btn.is-active {
        background: rgba(255,255,255,0.18);
        color: #ffffff;
    }

    .widget-body--clock {
        padding: 20px 16px;
    }

    .clock-digital {
        width: 100%;
        color: #ffffff;
        text-shadow: 0 3px 12px rgba(0,0,0,0.3);
    }

    .clock-time {
        font-size: clamp(32px, 5vw, 50px);
        line-height: 1.05;
        font-weight: 700;
        letter-spacing: 0.04em;
        font-variant-numeric: tabular-nums;
    }

    .clock-date {
        margin-top: 10px;
        font-size: 13px;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.82);
        font-weight: 600;
    }

    .clock-analog-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 8px;
    }

    .clock-analog {
        position: relative;
        width: min(200px, 72%);
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.4);
        background:
            radial-gradient(circle at 30% 28%, rgba(255,255,255,0.32), rgba(255,255,255,0.06) 48%, rgba(0,0,0,0.2) 100%),
            linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.03));
        box-shadow:
            inset 0 1px 20px rgba(255,255,255,0.06),
            0 12px 28px rgba(0,0,0,0.35);
    }

    .clock-hand {
        position: absolute;
        left: 50%;
        bottom: 50%;
        transform-origin: 50% 100%;
        border-radius: 999px;
    }

    .clock-hand--hour {
        width: 6px;
        height: 28%;
        background: #ffffff;
    }

    .clock-hand--minute {
        width: 4px;
        height: 36%;
        background: #e2e8f0;
    }

    .clock-hand--second {
        width: 2px;
        height: 40%;
        background: #f87171;
    }

    .clock-center-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #f8fafc;
        transform: translate(-50%, -50%);
    }

    .clock-tick {
        position: absolute;
        top: 6%;
        left: 50%;
        width: 2px;
        height: 8%;
        background: rgba(255,255,255,0.55);
        transform-origin: 50% calc(50% + 42%);
    }

    .clock-tick--major {
        height: 10%;
        width: 3px;
        background: rgba(255,255,255,0.88);
    }

    /* FIX VOOR HET "VUIL" (de resize handles) */
    /* We maken ze bijna onzichtbaar en draaien de kleur om in Dark Mode */
    .react-resizable-handle {
        opacity: 0.15;
        filter: <?php echo $is_dark ? 'invert(1)' : 'none'; ?>;
        transition: opacity 0.2s;
    }
    
    .react-resizable-handle:hover {
        opacity: 1;
    }

    /* De placeholder die je ziet tijdens het slepen */
    .react-grid-placeholder {
        background: rgba(0,0,0,0.1) !important;
        border-radius: 4px !important;
    }
</style>

<script>
    window.ZABBIX_CONFIG = {
        layout: <?php echo json_encode($data['current_layout']); ?>,
        saved_host: <?php echo json_encode($data['saved_host']); ?>,
        sid: "<?php echo CWebUser::$data['sessionid']; ?>"
    };
</script>

<?php
$widgets_dir = $data['module_path'] . '/assets/js/widgets';
if (is_dir($widgets_dir)) {
    foreach (glob($widgets_dir . '/*.js') as $file) {
        // We zetten 'data-presets="react"' erbij voor Babel
        echo '<script type="text/babel" data-presets="react">' . "\n";
        echo file_get_contents($file);
        echo "\n</script>\n";
    }
}
?>

<script type="text/babel" data-presets="react">
    const { useState, useEffect } = React;
    const GridLayout = window.ReactGridLayout;

    const WIDGET_TYPES = {
        Clock: window.ClockWidget
        // Voeg hier later HostMonitor: window.HostMonitorWidget toe
    };

    const App = () => {
        // Laad layout uit localStorage, of gebruik de layout van Zabbix
        const savedLayout = localStorage.getItem('zbx_react_dashboard_layout');
        const initialLayout = savedLayout ? JSON.parse(savedLayout) : window.ZABBIX_CONFIG.layout;
        
        const [layout, setLayout] = useState(initialLayout || []);

        // Elke keer als de layout verandert, opslaan in localStorage
        const saveLayout = (newLayout) => {
            // We moeten de 'type' handmatig herstellen omdat de grid-library die stript
            const layoutToSave = newLayout.map(item => {
                const oldItem = layout.find(l => l.i === item.i);
                return { ...item, type: oldItem ? oldItem.type : 'Clock' };
            });
            setLayout(layoutToSave);
            localStorage.setItem('zbx_react_dashboard_layout', JSON.stringify(layoutToSave));
        };

        const onAddWidget = () => {
            const id = "w" + Date.now();
            const newLayout = [...layout, { i: id, x: 0, y: Infinity, w: 4, h: 4, type: 'Clock' }];
            saveLayout(newLayout);
        };

        const onRemoveWidget = (id) => {
            const newLayout = layout.filter(w => w.i !== id);
            saveLayout(newLayout);
        };

        return (
            <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                    <button className="btn-add" onClick={onAddWidget}>+ Add Clock</button>
                </div>
                
                <GridLayout 
                    className="layout" 
                    layout={layout} 
                    cols={12} 
                    rowHeight={30} 
                    width={1400}
                    onLayoutChange={saveLayout}
                    draggableHandle=".widget-header"
                >
                    {layout.map(w => {
                        const WidgetComponent = WIDGET_TYPES[w.type];
                        return (
                            <div key={w.i}>
                                {WidgetComponent ? (
                                    <WidgetComponent remove={() => onRemoveWidget(w.i)} widgetId={w.i} />
                                ) : (
                                    <div className="widget-card">
                                        <div className="widget-header">
                                            <span>Unknown Widget</span>
                                            <button onClick={() => onRemoveWidget(w.i)}>✕</button>
                                        </div>
                                        <div className="widget-body">Widget type '{w.type}' not found</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </GridLayout>
            </div>
        );
    };

    const root = ReactDOM.createRoot(document.getElementById('react-root'));
    root.render(<App />);
</script>
