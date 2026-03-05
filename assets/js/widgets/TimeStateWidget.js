window.TimeStateWidget = ({ remove, settings, updateSettings, widgetId }) => {
    const { useState, useEffect, useMemo, useCallback } = React;

    const DEFAULTS = {
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

    const cfg = { ...DEFAULTS, ...settings };
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [model, setModel] = useState({ rows: [], time_from: 0, time_to: 0 });

    const [groups, setGroups] = useState([]);
    const [hosts, setHosts] = useState([]);
    const [itemSuggestions, setItemSuggestions] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [mappingRows, setMappingRows] = useState([]);

    const parseCsvIds = (raw) => String(raw || '')
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter((v) => /^\d+$/.test(v));

    const parseMappings = (raw) => {
        const chunks = String(raw || '')
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

        const rows = chunks.map((chunk, idx) => {
            const equalIdx = chunk.indexOf('=');
            const left = equalIdx >= 0 ? chunk.slice(0, equalIdx).trim() : chunk.trim();
            const right = equalIdx >= 0 ? chunk.slice(equalIdx + 1).trim() : '';
            const colonIdx = left.indexOf(':');
            const type = colonIdx >= 0 ? left.slice(0, colonIdx).trim() : 'value';
            const condition = colonIdx >= 0 ? left.slice(colonIdx + 1).trim() : left;
            const [text, color] = right.split('|');

            return {
                id: `m${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
                type: type || 'value',
                condition: condition || '',
                text: (text || '').trim(),
                color: (color || '').trim()
            };
        });

        if (rows.length === 0) {
            return [{
                id: `m${Date.now()}_0`,
                type: 'value',
                condition: '0',
                text: 'OK',
                color: '#2E7D32'
            }, {
                id: `m${Date.now()}_1`,
                type: 'value',
                condition: '1',
                text: 'Problem',
                color: '#C62828'
            }];
        }

        return rows;
    };

    const serializeMappings = (rows) => rows
        .map((row) => {
            const type = String(row.type || 'value').trim();
            const condition = String(row.condition || '').trim();
            const text = String(row.text || '').trim();
            const color = String(row.color || '').trim();
            if (condition === '') {
                return '';
            }
            const right = color ? `${text}|${color}` : text;
            return `${type}:${condition}=${right}`;
        })
        .filter(Boolean)
        .join(',');

    const mappingConditionPlaceholder = (type) => {
        if (type === 'range') {
            return '80..100';
        }
        if (type === 'regex') {
            return '/^ERR.*/';
        }
        if (type === 'special') {
            return 'null';
        }
        return '1';
    };

    const mappingConditionHint = (type) => {
        if (type === 'range') {
            return 'Range: min..max (bv. 80..100)';
        }
        if (type === 'regex') {
            return 'Regex: /pattern/ (bv. /^ERR.*/)';
        }
        if (type === 'special') {
            return 'Special: null, empty, nan';
        }
        return 'Exacte waarde (bv. 0 of 1)';
    };

    const selectedHostIds = useMemo(() => new Set(parseCsvIds(cfg.hostidsCsv)), [cfg.hostidsCsv]);
    const selectedItemIds = useMemo(() => new Set(parseCsvIds(cfg.itemidsCsv)), [cfg.itemidsCsv]);

    const apiCandidates = useMemo(() => {
        const zbxConfig = window.ZABBIX_CONFIG || {};
        const moduleBase = String(zbxConfig.module_base || '').replace(/\/+$/, '');
        return Array.from(new Set([
            zbxConfig.api_url,
            zbxConfig.api_fallback_url,
            `${moduleBase}/modules/react-dashboard/modules/react-dashboard/api.php`,
            `${moduleBase}/modules/react-dashboard/api.php`,
            'modules/react-dashboard/modules/react-dashboard/api.php',
            'modules/react-dashboard/api.php',
            '/modules/react-dashboard/modules/react-dashboard/api.php',
            '/modules/react-dashboard/api.php'
        ].filter(Boolean)));
    }, []);

    const requestJson = useCallback(async (paramsInput) => {
        const params = paramsInput instanceof URLSearchParams
            ? paramsInput
            : new URLSearchParams(paramsInput);

        let lastError = null;

        for (const base of apiCandidates) {
            const url = `${base}?${params.toString()}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        Accept: 'application/json'
                    }
                });

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
            catch (requestError) {
                lastError = requestError;
            }
        }

        throw (lastError || new Error('API request failed'));
    }, [apiCandidates]);

    const refreshMs = useMemo(() => {
        const sec = Number(cfg.refreshSec) || 30;
        return Math.max(5, Math.min(3600, sec)) * 1000;
    }, [cfg.refreshSec]);

    const fetchGroups = useCallback(async () => {
        try {
            const payload = await requestJson({ action_type: 'get_groups' });
            setGroups(Array.isArray(payload) ? payload : []);
        }
        catch (_err) {
            setGroups([]);
        }
    }, [requestJson]);

    const fetchHosts = useCallback(async (groupid) => {
        if (!groupid) {
            setHosts([]);
            return;
        }

        try {
            const payload = await requestJson({ action_type: 'get_hosts_by_group', groupid });
            setHosts(Array.isArray(payload) ? payload : []);
        }
        catch (_err) {
            setHosts([]);
        }
    }, [requestJson]);

    const fetchItemSuggestions = useCallback(async () => {
        if (!cfg.hostidsCsv) {
            setItemSuggestions([]);
            return;
        }

        setItemsLoading(true);
        try {
            const payload = await requestJson({
                action_type: 'timestate_items',
                hostids_csv: String(cfg.hostidsCsv || ''),
                item_key_search: String(cfg.itemKeySearch || ''),
                item_name_search: String(cfg.itemNameSearch || ''),
                max_rows: String(Math.max(1, Number(cfg.maxRows || 20)))
            });

            setItemSuggestions(Array.isArray(payload.items) ? payload.items : []);
        }
        catch (_err) {
            setItemSuggestions([]);
        }
        finally {
            setItemsLoading(false);
        }
    }, [requestJson, cfg.hostidsCsv, cfg.itemKeySearch, cfg.itemNameSearch, cfg.maxRows]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const payload = await requestJson({
                action_type: 'timestate_data',
                hostids_csv: String(cfg.hostidsCsv || ''),
                itemids_csv: String(cfg.itemidsCsv || ''),
                item_key_search: String(cfg.itemKeySearch || ''),
                item_name_search: String(cfg.itemNameSearch || ''),
                lookback_hours: String(cfg.lookbackHours || 24),
                max_rows: String(cfg.maxRows || 20),
                history_points: String(cfg.historyPoints || 500),
                row_sort: String(cfg.rowSort || 0),
                merge_equal_states: String(cfg.mergeEqual ? 1 : 0),
                state_map: String(cfg.stateMap || '')
            });

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
        requestJson,
        cfg.hostidsCsv,
        cfg.itemidsCsv,
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

    useEffect(() => {
        if (!editMode) {
            return;
        }

        fetchGroups();
        if (cfg.groupid) {
            fetchHosts(cfg.groupid);
        }
    }, [editMode, cfg.groupid, fetchGroups, fetchHosts]);

    useEffect(() => {
        if (!editMode) {
            return;
        }
        if (!cfg.hostidsCsv) {
            setItemSuggestions([]);
            return;
        }

        const timer = setTimeout(() => {
            fetchItemSuggestions();
        }, 350);

        return () => clearTimeout(timer);
    }, [editMode, cfg.hostidsCsv, cfg.itemKeySearch, cfg.itemNameSearch, cfg.maxRows, fetchItemSuggestions]);

    useEffect(() => {
        if (!editMode) {
            return;
        }
        setMappingRows(parseMappings(cfg.stateMap));
    }, [editMode, cfg.stateMap]);

    const setIdsCsv = (key, idsSet) => {
        const sorted = Array.from(idsSet).sort((a, b) => Number(a) - Number(b));
        updateSettings({ [key]: sorted.join(',') });
    };

    const toggleHost = (hostid) => {
        const next = new Set(selectedHostIds);
        if (next.has(hostid)) {
            next.delete(hostid);
        }
        else {
            next.add(hostid);
        }

        const hostidsCsv = Array.from(next).sort((a, b) => Number(a) - Number(b)).join(',');
        updateSettings({ hostidsCsv, itemidsCsv: '' });
    };

    const toggleItem = (itemid) => {
        const next = new Set(selectedItemIds);
        if (next.has(itemid)) {
            next.delete(itemid);
        }
        else {
            next.add(itemid);
        }
        setIdsCsv('itemidsCsv', next);
    };

    const clearItemSelection = () => updateSettings({ itemidsCsv: '' });

    const selectAllFoundItems = () => {
        const next = new Set(selectedItemIds);
        itemSuggestions.forEach((item) => next.add(String(item.itemid)));
        setIdsCsv('itemidsCsv', next);
    };

    const updateMapping = (id, patch) => {
        setMappingRows((prev) => {
            const next = prev.map((row) => (row.id === id ? { ...row, ...patch } : row));
            updateSettings({ stateMap: serializeMappings(next) });
            return next;
        });
    };

    const addMapping = () => {
        setMappingRows((prev) => {
            const next = [
                ...prev,
                {
                    id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    type: 'value',
                    condition: '',
                    text: '',
                    color: '#607D8B'
                }
            ];
            updateSettings({ stateMap: serializeMappings(next) });
            return next;
        });
    };

    const removeMapping = (id) => {
        setMappingRows((prev) => {
            const next = prev.filter((row) => row.id !== id);
            updateSettings({ stateMap: serializeMappings(next) });
            return next;
        });
    };

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

                            <div className="editor-label">Host group</div>
                            <div className="editor-control">
                                <select
                                    value={cfg.groupid || ''}
                                    onChange={(e) => {
                                        const groupid = e.target.value;
                                        updateSettings({ groupid, hostidsCsv: '', itemidsCsv: '' });
                                        fetchHosts(groupid);
                                    }}
                                >
                                    <option value="">-- Select group --</option>
                                    {groups.map((group) => (
                                        <option key={group.groupid} value={group.groupid}>{group.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="editor-label">Hosts</div>
                            <div className="editor-control">
                                <div className="editor-host-list">
                                    {hosts.length === 0 && <div className="editor-subtle">No hosts loaded for this group.</div>}
                                    {hosts.map((host) => (
                                        <label key={host.hostid} className="editor-host-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedHostIds.has(String(host.hostid))}
                                                onChange={() => toggleHost(String(host.hostid))}
                                            />
                                            <span>{host.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="editor-label">Item key filter</div>
                            <div className="editor-control">
                                <input type="text" value={cfg.itemKeySearch} onChange={(e) => updateSettings({ itemKeySearch: e.target.value })} />
                            </div>

                            <div className="editor-label">Item name filter</div>
                            <div className="editor-control">
                                <input type="text" value={cfg.itemNameSearch} onChange={(e) => updateSettings({ itemNameSearch: e.target.value })} />
                            </div>

                            <div className="editor-label">Find items</div>
                            <div className="editor-control editor-inline-actions">
                                <button className="btn-zbx" type="button" onClick={fetchItemSuggestions}>
                                    {itemsLoading ? 'Searching...' : 'Search'}
                                </button>
                                <button className="btn-zbx" type="button" onClick={selectAllFoundItems} disabled={itemSuggestions.length === 0}>Select all found</button>
                                <button className="btn-zbx" type="button" onClick={clearItemSelection}>Clear selected</button>
                                <span className="editor-subtle">Selected: {selectedItemIds.size}</span>
                            </div>

                            <div className="editor-label">Item matches</div>
                            <div className="editor-control">
                                <div className="editor-item-list">
                                    {itemSuggestions.length === 0 && <div className="editor-subtle">Type filter and wait, or click Search.</div>}
                                    {itemSuggestions.map((item) => (
                                        <label key={item.itemid} className="editor-item-entry">
                                            <input
                                                type="checkbox"
                                                checked={selectedItemIds.has(String(item.itemid))}
                                                onChange={() => toggleItem(String(item.itemid))}
                                            />
                                            <span title={item.label}>{item.label}</span>
                                        </label>
                                    ))}
                                </div>
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
                                <div className="editor-mapping-list">
                                    {mappingRows.map((row) => (
                                        <div key={row.id}>
                                            <div className="editor-mapping-row">
                                                <select
                                                    value={row.type}
                                                    onChange={(e) => updateMapping(row.id, { type: e.target.value })}
                                                >
                                                    <option value="value">value</option>
                                                    <option value="range">range</option>
                                                    <option value="regex">regex</option>
                                                    <option value="special">special</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={row.condition}
                                                    onChange={(e) => updateMapping(row.id, { condition: e.target.value })}
                                                    placeholder={mappingConditionPlaceholder(row.type)}
                                                />
                                                <input
                                                    type="text"
                                                    value={row.text}
                                                    onChange={(e) => updateMapping(row.id, { text: e.target.value })}
                                                    placeholder="label"
                                                />
                                                <input
                                                    type="color"
                                                    value={row.color || '#607D8B'}
                                                    onChange={(e) => updateMapping(row.id, { color: e.target.value })}
                                                />
                                                <button className="btn-zbx btn-danger" type="button" onClick={() => removeMapping(row.id)}>✕</button>
                                            </div>
                                            <div className="editor-subtle">{mappingConditionHint(row.type)}</div>
                                        </div>
                                    ))}
                                    <div className="editor-inline-actions">
                                        <button className="btn-zbx" type="button" onClick={addMapping}>Add mapping</button>
                                        <span className="editor-subtle">{cfg.stateMap}</span>
                                    </div>
                                </div>
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
