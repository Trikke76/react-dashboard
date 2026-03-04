window.TimeStateWidget = ({ remove, settings, updateSettings, widgetId }) => {
    const { useState, useEffect, useMemo, useCallback } = React;

    const DEFAULTS = {
        type: 'TimeState',
        name: 'Time State',
        showHeader: true,
        hostidsCsv: '',
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

    const cfg = { ...DEFAULTS, ...settings };
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [model, setModel] = useState({ rows: [], time_from: 0, time_to: 0 });

    const apiUrl = (window.ZABBIX_CONFIG && window.ZABBIX_CONFIG.api_url)
        ? window.ZABBIX_CONFIG.api_url
        : 'modules/react-dashboard/api.php';

    const refreshMs = useMemo(() => {
        const sec = Number(cfg.refreshSec) || 30;
        return Math.max(5, Math.min(3600, sec)) * 1000;
    }, [cfg.refreshSec]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams({
                action_type: 'timestate_data',
                hostids_csv: String(cfg.hostidsCsv || ''),
                item_key_search: String(cfg.itemKeySearch || ''),
                item_name_search: String(cfg.itemNameSearch || ''),
                lookback_hours: String(cfg.lookbackHours || 24),
                max_rows: String(cfg.maxRows || 20),
                history_points: String(cfg.historyPoints || 500),
                row_sort: String(cfg.rowSort || 0),
                merge_equal_states: String(cfg.mergeEqual ? 1 : 0),
                state_map: String(cfg.stateMap || '')
            });

            const response = await fetch(`${apiUrl}?${params.toString()}`);
            const payload = await response.json();

            if (!response.ok || payload.error) {
                throw new Error(payload.error || 'Unable to load timeline data.');
            }

            setModel({
                rows: Array.isArray(payload.rows) ? payload.rows : [],
                time_from: Number(payload.time_from || 0),
                time_to: Number(payload.time_to || 0)
            });
        }
        catch (fetchError) {
            setError(fetchError.message || 'Request failed.');
            setModel({ rows: [], time_from: 0, time_to: 0 });
        }
        finally {
            setLoading(false);
        }
    }, [
        apiUrl,
        cfg.hostidsCsv,
        cfg.itemKeySearch,
        cfg.itemNameSearch,
        cfg.lookbackHours,
        cfg.maxRows,
        cfg.historyPoints,
        cfg.rowSort,
        cfg.mergeEqual,
        cfg.stateMap
    ]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const timer = setInterval(fetchData, refreshMs);
        return () => clearInterval(timer);
    }, [fetchData, refreshMs]);

    const timeFrom = Number(model.time_from || 0);
    const timeTo = Number(model.time_to || 0);
    const range = Math.max(1, timeTo - timeFrom);

    const fmtDateTime = (ts) => {
        if (!ts) {
            return '-';
        }
        return new Date(ts * 1000).toLocaleString();
    };

    const renderTimeline = () => {
        if (loading && model.rows.length === 0) {
            return <div className="timestate-empty">Loading timeline...</div>;
        }

        if (error) {
            return <div className="timestate-error">{error}</div>;
        }

        if (model.rows.length === 0) {
            return <div className="timestate-empty">No timeline data for selected filters.</div>;
        }

        return (
            <div className="timestate-root">
                <div className="timestate-table">
                    {model.rows.map((row, rowIndex) => (
                        <div className="timestate-row" key={`${widgetId || 'row'}-${rowIndex}`}>
                            <div className="timestate-label" title={row.row_label || ''}>
                                {row.row_label || 'Row'}
                            </div>
                            <div className="timestate-lane">
                                {(row.segments || []).map((segment, segIndex) => {
                                    const from = Number(segment.t_from || 0);
                                    const to = Number(segment.t_to || 0);
                                    if (to <= from) {
                                        return null;
                                    }

                                    const left = ((from - timeFrom) / range) * 100;
                                    const width = ((to - from) / range) * 100;
                                    const label = segment.label || segment.state || 'State';
                                    const raw = segment.raw_value !== undefined && segment.raw_value !== null
                                        ? String(segment.raw_value)
                                        : '';

                                    return (
                                        <span
                                            key={`seg-${rowIndex}-${segIndex}`}
                                            className="timestate-segment"
                                            style={{
                                                left: `${Math.max(0, left)}%`,
                                                width: `${Math.max(0.4, width)}%`,
                                                background: segment.color || '#607D8B'
                                            }}
                                            title={`Value: ${raw || label}\nFrom: ${fmtDateTime(from)}\nTo: ${fmtDateTime(to)}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="timestate-axis">
                    <span>{fmtDateTime(timeFrom)}</span>
                    <span>{fmtDateTime(timeTo)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="widget-card">
            {cfg.showHeader && (
                <div className="widget-header">
                    <span className="widget-title">{cfg.name || 'Time State'}</span>
                    <div className="widget-actions">
                        <button className="btn-zbx" onClick={() => setEditMode((v) => !v)}>
                            {editMode ? 'Close' : 'Edit'}
                        </button>
                        <button className="btn-zbx btn-danger" onClick={remove}>✕</button>
                    </div>
                </div>
            )}

            <div className="widget-body widget-body--timestate">
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
                        <div className="editor-title">Time State</div>
                        <div className="editor-grid">
                            <div className="editor-label">Name</div>
                            <div className="editor-control">
                                <input type="text" value={cfg.name} onChange={(e) => updateSettings({ name: e.target.value })} />
                            </div>

                            <div className="editor-label">Show header</div>
                            <div className="editor-control">
                                <label>
                                    <input type="checkbox" checked={!!cfg.showHeader} onChange={(e) => updateSettings({ showHeader: e.target.checked })} /> Header
                                </label>
                            </div>

                            <div className="editor-label">Host IDs (CSV)</div>
                            <div className="editor-control">
                                <input
                                    type="text"
                                    value={cfg.hostidsCsv}
                                    onChange={(e) => updateSettings({ hostidsCsv: e.target.value })}
                                    placeholder="10105,10108"
                                />
                            </div>

                            <div className="editor-label">Item key filter</div>
                            <div className="editor-control">
                                <input type="text" value={cfg.itemKeySearch} onChange={(e) => updateSettings({ itemKeySearch: e.target.value })} />
                            </div>

                            <div className="editor-label">Item name filter</div>
                            <div className="editor-control">
                                <input type="text" value={cfg.itemNameSearch} onChange={(e) => updateSettings({ itemNameSearch: e.target.value })} />
                            </div>

                            <div className="editor-label">Lookback (hours)</div>
                            <div className="editor-control">
                                <input type="number" min="1" max="744" value={cfg.lookbackHours} onChange={(e) => updateSettings({ lookbackHours: Number(e.target.value) || 24 })} />
                            </div>

                            <div className="editor-label">Max rows</div>
                            <div className="editor-control">
                                <input type="number" min="1" max="200" value={cfg.maxRows} onChange={(e) => updateSettings({ maxRows: Number(e.target.value) || 20 })} />
                            </div>

                            <div className="editor-label">History points / item</div>
                            <div className="editor-control">
                                <input type="number" min="50" max="5000" value={cfg.historyPoints} onChange={(e) => updateSettings({ historyPoints: Number(e.target.value) || 500 })} />
                            </div>

                            <div className="editor-label">Row sorting</div>
                            <div className="editor-control">
                                <select value={cfg.rowSort} onChange={(e) => updateSettings({ rowSort: Number(e.target.value) })}>
                                    <option value="0">Name (A-Z)</option>
                                    <option value="1">Current status (Problem first)</option>
                                    <option value="2">Last change (most recent first)</option>
                                </select>
                            </div>

                            <div className="editor-label">Refresh (seconds)</div>
                            <div className="editor-control">
                                <input type="number" min="5" max="3600" value={cfg.refreshSec} onChange={(e) => updateSettings({ refreshSec: Number(e.target.value) || 30 })} />
                            </div>

                            <div className="editor-label">Merge equal states</div>
                            <div className="editor-control">
                                <label>
                                    <input type="checkbox" checked={Number(cfg.mergeEqual) === 1} onChange={(e) => updateSettings({ mergeEqual: e.target.checked ? 1 : 0 })} /> Enabled
                                </label>
                            </div>

                            <div className="editor-label">Value mappings</div>
                            <div className="editor-control">
                                <textarea
                                    className="editor-textarea"
                                    value={cfg.stateMap}
                                    onChange={(e) => updateSettings({ stateMap: e.target.value })}
                                    rows="3"
                                />
                            </div>
                        </div>

                        <div className="editor-footer">
                            <button className="btn-zbx" onClick={() => { setEditMode(false); fetchData(); }}>Done</button>
                        </div>
                    </div>
                ) : (
                    renderTimeline()
                )}
            </div>
        </div>
    );
};
