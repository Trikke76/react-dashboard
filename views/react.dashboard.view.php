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
                                    <WidgetComponent remove={() => onRemoveWidget(w.i)} />
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
