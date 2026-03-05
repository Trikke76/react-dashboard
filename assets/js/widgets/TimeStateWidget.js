window.TimeStateWidget = ({ remove, settings, updateSettings, widgetId, apiClient, globalData }) => {
    const { useState, useEffect, useMemo, useCallback } = React;

    const DEFAULT_STATE_MAP = 'value:1=OK|#2E7D32,value:0=Problem|#C62828';

    const DEFAULT_DATASET = {
        name: '',
        filter_type: 'key',
        filter_value: '',
        filter_exact: '0',
        max_rows: '20',
        lookback_hours: '24',
        history_points: '500',
        merge_equal_states: '1',
        merge_shorter_than: '0',
        null_gap_mode: '0',
        null_gap_backfill_first: '0',
        state_map: DEFAULT_STATE_MAP
    };

    const DEFAULTS = {
        type: 'TimeState',
        name: 'Time State',
        showHeader: true,
        groupid: '',
        hostidsCsv: '',
        itemidsCsv: '',
        filterMode: 'key',
        itemFilter: '',
        itemKeySearch: '',
        itemNameSearch: '',
        lookbackHours: 24,
        maxRows: 20,
        historyPoints: 500,
        rowSort: 0,
        rowGroupMode: 0,
        rowGroupCollapsed: 0,
        mergeEqual: 1,
        mergeShorterThan: 0,
        nullGapMode: 0,
        nullGapBackfillFirst: 0,
        refreshSec: 30,
        stateMap: DEFAULT_STATE_MAP,
        datasetsJson: ''
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

    const [hostPickerOpen, setHostPickerOpen] = useState(false);
    const [hostSearchTerm, setHostSearchTerm] = useState('');

    const [activeDatasetIdx, setActiveDatasetIdx] = useState(0);
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const parseCsvIds = (raw) => String(raw || '')
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter((v) => /^\d+$/.test(v));

    const clampInt = (value, min, max) => Math.max(min, Math.min(max, value));

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
                condition: '1',
                text: 'OK',
                color: '#2E7D32'
            }, {
                id: `m${Date.now()}_1`,
                type: 'value',
                condition: '0',
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

    const normalizeDataSet = (raw, fallbackFilter) => {
        const source = raw && typeof raw === 'object' ? raw : {};
        const legacyFilterType = String(source.item_name_search || '').trim() !== '' && String(source.item_key_search || '').trim() === ''
            ? 'name'
            : fallbackFilter.type;
        const rawType = String(source.filter_type || legacyFilterType || 'key').toLowerCase();
        const filterType = rawType === 'name' ? 'name' : 'key';
        const filterValue = String(
            source.filter_value
            || source.item_key_search
            || source.item_name_search
            || fallbackFilter.value
            || ''
        );

        return {
            name: String(source.name || ''),
            filter_type: filterType,
            filter_value: filterValue,
            filter_exact: String(source.filter_exact ?? '0') === '1' ? '1' : '0',
            max_rows: String(clampInt(Number(source.max_rows || 20) || 20, 1, 200)),
            lookback_hours: String(clampInt(Number(source.lookback_hours || 24) || 24, 1, 24 * 31)),
            history_points: String(clampInt(Number(source.history_points || 500) || 500, 10, 5000)),
            merge_equal_states: String(source.merge_equal_states ?? '1') === '0' ? '0' : '1',
            merge_shorter_than: String(clampInt(Number(source.merge_shorter_than || 0) || 0, 0, 3600)),
            null_gap_mode: String(source.null_gap_mode ?? '0') === '1' ? '1' : '0',
            null_gap_backfill_first: String(source.null_gap_backfill_first ?? '0') === '1' ? '1' : '0',
            state_map: String(source.state_map || cfg.stateMap || DEFAULT_STATE_MAP)
        };
    };

    const parseDataSets = useCallback(() => {
        const modernTypeRaw = String(cfg.filterMode || '').toLowerCase();
        const modernType = modernTypeRaw === 'name' ? 'name' : 'key';
        const modernValue = String(cfg.itemFilter || '').trim();
        const legacyType = String(cfg.itemNameSearch || '').trim() !== '' && String(cfg.itemKeySearch || '').trim() === '' ? 'name' : 'key';
        const legacyValue = String(cfg.itemKeySearch || cfg.itemNameSearch || '');
        const fallbackFilter = {
            type: modernValue !== '' ? modernType : legacyType,
            value: modernValue !== '' ? modernValue : legacyValue
        };

        const raw = String(cfg.datasetsJson || '').trim();
        if (raw === '') {
            return [normalizeDataSet({
                filter_type: fallbackFilter.type,
                filter_value: fallbackFilter.value,
                max_rows: cfg.maxRows,
                lookback_hours: cfg.lookbackHours,
                history_points: cfg.historyPoints,
                merge_equal_states: cfg.mergeEqual,
                merge_shorter_than: cfg.mergeShorterThan,
                null_gap_mode: cfg.nullGapMode,
                null_gap_backfill_first: cfg.nullGapBackfillFirst,
                state_map: cfg.stateMap || DEFAULT_STATE_MAP
            }, fallbackFilter)];
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [normalizeDataSet({}, fallbackFilter)];
            }
            const sets = parsed
                .filter((entry) => entry && typeof entry === 'object')
                .map((entry) => normalizeDataSet(entry, fallbackFilter));

            return sets.length > 0 ? sets : [normalizeDataSet({}, fallbackFilter)];
        }
        catch (_err) {
            return [normalizeDataSet({}, fallbackFilter)];
        }
    }, [cfg.datasetsJson, cfg.filterMode, cfg.itemFilter, cfg.itemKeySearch, cfg.itemNameSearch, cfg.maxRows, cfg.lookbackHours, cfg.historyPoints, cfg.mergeEqual, cfg.mergeShorterThan, cfg.nullGapMode, cfg.nullGapBackfillFirst, cfg.stateMap]);

    const serializeDataSets = (rows) => {
        const normalized = rows
            .filter((row) => row && typeof row === 'object')
            .map((row) => normalizeDataSet(row, { type: 'key', value: '' }));

        return JSON.stringify(normalized);
    };

    const datasets = useMemo(() => parseDataSets(), [parseDataSets]);
    const safeActiveDatasetIdx = Math.max(0, Math.min(activeDatasetIdx, datasets.length - 1));
    const activeDataset = datasets[safeActiveDatasetIdx] || DEFAULT_DATASET;

    const selectedHostIds = useMemo(() => new Set(parseCsvIds(cfg.hostidsCsv)), [cfg.hostidsCsv]);
    const selectedItemIds = useMemo(() => new Set(parseCsvIds(cfg.itemidsCsv)), [cfg.itemidsCsv]);

    const filteredHosts = useMemo(() => {
        const query = String(hostSearchTerm || '').trim().toLowerCase();
        if (query === '') {
            return hosts;
        }

        return hosts.filter((host) => String(host.name || '').toLowerCase().includes(query));
    }, [hosts, hostSearchTerm]);

    const selectedHostSummary = useMemo(() => {
        const selectedHosts = hosts
            .filter((host) => selectedHostIds.has(String(host.hostid)))
            .map((host) => String(host.name || ''))
            .filter(Boolean);

        if (selectedHosts.length === 0) {
            return selectedHostIds.size > 0 ? `${selectedHostIds.size} host(s) selected` : 'No hosts selected';
        }
        if (selectedHosts.length <= 3) {
            return selectedHosts.join(', ');
        }

        return `${selectedHosts.slice(0, 3).join(', ')} +${selectedHosts.length - 3}`;
    }, [hosts, selectedHostIds]);

    const filterSuggestionListId = useMemo(() => {
        const raw = String(widgetId || 'default');
        return `timestate-filter-${raw.replace(/[^a-zA-Z0-9_-]/g, '_')}-${safeActiveDatasetIdx}`;
    }, [widgetId, safeActiveDatasetIdx]);

    const filterTypeaheadValues = useMemo(() => {
        const values = itemSuggestions
            .map((item) => activeDataset.filter_type === 'name' ? String(item.name || '') : String(item.key_ || ''))
            .map((value) => value.trim())
            .filter(Boolean);

        return Array.from(new Set(values)).slice(0, 200);
    }, [itemSuggestions, activeDataset.filter_type]);

    useEffect(() => {
        if (safeActiveDatasetIdx !== activeDatasetIdx) {
            setActiveDatasetIdx(safeActiveDatasetIdx);
        }
    }, [safeActiveDatasetIdx, activeDatasetIdx]);

    useEffect(() => {
        const raw = String(cfg.datasetsJson || '').trim();
        if (raw !== '') {
            return;
        }

        const migrated = serializeDataSets(datasets);
        if (migrated) {
            updateSettings({ datasetsJson: migrated });
        }
    }, [cfg.datasetsJson, datasets, updateSettings]);

    const requestJson = useCallback(async (params) => {
        if (apiClient && typeof apiClient.requestJson === 'function') {
            return apiClient.requestJson(params);
        }
        throw new Error('API client unavailable');
    }, [apiClient]);

    const cachedJson = useCallback(async (params, ttlMs = 15000) => {
        if (apiClient && typeof apiClient.cachedRequest === 'function') {
            return apiClient.cachedRequest(params, ttlMs);
        }
        return requestJson(params);
    }, [apiClient, requestJson]);

    const refreshMs = useMemo(() => {
        const sec = Number(cfg.refreshSec) || 30;
        return Math.max(5, Math.min(3600, sec)) * 1000;
    }, [cfg.refreshSec]);

    const fetchGroups = useCallback(async () => {
        try {
            const payload = await cachedJson({ action_type: 'get_groups' }, 60000);
            setGroups(Array.isArray(payload) ? payload : []);
        }
        catch (_err) {
            setGroups([]);
        }
    }, [cachedJson]);

    const fetchHosts = useCallback(async (groupid) => {
        if (!groupid) {
            setHosts([]);
            return;
        }

        try {
            const payload = await cachedJson({ action_type: 'get_hosts_by_group', groupid }, 30000);
            setHosts(Array.isArray(payload) ? payload : []);
        }
        catch (_err) {
            setHosts([]);
        }
    }, [cachedJson]);

    const fetchItemSuggestions = useCallback(async () => {
        if (!cfg.hostidsCsv) {
            setItemSuggestions([]);
            return;
        }

        setItemsLoading(true);
        try {
            const payload = await cachedJson({
                action_type: 'timestate_items',
                hostids_csv: String(cfg.hostidsCsv || ''),
                filter_mode: String(activeDataset.filter_type || 'key'),
                item_filter: String(activeDataset.filter_value || ''),
                filter_exact: String(activeDataset.filter_exact || '0'),
                max_rows: String(Math.max(1, Number(activeDataset.max_rows || 20)))
            }, 6000);

            setItemSuggestions(Array.isArray(payload.items) ? payload.items : []);
        }
        catch (_err) {
            setItemSuggestions([]);
        }
        finally {
            setItemsLoading(false);
        }
    }, [cachedJson, cfg.hostidsCsv, activeDataset]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const payload = await requestJson({
                action_type: 'timestate_data',
                hostids_csv: String(cfg.hostidsCsv || ''),
                itemids_csv: String(cfg.itemidsCsv || ''),
                datasets_json: serializeDataSets(datasets),
                row_sort: String(cfg.rowSort || 0),
                row_group_mode: String(cfg.rowGroupMode || 0),
                row_group_collapsed: String(cfg.rowGroupCollapsed || 0)
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
    }, [requestJson, cfg.hostidsCsv, cfg.itemidsCsv, cfg.rowSort, cfg.rowGroupMode, cfg.rowGroupCollapsed, datasets]);

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
        if (globalData && Array.isArray(globalData.groups) && globalData.groups.length > 0) {
            setGroups(globalData.groups);
        }
    }, [globalData]);

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
    }, [editMode, cfg.hostidsCsv, activeDataset.filter_type, activeDataset.filter_value, activeDataset.filter_exact, activeDataset.max_rows, fetchItemSuggestions]);

    useEffect(() => {
        if (!editMode) {
            return;
        }
        setMappingRows(parseMappings(activeDataset.state_map || DEFAULT_STATE_MAP));
    }, [editMode, safeActiveDatasetIdx]);

    useEffect(() => {
        if ((Number(cfg.rowGroupMode) || 0) === 0) {
            setCollapsedGroups({});
            return;
        }

        const keyField = (Number(cfg.rowGroupMode) || 0) === 1 ? 'host_name' : 'dataset_name';
        const next = {};
        (model.rows || []).forEach((row) => {
            const key = String(row[keyField] || 'Other');
            if (!(key in collapsedGroups)) {
                next[key] = Number(cfg.rowGroupCollapsed || 0) === 1;
            }
            else {
                next[key] = collapsedGroups[key];
            }
        });
        setCollapsedGroups(next);
    }, [model.rows, cfg.rowGroupMode, cfg.rowGroupCollapsed]);

    const updateDatasets = (nextRows) => {
        updateSettings({ datasetsJson: serializeDataSets(nextRows), itemidsCsv: '' });
    };

    const updateDataset = (index, patch) => {
        const next = datasets.map((row, rowIdx) => (rowIdx === index ? { ...row, ...patch } : row));
        updateDatasets(next);
    };

    const addDataset = () => {
        const next = [...datasets, { ...DEFAULT_DATASET }];
        updateDatasets(next);
        setActiveDatasetIdx(next.length - 1);
    };

    const removeDataset = (index) => {
        const next = datasets.filter((_, rowIdx) => rowIdx !== index);
        updateDatasets(next.length > 0 ? next : [{ ...DEFAULT_DATASET }]);
        setActiveDatasetIdx((prev) => Math.max(0, Math.min(prev, Math.max(0, next.length - 1))));
    };

    const updateActiveDatasetMappings = (nextMappings) => {
        const state_map = serializeMappings(nextMappings);
        updateDataset(safeActiveDatasetIdx, { state_map });
    };

    const updateMapping = (id, patch) => {
        setMappingRows((prev) => {
            const next = prev.map((row) => (row.id === id ? { ...row, ...patch } : row));
            updateActiveDatasetMappings(next);
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
            updateActiveDatasetMappings(next);
            return next;
        });
    };

    const removeMapping = (id) => {
        setMappingRows((prev) => {
            const next = prev.filter((row) => row.id !== id);
            updateActiveDatasetMappings(next);
            return next;
        });
    };

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

    const selectAllVisibleHosts = () => {
        const next = new Set(selectedHostIds);
        filteredHosts.forEach((host) => next.add(String(host.hostid)));
        const hostidsCsv = Array.from(next).sort((a, b) => Number(a) - Number(b)).join(',');
        updateSettings({ hostidsCsv, itemidsCsv: '' });
    };

    const clearHostSelection = () => updateSettings({ hostidsCsv: '', itemidsCsv: '' });

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

    const toggleGroup = (name) => {
        setCollapsedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
    };

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

    const timeFrom = Number(model.time_from || 0);
    const timeTo = Number(model.time_to || 0);
    const range = Math.max(1, timeTo - timeFrom);

    const fmtDateTime = (ts) => {
        if (!ts) {
            return '-';
        }
        return new Date(ts * 1000).toLocaleString();
    };

    const renderRow = (row, rowIndex) => (
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
    );

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

        const rowGroupMode = Number(cfg.rowGroupMode || 0);

        return (
            <div className="timestate-root">
                <div className="timestate-table">
                    {rowGroupMode === 0 && model.rows.map((row, rowIndex) => renderRow(row, rowIndex))}

                    {rowGroupMode !== 0 && (() => {
                        const keyField = rowGroupMode === 1 ? 'host_name' : 'dataset_name';
                        const grouped = model.rows.reduce((acc, row) => {
                            const key = String(row[keyField] || 'Other');
                            if (!acc[key]) {
                                acc[key] = [];
                            }
                            acc[key].push(row);
                            return acc;
                        }, {});

                        return Object.keys(grouped).sort((a, b) => a.localeCompare(b)).map((groupKey) => {
                            const isCollapsed = !!collapsedGroups[groupKey];
                            return (
                                <div className="timestate-group" key={`group-${groupKey}`}>
                                    <button
                                        type="button"
                                        className="timestate-group-header"
                                        onClick={() => toggleGroup(groupKey)}
                                    >
                                        <span>{isCollapsed ? '▸' : '▾'}</span>
                                        <span>{groupKey}</span>
                                        <span className="editor-subtle">{grouped[groupKey].length} row(s)</span>
                                    </button>
                                    {!isCollapsed && grouped[groupKey].map((row, idx) => renderRow(row, `${groupKey}-${idx}`))}
                                </div>
                            );
                        });
                    })()}
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
                                        setHostPickerOpen(false);
                                        setHostSearchTerm('');
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
                                <div className="editor-inline-actions">
                                    <button
                                        className="btn-zbx"
                                        type="button"
                                        disabled={!cfg.groupid || hosts.length === 0}
                                        onClick={() => setHostPickerOpen(true)}
                                    >
                                        Select hosts
                                    </button>
                                    <button
                                        className="btn-zbx"
                                        type="button"
                                        disabled={selectedHostIds.size === 0}
                                        onClick={clearHostSelection}
                                    >
                                        Clear
                                    </button>
                                    <span className="editor-subtle">
                                        Selected: {selectedHostIds.size}/{hosts.length}
                                    </span>
                                </div>
                                <div className="editor-subtle">{selectedHostSummary}</div>
                            </div>

                            <div className="editor-label">Data sources</div>
                            <div className="editor-control">
                                <div className="editor-datasets">
                                    {datasets.map((dataSet, idx) => (
                                        <div key={`dataset-${idx}`} className={`editor-dataset ${idx === safeActiveDatasetIdx ? 'is-active' : ''}`}>
                                            <div className="editor-inline-actions">
                                                <strong>Data source #{idx + 1}</strong>
                                                <button className="btn-zbx" type="button" onClick={() => setActiveDatasetIdx(idx)}>Use</button>
                                                <button className="btn-zbx btn-danger" type="button" onClick={() => removeDataset(idx)} disabled={datasets.length <= 1}>✕</button>
                                            </div>

                                            <div className="editor-dataset-grid">
                                                <label>
                                                    <span className="editor-subtle">Name</span>
                                                    <input type="text" value={dataSet.name} onChange={(e) => updateDataset(idx, { name: e.target.value })} />
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">Filter type</span>
                                                    <select value={dataSet.filter_type} onChange={(e) => updateDataset(idx, { filter_type: e.target.value, filter_exact: '0' })}>
                                                        <option value="key">Item key</option>
                                                        <option value="name">Item name</option>
                                                    </select>
                                                </label>

                                                <label className="is-full">
                                                    <span className="editor-subtle">Filter value</span>
                                                    <input
                                                        type="text"
                                                        value={dataSet.filter_value}
                                                        list={idx === safeActiveDatasetIdx ? filterSuggestionListId : undefined}
                                                        placeholder={dataSet.filter_type === 'key' ? 'bv. zabbix[*' : 'bv. CPU'}
                                                        onChange={(e) => updateDataset(idx, { filter_value: e.target.value, filter_exact: '0' })}
                                                    />
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">Max rows</span>
                                                    <input type="number" min="1" max="200" value={dataSet.max_rows} onChange={(e) => updateDataset(idx, { max_rows: String(clampInt(Number(e.target.value) || 20, 1, 200)) })} />
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">Lookback (hours)</span>
                                                    <input type="number" min="1" max="744" value={dataSet.lookback_hours} onChange={(e) => updateDataset(idx, { lookback_hours: String(clampInt(Number(e.target.value) || 24, 1, 744)) })} />
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">History points / item</span>
                                                    <input type="number" min="10" max="5000" value={dataSet.history_points} onChange={(e) => updateDataset(idx, { history_points: String(clampInt(Number(e.target.value) || 500, 10, 5000)) })} />
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">Merge equal states</span>
                                                    <select value={dataSet.merge_equal_states} onChange={(e) => updateDataset(idx, { merge_equal_states: e.target.value })}>
                                                        <option value="1">Yes</option>
                                                        <option value="0">No</option>
                                                    </select>
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">Merge short (&lt; sec)</span>
                                                    <input type="number" min="0" max="3600" value={dataSet.merge_shorter_than} onChange={(e) => updateDataset(idx, { merge_shorter_than: String(clampInt(Number(e.target.value) || 0, 0, 3600)) })} />
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">Null-gap mode</span>
                                                    <select value={dataSet.null_gap_mode} onChange={(e) => updateDataset(idx, { null_gap_mode: e.target.value })}>
                                                        <option value="0">Disconnected</option>
                                                        <option value="1">Connected</option>
                                                    </select>
                                                </label>

                                                <label>
                                                    <span className="editor-subtle">Backfill from first</span>
                                                    <select value={dataSet.null_gap_backfill_first} onChange={(e) => updateDataset(idx, { null_gap_backfill_first: e.target.value })}>
                                                        <option value="0">No</option>
                                                        <option value="1">Yes</option>
                                                    </select>
                                                </label>
                                            </div>
                                        </div>
                                    ))}

                                    <button className="btn-zbx" type="button" onClick={addDataset}>+ Add data source</button>
                                </div>
                                <datalist id={filterSuggestionListId}>
                                    {filterTypeaheadValues.map((value) => (
                                        <option key={value} value={value} />
                                    ))}
                                </datalist>
                                <div className="editor-subtle">Wildcards ondersteund: `*` en `?`.</div>
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

                            <div className="editor-label">Value mappings</div>
                            <div className="editor-control">
                                <div className="editor-subtle">Editing mappings for data source #{safeActiveDatasetIdx + 1}</div>
                                <div className="editor-mapping-list">
                                    {mappingRows.map((row) => (
                                        <div key={row.id}>
                                            <div className="editor-mapping-row">
                                                <select value={row.type} onChange={(e) => updateMapping(row.id, { type: e.target.value })}>
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
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="editor-advanced">
                            <div className="editor-advanced-title">Advanced configuration</div>
                            <div className="editor-grid">
                                <div className="editor-label">Row sorting</div>
                                <div className="editor-control">
                                    <select value={cfg.rowSort} onChange={(e) => updateSettings({ rowSort: Number(e.target.value) })}>
                                        <option value="0">Name (A-Z)</option>
                                        <option value="1">Current status (Problem first)</option>
                                        <option value="2">Last change (most recent first)</option>
                                    </select>
                                </div>

                                <div className="editor-label">Row grouping</div>
                                <div className="editor-control">
                                    <select value={cfg.rowGroupMode} onChange={(e) => updateSettings({ rowGroupMode: Number(e.target.value) })}>
                                        <option value="0">None</option>
                                        <option value="1">Host</option>
                                        <option value="2">Data source</option>
                                    </select>
                                </div>

                                <div className="editor-label">Groups collapsed by default</div>
                                <div className="editor-control">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={Number(cfg.rowGroupCollapsed) === 1}
                                            onChange={(e) => updateSettings({ rowGroupCollapsed: e.target.checked ? 1 : 0 })}
                                        /> Enabled
                                    </label>
                                </div>

                                <div className="editor-label">Refresh (seconds)</div>
                                <div className="editor-control">
                                    <input type="number" min="5" max="3600" value={cfg.refreshSec} onChange={(e) => updateSettings({ refreshSec: Number(e.target.value) || 30 })} />
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

            {editMode && hostPickerOpen && (
                <div className="editor-modal-backdrop" onClick={() => setHostPickerOpen(false)}>
                    <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="editor-modal-header">
                            <strong>Select hosts</strong>
                            <button className="btn-zbx btn-danger" type="button" onClick={() => setHostPickerOpen(false)}>✕</button>
                        </div>

                        <div className="editor-inline-actions" style={{ marginBottom: '8px' }}>
                            <input
                                type="text"
                                value={hostSearchTerm}
                                onChange={(e) => setHostSearchTerm(e.target.value)}
                                placeholder="Filter hosts..."
                            />
                            <button className="btn-zbx" type="button" onClick={selectAllVisibleHosts} disabled={filteredHosts.length === 0}>Select visible</button>
                            <button className="btn-zbx" type="button" onClick={clearHostSelection} disabled={selectedHostIds.size === 0}>Clear</button>
                        </div>

                        <div className="editor-host-list editor-host-list--picker">
                            {filteredHosts.length === 0 && <div className="editor-subtle">No hosts match this filter.</div>}
                            {filteredHosts.map((host) => (
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

                        <div className="editor-footer" style={{ marginTop: '10px' }}>
                            <button className="btn-zbx" type="button" onClick={() => setHostPickerOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
