window.ReactDashboardTimeSeriesWidget = (() => {
    const DEFAULTS = {
        type: 'TimeSeries',
        name: 'Time series',
        showHeader: true,
        groupid: '',
        hostidsCsv: '',
        refreshSec: 30,
        lookbackHours: 24,
        historyPoints: 500,
        legendMode: 'list',
        showGrid: true,
        stackMode: 'off',
        lineInterpolation: 'linear',
        thresholdsJson: '',
        yMin: '',
        yMax: '',
        seriesJson: ''
    };

    const MAX_SERIES = 12;
    const DEFAULT_SERIES_COLORS = [
        '#5794F2', '#73BF69', '#FADE2A', '#FF9830', '#E24D42', '#B877D9',
        '#56D2C6', '#F2495C', '#8AB8FF', '#7EE787', '#F6C25B', '#A3AED0'
    ];

    const clampInt = (value, fallback, min, max) => {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return fallback;
        }
        return Math.max(min, Math.min(max, Math.round(num)));
    };

    const toText = (value, fallback, maxLen = 120) => {
        if (typeof value !== 'string') {
            return fallback;
        }
        return value.slice(0, maxLen);
    };

    const toBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

    const toHex = (value, fallback) => {
        const raw = String(value || '').trim().toUpperCase();
        if (/^#[0-9A-F]{6}$/.test(raw)) {
            return raw;
        }
        return fallback;
    };

    const parseIdsCsv = (raw) => Array.from(new Set(
        String(raw || '')
            .split(/[\s,]+/)
            .map((token) => token.trim())
            .filter((token) => /^\d+$/.test(token))
    ));

    const parseThresholds = (raw) => {
        const text = String(raw || '').trim();
        if (text === '') {
            return [];
        }
        try {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .slice(0, 12)
                .map((entry, idx) => {
                    const source = (entry && typeof entry === 'object') ? entry : {};
                    const value = Number(source.value);
                    if (!Number.isFinite(value)) {
                        return null;
                    }
                    const color = toHex(source.color, '#E24D42');
                    const fill = clampInt(source.fill, 12, 0, 100);
                    const label = toText(source.label, `T${idx + 1}`, 4).trim();
                    return {
                        id: String(source.id || `thr_${idx + 1}`),
                        value,
                        color,
                        fill,
                        label: label || `T${idx + 1}`
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.value - b.value);
        }
        catch (_err) {
            return [];
        }
    };

    const serializeThresholds = (rows) => JSON.stringify(
        (Array.isArray(rows) ? rows : [])
            .slice(0, 12)
            .map((row, idx) => {
                const source = (row && typeof row === 'object') ? row : {};
                const value = Number(source.value);
                if (!Number.isFinite(value)) {
                    return null;
                }
                return {
                    id: String(source.id || `thr_${idx + 1}`),
                    value,
                    color: toHex(source.color, '#E24D42'),
                    fill: clampInt(source.fill, 12, 0, 100),
                    label: toText(source.label, `T${idx + 1}`, 4).trim() || `T${idx + 1}`
                };
            })
            .filter(Boolean)
    );

    const safeSeriesId = (value, idx) => {
        const raw = String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
        return raw || `series_${idx + 1}`;
    };

    const normalizeSeriesRow = (raw, idx) => {
        const source = (raw && typeof raw === 'object') ? raw : {};
        const drawStyle = ['line', 'points', 'bars'].includes(source.drawStyle) ? source.drawStyle : 'line';
        const axis = String(source.axis || '').toLowerCase() === 'right' ? 'right' : 'left';
        const lineWidthRaw = Number(source.lineWidth);
        const lineWidth = Number.isFinite(lineWidthRaw) && lineWidthRaw > 0
            ? clampInt(lineWidthRaw, 2, 1, 8)
            : 2;

        return {
            id: safeSeriesId(source.id, idx),
            label: toText(source.label, '', 120),
            itemid: /^\d+$/.test(String(source.itemid || '').trim()) ? String(source.itemid).trim() : '',
            hostid: /^\d+$/.test(String(source.hostid || '').trim()) ? String(source.hostid).trim() : '',
            itemName: toText(source.itemName, '', 255),
            itemKey: toText(source.itemKey, '', 255),
            host: toText(source.host, '', 120),
            filterType: source.filterType === 'name' ? 'name' : 'key',
            filterValue: toText(source.filterValue, '', 255),
            color: toHex(source.color, DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length]),
            axis,
            showInLegend: source.showInLegend !== false,
            drawStyle,
            lineWidth,
            fillOpacity: clampInt(source.fillOpacity, 0, 0, 100),
            showPercentileLine: toBoolean(source.showPercentileLine, false),
            percentileValue: clampInt(source.percentileValue, 95, 0, 100)
        };
    };

    const parseSeries = (raw) => {
        const text = String(raw || '').trim();
        if (text === '') {
            return [];
        }

        try {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.slice(0, MAX_SERIES).map((row, idx) => normalizeSeriesRow(row, idx));
        }
        catch (_err) {
            return [];
        }
    };

    const serializeSeries = (rows) => JSON.stringify(
        (Array.isArray(rows) ? rows : [])
            .slice(0, MAX_SERIES)
            .map((row, idx) => normalizeSeriesRow(row, idx))
    );

    const sanitizeSettings = (raw) => {
        const base = (raw && typeof raw === 'object') ? raw : {};
        const legendMode = ['hidden', 'list', 'table'].includes(base.legendMode) ? base.legendMode : DEFAULTS.legendMode;
        const stackMode = ['off', 'normal', 'percent'].includes(base.stackMode) ? base.stackMode : DEFAULTS.stackMode;
        const lineInterpolation = ['linear', 'smooth', 'step'].includes(base.lineInterpolation) ? base.lineInterpolation : DEFAULTS.lineInterpolation;
        const yMin = String(base.yMin ?? '').trim();
        const yMax = String(base.yMax ?? '').trim();

        return {
            type: 'TimeSeries',
            name: toText(base.name, DEFAULTS.name, 120),
            showHeader: toBoolean(base.showHeader, DEFAULTS.showHeader),
            groupid: /^\d+$/.test(String(base.groupid || '').trim()) ? String(base.groupid).trim() : '',
            hostidsCsv: parseIdsCsv(base.hostidsCsv).join(','),
            refreshSec: clampInt(base.refreshSec, DEFAULTS.refreshSec, 5, 3600),
            lookbackHours: clampInt(base.lookbackHours, DEFAULTS.lookbackHours, 1, 24 * 14),
            historyPoints: clampInt(base.historyPoints, DEFAULTS.historyPoints, 50, 2000),
            legendMode,
            showGrid: toBoolean(base.showGrid, DEFAULTS.showGrid),
            stackMode,
            lineInterpolation,
            thresholdsJson: serializeThresholds(parseThresholds(base.thresholdsJson)),
            yMin: yMin.slice(0, 32),
            yMax: yMax.slice(0, 32),
            seriesJson: serializeSeries(parseSeries(base.seriesJson))
        };
    };

    const formatLegendNumber = (value) => {
        if (!Number.isFinite(value)) {
            return '--';
        }
        if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
            return value.toExponential(2);
        }
        return value.toFixed(2).replace(/\.00$/, '');
    };

    const parseOptionalNumber = (value) => {
        const raw = String(value ?? '').trim();
        if (raw === '') {
            return null;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const buildLinePath = (points, scaleX, scaleY, interpolation = 'linear') => {
        if (!Array.isArray(points) || points.length === 0) {
            return '';
        }

        if (interpolation === 'step') {
            const firstX = scaleX(points[0].t).toFixed(2);
            const firstY = scaleY(points[0].v).toFixed(2);
            let d = `M ${firstX} ${firstY}`;
            for (let idx = 1; idx < points.length; idx += 1) {
                const x = scaleX(points[idx].t).toFixed(2);
                const y = scaleY(points[idx].v).toFixed(2);
                d += ` L ${x} ${scaleY(points[idx - 1].v).toFixed(2)} L ${x} ${y}`;
            }
            return d;
        }

        if (interpolation === 'smooth' && points.length > 2) {
            const coords = points.map((point) => ({ x: scaleX(point.t), y: scaleY(point.v) }));
            let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
            for (let idx = 0; idx < coords.length - 1; idx += 1) {
                const prev = coords[Math.max(0, idx - 1)];
                const cur = coords[idx];
                const next = coords[idx + 1];
                const next2 = coords[Math.min(coords.length - 1, idx + 2)];
                const cp1x = cur.x + ((next.x - prev.x) / 6);
                const cp1y = cur.y + ((next.y - prev.y) / 6);
                const cp2x = next.x - ((next2.x - cur.x) / 6);
                const cp2y = next.y - ((next2.y - cur.y) / 6);
                d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
            }
            return d;
        }

        return points
            .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(point.t).toFixed(2)} ${scaleY(point.v).toFixed(2)}`)
            .join(' ');
    };

    const buildAreaPath = (points, scaleX, scaleY, baseY, interpolation = 'linear') => {
        if (!Array.isArray(points) || points.length === 0) {
            return '';
        }
        const line = buildLinePath(points, scaleX, scaleY, interpolation);
        if (line === '') {
            return '';
        }
        const firstX = scaleX(points[0].t).toFixed(2);
        const lastX = scaleX(points[points.length - 1].t).toFixed(2);
        const base = baseY.toFixed(2);
        return `${line} L ${lastX} ${base} L ${firstX} ${base} Z`;
    };

    const buildStackAreaPath = (points, scaleX, scaleY) => {
        if (!Array.isArray(points) || points.length === 0) {
            return '';
        }
        const valid = points.filter((point) => Number.isFinite(point.v) && Number.isFinite(point.baseV));
        if (valid.length === 0) {
            return '';
        }

        const top = valid.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(point.t).toFixed(2)} ${scaleY(point.v).toFixed(2)}`).join(' ');
        const base = valid
            .slice()
            .reverse()
            .map((point) => `L ${scaleX(point.t).toFixed(2)} ${scaleY(point.baseV).toFixed(2)}`)
            .join(' ');
        return `${top} ${base} Z`;
    };

    const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

    const findNearestPoint = (points, timeValue) => {
        if (!Array.isArray(points) || points.length === 0 || !Number.isFinite(timeValue)) {
            return null;
        }

        let low = 0;
        let high = points.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midTime = Number(points[mid].t);
            if (midTime < timeValue) {
                low = mid + 1;
            }
            else if (midTime > timeValue) {
                high = mid - 1;
            }
            else {
                return points[mid];
            }
        }

        const left = points[Math.max(0, high)];
        const right = points[Math.min(points.length - 1, low)];
        if (!left) {
            return right || null;
        }
        if (!right) {
            return left || null;
        }
        return Math.abs(Number(left.t) - timeValue) <= Math.abs(Number(right.t) - timeValue) ? left : right;
    };

    const downsampleMinMaxByBuckets = (points, maxPoints) => {
        if (!Array.isArray(points) || points.length <= 2) {
            return Array.isArray(points) ? points : [];
        }

        const limit = Math.max(4, Math.floor(Number(maxPoints) || 0));
        if (points.length <= limit) {
            return points;
        }

        const bucketCount = Math.max(1, Math.floor(limit / 2));
        const bucketSize = Math.max(1, Math.ceil(points.length / bucketCount));
        const sampled = [points[0]];

        for (let start = 0; start < points.length; start += bucketSize) {
            const end = Math.min(points.length, start + bucketSize);
            let minPoint = null;
            let maxPoint = null;

            for (let idx = start; idx < end; idx += 1) {
                const point = points[idx];
                if (!minPoint || point.v < minPoint.v) {
                    minPoint = point;
                }
                if (!maxPoint || point.v > maxPoint.v) {
                    maxPoint = point;
                }
            }

            if (minPoint && maxPoint) {
                if (minPoint.t <= maxPoint.t) {
                    sampled.push(minPoint);
                    if (maxPoint !== minPoint) {
                        sampled.push(maxPoint);
                    }
                }
                else {
                    sampled.push(maxPoint);
                    sampled.push(minPoint);
                }
            }
        }

        sampled.push(points[points.length - 1]);
        sampled.sort((a, b) => a.t - b.t);

        const deduped = [];
        for (let idx = 0; idx < sampled.length; idx += 1) {
            const current = sampled[idx];
            const prev = deduped.length > 0 ? deduped[deduped.length - 1] : null;
            if (!prev || prev.t !== current.t || prev.v !== current.v) {
                deduped.push(current);
            }
        }

        if (deduped.length <= limit) {
            return deduped;
        }

        const stride = Math.ceil(deduped.length / limit);
        const thinned = deduped.filter((_, idx) => idx === 0 || idx === deduped.length - 1 || (idx % stride) === 0);
        return thinned;
    };

    const aggregatePointsByTimeBuckets = (points, timeFrom, timeTo, bucketCount, mode = 'avg') => {
        if (!Array.isArray(points) || points.length === 0) {
            return [];
        }

        const safeBucketCount = Math.max(2, Math.floor(Number(bucketCount) || 0));
        if (points.length <= safeBucketCount) {
            return points;
        }

        const range = Math.max(1, Number(timeTo) - Number(timeFrom));
        const bucketSpan = range / safeBucketCount;
        if (!Number.isFinite(bucketSpan) || bucketSpan <= 0) {
            return points;
        }

        const buckets = Array.from({ length: safeBucketCount }, () => ({
            sum: 0,
            count: 0,
            min: null,
            max: null,
            firstT: null,
            lastT: null,
            lastV: null
        }));

        for (let idx = 0; idx < points.length; idx += 1) {
            const point = points[idx];
            const rawBucketIdx = Math.floor((point.t - timeFrom) / bucketSpan);
            const bucketIdx = Math.max(0, Math.min(safeBucketCount - 1, rawBucketIdx));
            const bucket = buckets[bucketIdx];

            bucket.sum += point.v;
            bucket.count += 1;
            bucket.min = bucket.min === null ? point.v : Math.min(bucket.min, point.v);
            bucket.max = bucket.max === null ? point.v : Math.max(bucket.max, point.v);
            bucket.firstT = bucket.firstT === null ? point.t : bucket.firstT;
            bucket.lastT = point.t;
            bucket.lastV = point.v;
        }

        return buckets
            .filter((bucket) => bucket.count > 0)
            .map((bucket, idx) => {
                const centerT = bucket.firstT !== null && bucket.lastT !== null
                    ? ((bucket.firstT + bucket.lastT) / 2)
                    : (timeFrom + ((idx + 0.5) * bucketSpan));

                let value = bucket.sum / bucket.count;
                if (mode === 'max') {
                    value = bucket.max;
                }
                else if (mode === 'min') {
                    value = bucket.min;
                }
                else if (mode === 'last') {
                    value = bucket.lastV;
                }

                return { t: centerT, v: value };
            });
    };

    const aggregatePointsAlignedByTimeBuckets = (points, timeFrom, timeTo, bucketCount, mode = 'avg') => {
        const safeBucketCount = Math.max(2, Math.floor(Number(bucketCount) || 0));
        const range = Math.max(1, Number(timeTo) - Number(timeFrom));
        const bucketSpan = range / safeBucketCount;
        if (!Number.isFinite(bucketSpan) || bucketSpan <= 0) {
            return [];
        }

        const buckets = Array.from({ length: safeBucketCount }, (_, idx) => ({
            idx,
            t: timeFrom + ((idx + 0.5) * bucketSpan),
            sum: 0,
            count: 0,
            min: null,
            max: null,
            lastV: null
        }));

        for (let idx = 0; idx < points.length; idx += 1) {
            const point = points[idx];
            const rawBucketIdx = Math.floor((point.t - timeFrom) / bucketSpan);
            const bucketIdx = Math.max(0, Math.min(safeBucketCount - 1, rawBucketIdx));
            const bucket = buckets[bucketIdx];
            bucket.sum += point.v;
            bucket.count += 1;
            bucket.min = bucket.min === null ? point.v : Math.min(bucket.min, point.v);
            bucket.max = bucket.max === null ? point.v : Math.max(bucket.max, point.v);
            bucket.lastV = point.v;
        }

        return buckets.map((bucket) => {
            if (bucket.count <= 0) {
                return { t: bucket.t, v: null };
            }
            let value = bucket.sum / bucket.count;
            if (mode === 'max') {
                value = bucket.max;
            }
            else if (mode === 'min') {
                value = bucket.min;
            }
            else if (mode === 'last') {
                value = bucket.lastV;
            }
            return { t: bucket.t, v: Number.isFinite(value) ? Number(value) : null };
        });
    };

    const calculatePercentile = (values, percentile) => {
        const nums = (Array.isArray(values) ? values : [])
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b);
        if (nums.length === 0) {
            return null;
        }
        if (nums.length === 1) {
            return nums[0];
        }

        const p = clampNumber(Number(percentile) || 0, 0, 100);
        const pos = (nums.length - 1) * (p / 100);
        const lower = Math.floor(pos);
        const upper = Math.ceil(pos);
        if (lower === upper) {
            return nums[lower];
        }
        const weight = pos - lower;
        return nums[lower] + ((nums[upper] - nums[lower]) * weight);
    };

    window.TimeSeriesWidget = ({ remove, settings, updateSettings, apiClient, globalData, isEditing, setEditing, editorHost }) => {
        const { useState, useEffect, useMemo, useRef, useCallback } = React;
        const ColorPickerField = window.ReactDashboardColorPickerField;
        const HostSelectorField = window.ReactDashboardHostSelectorField;
        const cfg = { ...DEFAULTS, ...sanitizeSettings(settings || {}) };

        const bodyRef = useRef(null);
        const svgRef = useRef(null);
        const suggestionTimersRef = useRef(new Map());

        const [localEditMode, setLocalEditMode] = useState(false);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        const [hosts, setHosts] = useState([]);
        const [hostsLoading, setHostsLoading] = useState(false);
        const [seriesSuggestions, setSeriesSuggestions] = useState({});
        const [seriesSectionCollapsed, setSeriesSectionCollapsed] = useState({});
        const [activeSuggestId, setActiveSuggestId] = useState('');
        const [panelCollapsed, setPanelCollapsed] = useState({
            query: false,
            display: true,
            axis: true,
            legend: true
        });
        const [bodySize, setBodySize] = useState({ width: 640, height: 320 });
        const [model, setModel] = useState({ series: [], time_from: 0, time_to: 0 });
        const [lookbackDraft, setLookbackDraft] = useState(String(cfg.lookbackHours));
        const [historyPointsDraft, setHistoryPointsDraft] = useState(String(cfg.historyPoints));
        const [refreshSecDraft, setRefreshSecDraft] = useState(String(cfg.refreshSec));
        const [hoverState, setHoverState] = useState(null);
        const [dragZoom, setDragZoom] = useState(null);
        const [zoomRange, setZoomRange] = useState(null);
        const editMode = typeof isEditing === 'boolean' ? isEditing : localEditMode;
        const setEditMode = useCallback((nextValue) => {
            const resolved = typeof nextValue === 'function'
                ? Boolean(nextValue(editMode))
                : Boolean(nextValue);
            if (typeof setEditing === 'function') {
                setEditing(resolved);
            }
            else {
                setLocalEditMode(resolved);
            }
        }, [editMode, setEditing]);

        const seriesConfig = useMemo(() => parseSeries(cfg.seriesJson), [cfg.seriesJson]);
        const seriesConfigById = useMemo(() => {
            const map = new Map();
            seriesConfig.forEach((row) => {
                map.set(row.id, row);
            });
            return map;
        }, [seriesConfig]);
        const thresholdRows = useMemo(() => parseThresholds(cfg.thresholdsJson), [cfg.thresholdsJson]);
        const selectedHostIds = useMemo(() => parseIdsCsv(cfg.hostidsCsv), [cfg.hostidsCsv]);

        const persistSeriesConfig = (nextRows) => {
            updateSettings({ seriesJson: serializeSeries(nextRows) });
        };

        const upsertSeriesRow = (rowId, patch) => {
            const next = seriesConfig.map((row) => (row.id === rowId ? normalizeSeriesRow({ ...row, ...patch }, 0) : row));
            persistSeriesConfig(next);
        };

        const addSeriesRow = () => {
            const idx = seriesConfig.length;
            const next = [
                ...seriesConfig,
                normalizeSeriesRow({
                    id: `series_${Date.now()}_${idx}`,
                    color: DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length]
                }, idx)
            ].slice(0, MAX_SERIES);
            persistSeriesConfig(next);
        };

        const removeSeriesRow = (rowId) => {
            const next = seriesConfig.filter((row) => row.id !== rowId);
            persistSeriesConfig(next);
            setSeriesSuggestions((prev) => {
                const copy = { ...prev };
                delete copy[rowId];
                return copy;
            });
            setSeriesSectionCollapsed((prev) => {
                if (!(rowId in prev)) {
                    return prev;
                }
                const copy = { ...prev };
                delete copy[rowId];
                return copy;
            });
        };

        const updateThresholdRows = (nextRows) => {
            updateSettings({ thresholdsJson: serializeThresholds(nextRows) });
        };

        const addThresholdRow = () => {
            const nextValue = thresholdRows.length > 0
                ? Number(thresholdRows[thresholdRows.length - 1].value) + 1
                : 80;
            updateThresholdRows([
                ...thresholdRows,
                {
                    id: `thr_${Date.now()}`,
                    value: nextValue,
                    color: '#E24D42',
                    fill: 12,
                    label: `T${thresholdRows.length + 1}`
                }
            ]);
        };

        const patchThresholdRow = (id, patch) => {
            const next = thresholdRows.map((row) => (row.id === id ? { ...row, ...patch } : row));
            updateThresholdRows(next);
        };

        const removeThresholdRow = (id) => {
            updateThresholdRows(thresholdRows.filter((row) => row.id !== id));
        };

        const isSeriesSectionClosed = useCallback((rowId, sectionKey) => {
            const rowState = seriesSectionCollapsed[rowId];
            if (rowState && Object.prototype.hasOwnProperty.call(rowState, sectionKey)) {
                return rowState[sectionKey] === true;
            }
            return true;
        }, [seriesSectionCollapsed]);

        const toggleSeriesSection = useCallback((rowId, sectionKey) => {
            setSeriesSectionCollapsed((prev) => {
                const rowState = prev[rowId] || {};
                const isClosed = Object.prototype.hasOwnProperty.call(rowState, sectionKey)
                    ? rowState[sectionKey] === true
                    : true;
                return {
                    ...prev,
                    [rowId]: {
                        ...rowState,
                        [sectionKey]: !isClosed
                    }
                };
            });
        }, []);

        const fetchSeriesData = useCallback(async () => {
            const activeSeries = seriesConfig.filter((row) => /^\d+$/.test(String(row.itemid || '')));
            if (activeSeries.length === 0) {
                setModel({ series: [], time_from: 0, time_to: 0 });
                setError('Selecteer minstens 1 item.');
                return;
            }

            setLoading(true);
            setError('');
            try {
                const payload = await apiClient.cachedRequest({
                    action_type: 'timeseries_data',
                    hostids_csv: selectedHostIds.join(','),
                    lookback_hours: String(cfg.lookbackHours),
                    history_points: String(cfg.historyPoints),
                    series_json: JSON.stringify(activeSeries.map((row) => ({
                        id: row.id,
                        label: row.label,
                        itemid: row.itemid,
                        hostid: row.hostid || '',
                        color: row.color,
                        axis: row.axis || 'left',
                        showInLegend: row.showInLegend !== false ? 1 : 0,
                        drawStyle: row.drawStyle || 'line',
                        lineWidth: clampInt(row.lineWidth, 2, 1, 8),
                        fillOpacity: clampInt(row.fillOpacity, 0, 0, 100)
                    })))
                }, 5000);

                const series = Array.isArray(payload && payload.series) ? payload.series : [];
                setModel({
                    series,
                    time_from: Number(payload && payload.time_from) || 0,
                    time_to: Number(payload && payload.time_to) || 0
                });
                if (series.length === 0) {
                    setError('Geen data voor huidige selectie.');
                }
            }
            catch (err) {
                setError(String((err && err.message) || err || 'Data ophalen mislukt.'));
                setModel({ series: [], time_from: 0, time_to: 0 });
            }
            finally {
                setLoading(false);
            }
        }, [apiClient, cfg.historyPoints, cfg.lookbackHours, selectedHostIds, seriesConfig]);

        useEffect(() => {
            fetchSeriesData();
            const timer = setInterval(fetchSeriesData, Math.max(5000, Number(cfg.refreshSec || 30) * 1000));
            return () => clearInterval(timer);
        }, [cfg.refreshSec, fetchSeriesData]);

        useEffect(() => {
            if (!cfg.groupid) {
                setHosts([]);
                return;
            }

            let mounted = true;
            setHostsLoading(true);
            apiClient.cachedRequest({ action_type: 'get_hosts_by_group', groupid: cfg.groupid }, 60000)
                .then((payload) => {
                    if (!mounted) {
                        return;
                    }
                    setHosts(Array.isArray(payload) ? payload : []);
                })
                .catch(() => {
                    if (!mounted) {
                        return;
                    }
                    setHosts([]);
                })
                .finally(() => {
                    if (mounted) {
                        setHostsLoading(false);
                    }
                });

            return () => {
                mounted = false;
            };
        }, [apiClient, cfg.groupid]);

        useEffect(() => {
            if (!bodyRef.current) {
                return;
            }

            const node = bodyRef.current;
            const updateSize = () => {
                const rect = node.getBoundingClientRect();
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
            observer.observe(node);
            return () => observer.disconnect();
        }, []);

        const scheduleSuggestions = (row) => {
            if (!row || !row.id) {
                return;
            }

            const existing = suggestionTimersRef.current.get(row.id);
            if (existing) {
                clearTimeout(existing);
            }

            const timer = setTimeout(async () => {
                const filterValue = String(row.filterValue || '').trim();
                const rowHostId = /^\d+$/.test(String(row.hostid || '').trim()) ? String(row.hostid).trim() : '';
                const scopedHostIds = rowHostId !== '' ? [rowHostId] : selectedHostIds;
                if (filterValue === '' || scopedHostIds.length === 0) {
                    setSeriesSuggestions((prev) => ({ ...prev, [row.id]: [] }));
                    return;
                }
                const hasWildcard = filterValue.includes('*') || filterValue.includes('?');
                const suggestionFilter = hasWildcard ? filterValue : `*${filterValue}*`;

                try {
                    const payload = await apiClient.cachedRequest({
                        action_type: 'timestate_items',
                        hostids_csv: scopedHostIds.join(','),
                        filter_mode: row.filterType === 'name' ? 'name' : 'key',
                        item_filter: suggestionFilter,
                        max_rows: '10',
                        filter_exact: '0'
                    }, 4000);

                    const items = Array.isArray(payload && payload.items) ? payload.items : [];
                    setSeriesSuggestions((prev) => ({ ...prev, [row.id]: items }));
                }
                catch (_err) {
                    setSeriesSuggestions((prev) => ({ ...prev, [row.id]: [] }));
                }
            }, 240);

            suggestionTimersRef.current.set(row.id, timer);
        };

        useEffect(() => () => {
            suggestionTimersRef.current.forEach((timer) => clearTimeout(timer));
            suggestionTimersRef.current.clear();
        }, []);

        useEffect(() => {
            setLookbackDraft(String(cfg.lookbackHours));
            setHistoryPointsDraft(String(cfg.historyPoints));
            setRefreshSecDraft(String(cfg.refreshSec));
        }, [cfg.lookbackHours, cfg.historyPoints, cfg.refreshSec, editMode]);

        const chartSeries = useMemo(() => {
            if (!Array.isArray(model.series)) {
                return [];
            }
            return model.series.filter((serie) => Array.isArray(serie.points) && serie.points.length > 0);
        }, [model.series]);

        const preparedSeries = useMemo(() => chartSeries.map((serie, idx) => {
            const points = (Array.isArray(serie.points) ? serie.points : [])
                .map((point) => ({ t: Number(point.t), v: Number(point.v) }))
                .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v))
                .sort((a, b) => a.t - b.t);

            return {
                ...serie,
                id: String(serie.series_id || serie.itemid || `s_${idx + 1}`),
                color: String(serie.color || '#5794F2'),
                axis: String(serie.axis || '').toLowerCase() === 'right' ? 'right' : 'left',
                show_in_legend: Number(serie.show_in_legend) === 0 ? 0 : 1,
                points
            };
        }).filter((serie) => serie.points.length > 0), [chartSeries]);

        const dataTimeFrom = Number(model.time_from) || Math.floor(Date.now() / 1000) - (cfg.lookbackHours * 3600);
        const dataTimeTo = Number(model.time_to) || Math.floor(Date.now() / 1000);
        const safeDataTimeTo = dataTimeTo <= dataTimeFrom ? dataTimeFrom + 1 : dataTimeTo;

        const hasZoom = zoomRange && Number.isFinite(zoomRange.from) && Number.isFinite(zoomRange.to) && zoomRange.to > zoomRange.from;
        const viewTimeFrom = hasZoom
            ? clampNumber(Number(zoomRange.from), dataTimeFrom, safeDataTimeTo - 1)
            : dataTimeFrom;
        const viewTimeTo = hasZoom
            ? clampNumber(Number(zoomRange.to), viewTimeFrom + 1, safeDataTimeTo)
            : safeDataTimeTo;
        const safeViewTimeTo = viewTimeTo <= viewTimeFrom ? viewTimeFrom + 1 : viewTimeTo;

        useEffect(() => {
            if (!hasZoom) {
                return;
            }
            if (safeDataTimeTo <= dataTimeFrom + 1) {
                setZoomRange(null);
                return;
            }
            if (Number(zoomRange.to) <= dataTimeFrom || Number(zoomRange.from) >= safeDataTimeTo) {
                setZoomRange(null);
            }
        }, [dataTimeFrom, safeDataTimeTo, hasZoom, zoomRange]);

        const stackMode = ['off', 'normal', 'percent'].includes(cfg.stackMode) ? cfg.stackMode : 'off';
        const stackBucketCount = Math.max(24, Math.floor(Math.max(120, bodySize.width - 80) / 4));

        const stackedAxisValues = useMemo(() => {
            if (stackMode === 'off') {
                return { left: null, right: null };
            }

            const buildAxisValues = (axisKey) => {
                const axisSeries = preparedSeries.filter((serie) => (axisKey === 'right' ? serie.axis === 'right' : serie.axis !== 'right'));
                if (axisSeries.length === 0) {
                    return [];
                }

                const alignedSeries = axisSeries.map((serie) => aggregatePointsAlignedByTimeBuckets(
                    serie.points.filter((point) => point.t >= viewTimeFrom && point.t <= safeViewTimeTo),
                    viewTimeFrom,
                    safeViewTimeTo,
                    stackBucketCount,
                    'avg'
                ));

                if (alignedSeries.length === 0 || alignedSeries[0].length === 0) {
                    return [];
                }

                if (stackMode === 'percent') {
                    return alignedSeries[0].map((_, idx) => {
                        const total = alignedSeries.reduce((sum, seriesPoints) => {
                            const value = Number(seriesPoints[idx] && seriesPoints[idx].v);
                            return sum + (Number.isFinite(value) ? Math.max(0, value) : 0);
                        }, 0);
                        return total > 0 ? 100 : 0;
                    });
                }

                return alignedSeries[0].map((_, idx) => alignedSeries.reduce((sum, seriesPoints) => {
                    const value = Number(seriesPoints[idx] && seriesPoints[idx].v);
                    return sum + (Number.isFinite(value) ? value : 0);
                }, 0));
            };

            return {
                left: buildAxisValues('left'),
                right: buildAxisValues('right')
            };
        }, [preparedSeries, safeViewTimeTo, stackBucketCount, stackMode, viewTimeFrom]);

        const leftVisibleValues = useMemo(() => {
            if (stackMode !== 'off' && Array.isArray(stackedAxisValues.left) && stackedAxisValues.left.length > 0) {
                return stackedAxisValues.left;
            }

            const values = [];
            preparedSeries.forEach((serie) => {
                if (serie.axis === 'right') {
                    return;
                }
                serie.points.forEach((point) => {
                    if (point.t >= viewTimeFrom && point.t <= safeViewTimeTo) {
                        values.push(point.v);
                    }
                });
            });
            if (values.length > 0) {
                return values;
            }
            const fallback = preparedSeries
                .filter((serie) => serie.axis !== 'right')
                .flatMap((serie) => serie.points.map((point) => point.v));
            return fallback.length > 0 ? fallback : preparedSeries.flatMap((serie) => serie.points.map((point) => point.v));
        }, [preparedSeries, safeViewTimeTo, stackedAxisValues.left, stackMode, viewTimeFrom]);

        const rightVisibleValues = useMemo(() => {
            const hasRight = preparedSeries.some((serie) => serie.axis === 'right');
            if (!hasRight) {
                return [];
            }

            if (stackMode !== 'off' && Array.isArray(stackedAxisValues.right) && stackedAxisValues.right.length > 0) {
                return stackedAxisValues.right;
            }

            const values = [];
            preparedSeries.forEach((serie) => {
                if (serie.axis !== 'right') {
                    return;
                }
                serie.points.forEach((point) => {
                    if (point.t >= viewTimeFrom && point.t <= safeViewTimeTo) {
                        values.push(point.v);
                    }
                });
            });
            if (values.length > 0) {
                return values;
            }
            return preparedSeries
                .filter((serie) => serie.axis === 'right')
                .flatMap((serie) => serie.points.map((point) => point.v));
        }, [preparedSeries, safeViewTimeTo, stackedAxisValues.right, stackMode, viewTimeFrom]);

        const hasRightAxis = useMemo(() => preparedSeries.some((serie) => serie.axis === 'right'), [preparedSeries]);
        const hasLeftAxis = useMemo(() => preparedSeries.some((serie) => serie.axis !== 'right'), [preparedSeries]);

        const valueMin = leftVisibleValues.length > 0 ? Math.min(...leftVisibleValues) : 0;
        const valueMax = leftVisibleValues.length > 0 ? Math.max(...leftVisibleValues) : 1;
        const valueRange = Math.max(0, valueMax - valueMin);
        const autoPadding = valueRange > 0 ? valueRange * 0.08 : Math.max(1, Math.abs(valueMax || 1) * 0.02);
        const autoYMin = valueMin - autoPadding;
        const autoYMax = valueMax + autoPadding;

        const customYMin = parseOptionalNumber(cfg.yMin);
        const customYMax = parseOptionalNumber(cfg.yMax);
        const yMin = customYMin !== null ? customYMin : autoYMin;
        const yMax = customYMax !== null ? customYMax : autoYMax;
        const safeYMax = yMax <= yMin ? yMin + 1 : yMax;

        const rightMin = rightVisibleValues.length > 0 ? Math.min(...rightVisibleValues) : yMin;
        const rightMax = rightVisibleValues.length > 0 ? Math.max(...rightVisibleValues) : safeYMax;
        const rightRange = Math.max(0, rightMax - rightMin);
        const rightPadding = rightRange > 0 ? rightRange * 0.08 : Math.max(1, Math.abs(rightMax || 1) * 0.02);
        const rightYMin = rightMin - rightPadding;
        const rightYMax = rightMax + rightPadding;
        const rightSafeYMax = rightYMax <= rightYMin ? rightYMin + 1 : rightYMax;

        const legendHeight = cfg.legendMode === 'hidden' ? 0 : (cfg.legendMode === 'table' ? 110 : 46);
        const chartPadding = {
            top: 12,
            right: hasRightAxis ? 66 : 12,
            bottom: 20 + legendHeight,
            left: hasLeftAxis ? 42 : 12
        };
        const plotWidth = Math.max(120, bodySize.width - chartPadding.left - chartPadding.right);
        const plotHeight = Math.max(90, bodySize.height - chartPadding.top - chartPadding.bottom);

        const scaleX = (timestamp) => chartPadding.left + (((Number(timestamp) - viewTimeFrom) / (safeViewTimeTo - viewTimeFrom)) * plotWidth);
        const scaleY = (value) => chartPadding.top + (plotHeight - (((Number(value) - yMin) / (safeYMax - yMin)) * plotHeight));
        const scaleYRight = (value) => chartPadding.top + (plotHeight - (((Number(value) - rightYMin) / (rightSafeYMax - rightYMin)) * plotHeight));

        const yTicks = 5;
        const xTicks = 6;
        const maxLineVertices = Math.max(180, Math.floor(plotWidth * 1.35));
        const maxPointMarkers = Math.max(90, Math.floor(plotWidth * 0.6));
        const targetBarBuckets = Math.max(32, Math.floor(plotWidth / 4.5));

        const seriesRenderState = useMemo(() => {
            const interpolation = ['linear', 'smooth', 'step'].includes(cfg.lineInterpolation) ? cfg.lineInterpolation : 'linear';
            const base = preparedSeries
                .map((serie) => {
                    const visiblePoints = serie.points.filter((point) => point.t >= viewTimeFrom && point.t <= safeViewTimeTo);
                    if (visiblePoints.length === 0) {
                        return null;
                    }

                    const drawStyle = ['line', 'points', 'bars'].includes(serie.draw_style) ? serie.draw_style : 'line';
                    const lineWidth = clampInt(serie.line_width, 2, 1, 8);
                    const fillOpacity = clampInt(serie.fill_opacity, 0, 0, 100) / 100;
                    const sampledForLine = downsampleMinMaxByBuckets(visiblePoints, maxLineVertices);
                    const sampledForBars = aggregatePointsByTimeBuckets(visiblePoints, viewTimeFrom, safeViewTimeTo, targetBarBuckets, 'avg');
                    const renderPoints = drawStyle === 'bars' ? sampledForBars : sampledForLine;
                    const markerPoints = downsampleMinMaxByBuckets(renderPoints, maxPointMarkers);

                    return {
                        id: serie.id,
                        color: serie.color,
                        axis: serie.axis === 'right' ? 'right' : 'left',
                        showInLegend: Number(serie.show_in_legend) === 0 ? false : true,
                        drawStyle,
                        lineWidth,
                        fillOpacity,
                        lineInterpolation: interpolation,
                        renderPoints,
                        markerPoints,
                        visiblePoints
                    };
                })
                .filter(Boolean);

            if (stackMode === 'off') {
                return base;
            }

            const stackable = base.filter((serie) => serie.drawStyle !== 'points');
            if (stackable.length === 0) {
                return base;
            }

            const stackedById = new Map();
            ['left', 'right'].forEach((axisKey) => {
                const axisSeries = stackable.filter((serie) => (axisKey === 'right' ? serie.axis === 'right' : serie.axis !== 'right'));
                if (axisSeries.length === 0) {
                    return;
                }

                const aligned = axisSeries.map((serie) => aggregatePointsAlignedByTimeBuckets(
                    serie.visiblePoints,
                    viewTimeFrom,
                    safeViewTimeTo,
                    stackBucketCount,
                    'avg'
                ));

                if (aligned.length === 0 || aligned[0].length === 0) {
                    return;
                }

                const bucketCount = aligned[0].length;
                const totals = stackMode === 'percent'
                    ? Array.from({ length: bucketCount }, (_, bucketIdx) => aligned.reduce((sum, seriesPoints) => {
                        const value = Number(seriesPoints[bucketIdx] && seriesPoints[bucketIdx].v);
                        return sum + (Number.isFinite(value) ? Math.max(0, value) : 0);
                    }, 0))
                    : null;
                const cumulative = new Array(bucketCount).fill(0);

                axisSeries.forEach((serie, seriesIdx) => {
                    const points = [];
                    for (let bucketIdx = 0; bucketIdx < bucketCount; bucketIdx += 1) {
                        const point = aligned[seriesIdx][bucketIdx];
                        const raw = Number(point && point.v);
                        if (!Number.isFinite(raw)) {
                            continue;
                        }

                        let value = raw;
                        if (stackMode === 'percent') {
                            const total = Number(totals[bucketIdx]);
                            if (!Number.isFinite(total) || total <= 0) {
                                continue;
                            }
                            value = (Math.max(0, raw) / total) * 100;
                        }

                        const baseValue = cumulative[bucketIdx];
                        const topValue = baseValue + value;
                        cumulative[bucketIdx] = topValue;
                        points.push({
                            t: point.t,
                            v: topValue,
                            baseV: baseValue
                        });
                    }

                    stackedById.set(serie.id, {
                        ...serie,
                        isStacked: true,
                        renderPoints: points,
                        markerPoints: downsampleMinMaxByBuckets(points, maxPointMarkers)
                    });
                });
            });

            return base.map((serie) => stackedById.get(serie.id) || serie);
        }, [
            cfg.lineInterpolation,
            maxLineVertices,
            maxPointMarkers,
            preparedSeries,
            safeViewTimeTo,
            stackBucketCount,
            stackMode,
            targetBarBuckets,
            viewTimeFrom
        ]);

        const thresholdRenderState = useMemo(() => {
            const rows = thresholdRows
                .filter((row) => Number.isFinite(Number(row.value)))
                .map((row) => ({
                    ...row,
                    value: Number(row.value),
                    fill: clampInt(row.fill, 12, 0, 100)
                }))
                .sort((a, b) => a.value - b.value);

            const lines = rows
                .filter((row) => row.value >= yMin && row.value <= safeYMax)
                .map((row) => ({
                    ...row,
                    y: scaleY(row.value)
                }));

            const bands = rows
                .map((row, idx) => {
                    const next = rows[idx + 1];
                    const fromValue = row.value;
                    const toValue = next ? next.value : safeYMax;
                    const minValue = Math.max(yMin, Math.min(fromValue, toValue));
                    const maxValue = Math.min(safeYMax, Math.max(fromValue, toValue));
                    if (maxValue <= minValue || row.fill <= 0) {
                        return null;
                    }
                    const topY = scaleY(maxValue);
                    const bottomY = scaleY(minValue);
                    return {
                        id: `${row.id}-band-${idx}`,
                        color: row.color,
                        opacity: row.fill / 100,
                        y: topY,
                        h: Math.max(0, bottomY - topY)
                    };
                })
                .filter(Boolean);

            return { lines, bands };
        }, [thresholdRows, yMin, safeYMax, scaleY]);

        const legendRows = useMemo(() => preparedSeries.map((serie) => {
            const values = serie.points
                .filter((point) => point.t >= viewTimeFrom && point.t <= safeViewTimeTo)
                .map((point) => point.v);
            const safeValues = values.length > 0 ? values : serie.points.map((point) => point.v);
            const last = safeValues.length > 0 ? safeValues[safeValues.length - 1] : NaN;
            const min = safeValues.length > 0 ? Math.min(...safeValues) : NaN;
            const max = safeValues.length > 0 ? Math.max(...safeValues) : NaN;
            return {
                id: serie.id,
                label: String(serie.label || serie.name || 'Series'),
                color: serie.color,
                axis: serie.axis === 'right' ? 'right' : 'left',
                showInLegend: Number(serie.show_in_legend) === 0 ? false : true,
                last,
                min,
                max
            };
        }), [preparedSeries, viewTimeFrom, safeViewTimeTo]);
        const visibleLegendRows = useMemo(() => legendRows.filter((row) => row.showInLegend), [legendRows]);

        const percentileLines = useMemo(() => preparedSeries
            .map((serie) => {
                const row = seriesConfigById.get(serie.id);
                if (!row || row.showPercentileLine !== true) {
                    return null;
                }

                const percentileTarget = clampInt(row.percentileValue, 95, 0, 100);
                const visible = serie.points
                    .filter((point) => point.t >= viewTimeFrom && point.t <= safeViewTimeTo)
                    .map((point) => point.v);
                const source = visible.length > 0
                    ? visible
                    : serie.points.map((point) => point.v);
                const percentileValue = calculatePercentile(source, percentileTarget);

                if (!Number.isFinite(percentileValue)) {
                    return null;
                }

                const labelBase = String(serie.label || serie.name || 'Series');
                return {
                    id: `${serie.id}-p${percentileTarget}`,
                    color: String(serie.color || '#dbe6f4'),
                    axis: serie.axis === 'right' ? 'right' : 'left',
                    showInLegend: Number(serie.show_in_legend) === 0 ? false : true,
                    shortLabel: `P${percentileTarget}`,
                    label: `${labelBase} P${percentileTarget}`,
                    value: percentileValue
                };
            })
            .filter(Boolean), [preparedSeries, seriesConfigById, viewTimeFrom, safeViewTimeTo]);

        const pointerToLocal = useCallback((event) => {
            if (!svgRef.current) {
                return null;
            }
            const rect = svgRef.current.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return null;
            }
            const x = ((event.clientX - rect.left) / rect.width) * bodySize.width;
            const y = ((event.clientY - rect.top) / rect.height) * bodySize.height;
            return { x, y };
        }, [bodySize.height, bodySize.width]);

        const isInsidePlot = useCallback((x, y) => (
            x >= chartPadding.left
            && x <= chartPadding.left + plotWidth
            && y >= chartPadding.top
            && y <= chartPadding.top + plotHeight
        ), [chartPadding.left, chartPadding.top, plotHeight, plotWidth]);

        const timeFromPlotX = useCallback((x) => {
            const clampedX = clampNumber(x, chartPadding.left, chartPadding.left + plotWidth);
            const ratio = (clampedX - chartPadding.left) / Math.max(1, plotWidth);
            return viewTimeFrom + (ratio * (safeViewTimeTo - viewTimeFrom));
        }, [chartPadding.left, plotWidth, safeViewTimeTo, viewTimeFrom]);

        const updateHoverState = useCallback((x, y) => {
            if (!isInsidePlot(x, y)) {
                setHoverState(null);
                return;
            }
            const clampedX = clampNumber(x, chartPadding.left, chartPadding.left + plotWidth);
            const clampedY = clampNumber(y, chartPadding.top, chartPadding.top + plotHeight);
            setHoverState({
                x: clampedX,
                y: clampedY,
                t: timeFromPlotX(clampedX)
            });
        }, [chartPadding.left, chartPadding.top, isInsidePlot, plotHeight, plotWidth, timeFromPlotX]);

        const applyDragZoom = useCallback((startX, endX) => {
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            if ((maxX - minX) < 8) {
                return;
            }
            const from = timeFromPlotX(minX);
            const to = timeFromPlotX(maxX);
            if (Number.isFinite(from) && Number.isFinite(to) && (to - from) >= 1) {
                setZoomRange({ from, to });
            }
        }, [timeFromPlotX]);

        const tooltipData = useMemo(() => {
            if (!hoverState || !Number.isFinite(hoverState.t)) {
                return null;
            }
            const rows = preparedSeries.map((serie) => {
                const nearest = findNearestPoint(serie.points, hoverState.t);
                if (!nearest) {
                    return null;
                }
                return {
                    id: serie.id,
                    color: serie.color,
                    label: String(serie.label || serie.name || 'Series'),
                    point: nearest
                };
            }).filter(Boolean);

            if (rows.length === 0) {
                return null;
            }

            return {
                time: hoverState.t,
                rows
            };
        }, [hoverState, preparedSeries]);

        const tooltipStyle = useMemo(() => {
            if (!hoverState) {
                return null;
            }
            const maxWidth = 260;
            const left = clampNumber(hoverState.x + 12, 8, Math.max(8, bodySize.width - maxWidth - 8));
            const top = clampNumber(hoverState.y - 12, 8, Math.max(8, bodySize.height - 140));
            return {
                left: `${left}px`,
                top: `${top}px`
            };
        }, [bodySize.height, bodySize.width, hoverState]);

        const brushBounds = useMemo(() => {
            if (!dragZoom) {
                return null;
            }
            const left = Math.min(dragZoom.startX, dragZoom.currentX);
            const right = Math.max(dragZoom.startX, dragZoom.currentX);
            return {
                x: left,
                w: Math.max(1, right - left),
                y: chartPadding.top,
                h: plotHeight
            };
        }, [chartPadding.top, dragZoom, plotHeight]);

        const onChartMouseDown = (event) => {
            const point = pointerToLocal(event);
            if (!point || !isInsidePlot(point.x, point.y)) {
                return;
            }
            const startX = clampNumber(point.x, chartPadding.left, chartPadding.left + plotWidth);
            setDragZoom({ startX, currentX: startX });
            setHoverState(null);
        };

        const onChartMouseMove = (event) => {
            const point = pointerToLocal(event);
            if (!point) {
                return;
            }

            if (dragZoom) {
                const currentX = clampNumber(point.x, chartPadding.left, chartPadding.left + plotWidth);
                setDragZoom((prev) => (prev ? { ...prev, currentX } : prev));
                return;
            }

            updateHoverState(point.x, point.y);
        };

        const onChartMouseUp = () => {
            if (!dragZoom) {
                return;
            }
            applyDragZoom(dragZoom.startX, dragZoom.currentX);
            setDragZoom(null);
        };

        const onChartMouseLeave = () => {
            if (!dragZoom) {
                setHoverState(null);
            }
        };

        const onChartDoubleClick = () => {
            setZoomRange(null);
        };

        const commitLookbackDraft = () => {
            const raw = String(lookbackDraft || '').trim();
            if (raw === '') {
                setLookbackDraft(String(cfg.lookbackHours));
                return;
            }
            const parsed = Number(raw);
            if (!Number.isFinite(parsed)) {
                setLookbackDraft(String(cfg.lookbackHours));
                return;
            }
            const next = clampInt(parsed, cfg.lookbackHours, 1, 336);
            setLookbackDraft(String(next));
            if (next !== Number(cfg.lookbackHours)) {
                updateSettings({ lookbackHours: next });
            }
        };

        const commitHistoryPointsDraft = () => {
            const raw = String(historyPointsDraft || '').trim();
            if (raw === '') {
                setHistoryPointsDraft(String(cfg.historyPoints));
                return;
            }
            const parsed = Number(raw);
            if (!Number.isFinite(parsed)) {
                setHistoryPointsDraft(String(cfg.historyPoints));
                return;
            }
            const next = clampInt(parsed, cfg.historyPoints, 50, 2000);
            setHistoryPointsDraft(String(next));
            if (next !== Number(cfg.historyPoints)) {
                updateSettings({ historyPoints: next });
            }
        };

        const commitRefreshSecDraft = () => {
            const raw = String(refreshSecDraft || '').trim();
            if (raw === '') {
                setRefreshSecDraft(String(cfg.refreshSec));
                return;
            }
            const parsed = Number(raw.replace(/,/g, '.'));
            if (!Number.isFinite(parsed)) {
                setRefreshSecDraft(String(cfg.refreshSec));
                return;
            }
            const next = clampInt(parsed, cfg.refreshSec, 5, 3600);
            setRefreshSecDraft(String(next));
            if (next !== Number(cfg.refreshSec)) {
                updateSettings({ refreshSec: next });
            }
        };

        const renderEditorSection = (key, title, body) => (
            <section className="ts-editor-section" key={key}>
                <button
                    type="button"
                    className="ts-editor-section-toggle"
                    onClick={() => setPanelCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                >
                    <span>{title}</span>
                    <span>{panelCollapsed[key] ? '▸' : '▾'}</span>
                </button>
                {!panelCollapsed[key] && <div className="ts-editor-section-body">{body}</div>}
            </section>
        );

        const renderSeriesSection = (rowId, sectionKey, title, body) => {
            const isClosed = isSeriesSectionClosed(rowId, sectionKey);
            return (
                <div className="ts-series-subsection" key={`${rowId}-${sectionKey}`}>
                    <button
                        type="button"
                        className="ts-series-subtitle-toggle"
                        onClick={() => toggleSeriesSection(rowId, sectionKey)}
                    >
                        <span className="ts-series-subtitle">{title}</span>
                        <span className="ts-series-subtitle-icon">{isClosed ? '▸' : '▾'}</span>
                    </button>
                    {!isClosed && <div className="ts-series-subsection-body">{body}</div>}
                </div>
            );
        };

        return (
            <div className="widget-card">
                {cfg.showHeader && (
                    <div className="widget-header">
                        <span className="widget-title">{cfg.name || 'Time series'}</span>
                        <div className="widget-actions">
                            <button className="btn-zbx" onClick={() => setEditMode((v) => !v)}>{editMode ? 'Close' : 'Edit'}</button>
                            <button className="btn-zbx btn-danger" onClick={remove}>✕</button>
                        </div>
                    </div>
                )}

                <div className="widget-body ts-widget-body" ref={bodyRef}>
                    {!cfg.showHeader && (
                        <div className="widget-floating-actions">
                            <button className="btn-zbx" onClick={() => setEditMode((v) => !v)}>{editMode ? 'Close' : 'Edit'}</button>
                            <button className="btn-zbx btn-danger" onClick={remove}>✕</button>
                        </div>
                    )}

                    <svg
                        ref={svgRef}
                        className="ts-chart-svg"
                        viewBox={`0 0 ${Math.max(1, bodySize.width)} ${Math.max(1, bodySize.height)}`}
                        preserveAspectRatio="none"
                    >
                        {cfg.showGrid && (
                            <g className="ts-grid-lines">
                                {Array.from({ length: yTicks + 1 }).map((_, idx) => {
                                    const y = chartPadding.top + ((plotHeight / yTicks) * idx);
                                    return <line key={`gy-${idx}`} x1={chartPadding.left} y1={y} x2={chartPadding.left + plotWidth} y2={y} />;
                                })}
                                {Array.from({ length: xTicks + 1 }).map((_, idx) => {
                                    const x = chartPadding.left + ((plotWidth / xTicks) * idx);
                                    return <line key={`gx-${idx}`} x1={x} y1={chartPadding.top} x2={x} y2={chartPadding.top + plotHeight} />;
                                })}
                            </g>
                        )}

                        {thresholdRenderState.bands.length > 0 && (
                            <g className="ts-threshold-bands">
                                {thresholdRenderState.bands.map((band) => (
                                    <rect
                                        key={band.id}
                                        x={chartPadding.left}
                                        y={band.y}
                                        width={plotWidth}
                                        height={band.h}
                                        fill={band.color}
                                        opacity={band.opacity}
                                    />
                                ))}
                            </g>
                        )}

                        {thresholdRenderState.lines.length > 0 && (
                            <g className="ts-threshold-lines">
                                {thresholdRenderState.lines.map((line) => (
                                    <g key={`${line.id}-line`}>
                                        <line
                                            x1={chartPadding.left}
                                            y1={line.y}
                                            x2={chartPadding.left + plotWidth}
                                            y2={line.y}
                                            stroke={line.color}
                                            strokeWidth="1.1"
                                            strokeDasharray="4 3"
                                            opacity="0.95"
                                        />
                                        <text
                                            x={chartPadding.left + plotWidth - 4}
                                            y={Math.max(chartPadding.top + 10, line.y - 5)}
                                            textAnchor="end"
                                            fill={line.color}
                                            style={{ fontSize: '10px' }}
                                        >
                                            {`${line.label}: ${formatLegendNumber(line.value)}`}
                                        </text>
                                    </g>
                                ))}
                            </g>
                        )}

                        <g className="ts-axis-labels">
                            {hasLeftAxis && Array.from({ length: yTicks + 1 }).map((_, idx) => {
                                const y = chartPadding.top + ((plotHeight / yTicks) * idx);
                                const value = safeYMax - (((safeYMax - yMin) / yTicks) * idx);
                                return (
                                    <text key={`yl-${idx}`} x={chartPadding.left - 8} y={y + 4} textAnchor="end">
                                        {formatLegendNumber(value)}
                                    </text>
                                );
                            })}
                            {hasRightAxis && Array.from({ length: yTicks + 1 }).map((_, idx) => {
                                const y = chartPadding.top + ((plotHeight / yTicks) * idx);
                                const value = rightSafeYMax - (((rightSafeYMax - rightYMin) / yTicks) * idx);
                                return (
                                    <text key={`yr-${idx}`} x={Math.max(chartPadding.left + plotWidth + 8, bodySize.width - 4)} y={y + 4} textAnchor="end">
                                        {formatLegendNumber(value)}
                                    </text>
                                );
                            })}
                            {Array.from({ length: xTicks + 1 }).map((_, idx) => {
                                const t = viewTimeFrom + (((safeViewTimeTo - viewTimeFrom) / xTicks) * idx);
                                const label = new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const x = chartPadding.left + ((plotWidth / xTicks) * idx);
                                return (
                                    <text key={`xl-${idx}`} x={x} y={chartPadding.top + plotHeight + 16} textAnchor={idx === 0 ? 'start' : (idx === xTicks ? 'end' : 'middle')}>
                                        {label}
                                    </text>
                                );
                            })}
                        </g>

                        <g className="ts-series-layer">
                            {seriesRenderState.map((serie) => {
                                const points = serie.renderPoints;
                                if (points.length === 0) {
                                    return null;
                                }

                                const drawStyle = serie.drawStyle;
                                const lineWidth = serie.lineWidth;
                                const fillOpacity = serie.fillOpacity;
                                const color = serie.color;
                                const key = serie.id;
                                const useRightAxis = serie.axis === 'right';
                                const yScale = useRightAxis ? scaleYRight : scaleY;
                                const axisMin = useRightAxis ? rightYMin : yMin;
                                const interpolation = ['linear', 'smooth', 'step'].includes(serie.lineInterpolation) ? serie.lineInterpolation : 'linear';
                                const isStacked = serie.isStacked === true;

                                if (drawStyle === 'bars') {
                                    const minSpacing = points.length > 1
                                        ? points.reduce((acc, point, idx) => {
                                            if (idx === 0) {
                                                return acc;
                                            }
                                            const spacing = Math.abs(scaleX(point.t) - scaleX(points[idx - 1].t));
                                            return spacing > 0 ? Math.min(acc, spacing) : acc;
                                        }, Infinity)
                                        : 6;
                                    const barWidth = Math.max(2, Math.min(14, (Number.isFinite(minSpacing) ? minSpacing : 6) * 0.68));
                                    return (
                                        <g key={key}>
                                            {points.map((point, idx) => {
                                                const x = scaleX(point.t);
                                                const y = yScale(point.v);
                                                const barBaseValue = Number.isFinite(point.baseV)
                                                    ? point.baseV
                                                    : Math.max(0, axisMin);
                                                const baseY = yScale(barBaseValue);
                                                const rectY = Math.min(y, baseY);
                                                const h = Math.abs(baseY - y);
                                                return (
                                                    <rect
                                                        key={`${key}-bar-${idx}`}
                                                        x={x - (barWidth / 2)}
                                                        y={rectY}
                                                        width={barWidth}
                                                        height={Math.max(1, h)}
                                                        fill={color}
                                                        opacity="0.82"
                                                    />
                                                );
                                            })}
                                        </g>
                                    );
                                }

                                const linePath = buildLinePath(points, scaleX, yScale, interpolation);
                                const areaPath = fillOpacity > 0
                                    ? (isStacked
                                        ? buildStackAreaPath(points, scaleX, yScale)
                                        : buildAreaPath(points, scaleX, yScale, chartPadding.top + plotHeight, interpolation))
                                    : '';

                                return (
                                    <g key={key}>
                                        {areaPath !== '' && <path d={areaPath} fill={color} opacity={fillOpacity.toFixed(2)} />}
                                        {drawStyle !== 'points' && <path d={linePath} fill="none" stroke={color} strokeWidth={lineWidth} strokeLinejoin="round" strokeLinecap="round" />}
                                        {drawStyle === 'points' && serie.markerPoints
                                            .map((point, idx) => (
                                                <circle
                                                    key={`${key}-pt-${idx}`}
                                                    cx={scaleX(point.t)}
                                                    cy={yScale(point.v)}
                                                    r={drawStyle === 'points' ? Math.max(3, lineWidth * 0.9) : Math.max(2.2, lineWidth * 0.75)}
                                                    fill={color}
                                                    stroke="rgba(8, 12, 18, 0.9)"
                                                    strokeWidth="1.2"
                                                    opacity="0.96"
                                                />
                                            ))}
                                    </g>
                                );
                            })}
                        </g>

                        {percentileLines.map((line, idx) => {
                            const useRightAxis = line.axis === 'right';
                            const axisMin = useRightAxis ? rightYMin : yMin;
                            const axisMax = useRightAxis ? rightSafeYMax : safeYMax;
                            if (!Number.isFinite(line.value) || line.value < axisMin || line.value > axisMax) {
                                return null;
                            }

                            const yLine = useRightAxis ? scaleYRight(line.value) : scaleY(line.value);
                            return (
                                <g className="ts-percentile-layer" key={line.id}>
                                    <line
                                        x1={chartPadding.left}
                                        y1={yLine}
                                        x2={chartPadding.left + plotWidth}
                                        y2={yLine}
                                        stroke={line.color}
                                        strokeWidth="1.2"
                                        strokeDasharray="6 4"
                                        opacity="0.85"
                                    />
                                    <text
                                        x={chartPadding.left + plotWidth - 4}
                                        y={Math.max(chartPadding.top + 10, yLine - (6 + (idx * 12)))}
                                        textAnchor="end"
                                        fill={line.color}
                                        opacity="0.92"
                                        style={{ fontSize: '11px' }}
                                    >
                                        {`${line.shortLabel}: ${formatLegendNumber(line.value)}`}
                                    </text>
                                </g>
                            );
                        })}

                        {(hoverState && !dragZoom) && (
                            <g className="ts-crosshair">
                                <line className="ts-crosshair-line" x1={hoverState.x} y1={chartPadding.top} x2={hoverState.x} y2={chartPadding.top + plotHeight} />
                                <line className="ts-crosshair-line" x1={chartPadding.left} y1={hoverState.y} x2={chartPadding.left + plotWidth} y2={hoverState.y} />
                            </g>
                        )}

                        {brushBounds && (
                            <g className="ts-brush-layer">
                                <rect className="ts-brush-rect" x={brushBounds.x} y={brushBounds.y} width={brushBounds.w} height={brushBounds.h} />
                            </g>
                        )}

                        <rect
                            className="ts-hover-target"
                            x={chartPadding.left}
                            y={chartPadding.top}
                            width={plotWidth}
                            height={plotHeight}
                            onMouseDown={onChartMouseDown}
                            onMouseMove={onChartMouseMove}
                            onMouseUp={onChartMouseUp}
                            onMouseLeave={onChartMouseLeave}
                            onDoubleClick={onChartDoubleClick}
                        />
                    </svg>

                    {hasZoom && !editMode && (
                        <button className="btn-zbx ts-zoom-reset" onClick={() => setZoomRange(null)}>Reset zoom</button>
                    )}

                    {!dragZoom && tooltipData && tooltipStyle && (
                        <div className="ts-tooltip" style={tooltipStyle}>
                            <div className="ts-tooltip-time">{new Date(tooltipData.time * 1000).toLocaleString()}</div>
                            {tooltipData.rows.map((row) => (
                                <div className="ts-tooltip-row" key={row.id}>
                                    <span className="ts-tooltip-color" style={{ background: row.color }} />
                                    <span className="ts-tooltip-label">{row.label}</span>
                                    <span className="ts-tooltip-value">{formatLegendNumber(Number(row.point.v))}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {loading && <div className="ts-overlay-msg">Loading...</div>}
                    {!loading && error && <div className="ts-overlay-msg ts-error">{error}</div>}

                    {cfg.legendMode !== 'hidden' && (visibleLegendRows.length > 0 || percentileLines.length > 0) && (
                        <div className={`ts-legend ts-legend-${cfg.legendMode}`}>
                            {cfg.legendMode === 'table' ? (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Series</th>
                                            <th>Min</th>
                                            <th>Max</th>
                                            <th>Last</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleLegendRows.map((row) => (
                                            <tr key={row.id}>
                                                <td><span className="ts-legend-dot" style={{ background: row.color }} />{row.label}</td>
                                                <td>{formatLegendNumber(row.min)}</td>
                                                <td>{formatLegendNumber(row.max)}</td>
                                                <td>{formatLegendNumber(row.last)}</td>
                                            </tr>
                                        ))}
                                        {percentileLines.filter((line) => line.showInLegend).map((line) => (
                                            <tr key={`pct-row-${line.id}`}>
                                                <td><span className="ts-legend-dot" style={{ background: line.color }} />{line.label}</td>
                                                <td colSpan="2">-</td>
                                                <td>{formatLegendNumber(line.value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <>
                                    {visibleLegendRows.map((row) => (
                                        <div className="ts-legend-chip" key={row.id}>
                                            <span className="ts-legend-dot" style={{ background: row.color }} />
                                            <span>{row.label}</span>
                                            <span>{formatLegendNumber(row.last)}</span>
                                        </div>
                                    ))}
                                    {percentileLines.filter((line) => line.showInLegend).map((line) => (
                                        <div className="ts-legend-chip" key={`pct-chip-${line.id}`}>
                                            <span className="ts-legend-dot" style={{ background: line.color }} />
                                            <span>{line.label}</span>
                                            <span>{formatLegendNumber(line.value)}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {editMode && (() => {
                        const drawer = (
                            <aside className="ts-editor-drawer">
                            <div className="ts-editor-head">
                                <strong>Edit Time series</strong>
                                <button className="btn-zbx" onClick={() => setEditMode(false)}>Done</button>
                            </div>

                            {renderEditorSection('query', 'Query', (
                                <>
                                    <div className="editor-label">Name</div>
                                    <div className="editor-control"><input type="text" value={cfg.name} onChange={(e) => updateSettings({ name: e.target.value })} /></div>

                                    <div className="editor-label">Host group</div>
                                    <div className="editor-control">
                                        <select value={cfg.groupid} onChange={(e) => updateSettings({ groupid: e.target.value, hostidsCsv: '' })}>
                                            <option value="">All groups</option>
                                            {(Array.isArray(globalData && globalData.groups) ? globalData.groups : []).map((group) => (
                                                <option key={group.groupid} value={group.groupid}>{group.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="editor-label">Hosts</div>
                                    <div className="editor-control">
                                        {HostSelectorField ? (
                                            <HostSelectorField
                                                hosts={hosts}
                                                value={cfg.hostidsCsv}
                                                onChange={(hostidsCsv) => updateSettings({ hostidsCsv })}
                                                disabled={hostsLoading || hosts.length === 0}
                                                buttonLabel="Select hosts"
                                                clearLabel="Clear"
                                            />
                                        ) : (
                                            <select
                                                multiple
                                                size="5"
                                                value={selectedHostIds}
                                                disabled={hostsLoading}
                                                onChange={(e) => {
                                                    const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                                                    updateSettings({ hostidsCsv: values.join(',') });
                                                }}
                                            >
                                                {hosts.map((host) => (
                                                    <option key={host.hostid} value={host.hostid}>{host.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="editor-label">Series</div>
                                    <div className="editor-control">
                                        <div className="ts-series-list">
                                            {seriesConfig.map((row, idx) => (
                                                <div className="ts-series-row" key={row.id}>
                                                    <div className="ts-series-row-top">
                                                        <strong>{`Series ${idx + 1}`}</strong>
                                                        <button className="btn-zbx btn-danger" onClick={() => removeSeriesRow(row.id)}>✕</button>
                                                    </div>

                                                    <div className="ts-series-subsection ts-series-subsection--open">
                                                        <div className="ts-series-subtitle">Host selector / item</div>
                                                        <div className="ts-series-grid">
                                                            <select
                                                                value={row.filterType}
                                                                onChange={(e) => {
                                                                    const next = { ...row, filterType: e.target.value, itemid: '', itemName: '', itemKey: '' };
                                                                    upsertSeriesRow(row.id, next);
                                                                    scheduleSuggestions(next);
                                                                }}
                                                            >
                                                                <option value="key">Item key</option>
                                                                <option value="name">Item name</option>
                                                            </select>

                                                            <input
                                                                type="text"
                                                                value={row.filterValue}
                                                                placeholder="Search item..."
                                                                onFocus={() => setActiveSuggestId(row.id)}
                                                                onChange={(e) => {
                                                                    const next = {
                                                                        ...row,
                                                                        filterValue: e.target.value,
                                                                        itemid: '',
                                                                        itemName: '',
                                                                        itemKey: '',
                                                                        host: ''
                                                                    };
                                                                    upsertSeriesRow(row.id, next);
                                                                    scheduleSuggestions(next);
                                                                }}
                                                            />
                                                        </div>

                                                        <div className="editor-label">Host scope</div>
                                                        <div className="editor-control">
                                                            <select
                                                                value={row.hostid || ''}
                                                                onChange={(e) => {
                                                                    const next = {
                                                                        ...row,
                                                                        hostid: e.target.value,
                                                                        itemid: '',
                                                                        itemName: '',
                                                                        itemKey: '',
                                                                        host: ''
                                                                    };
                                                                    upsertSeriesRow(row.id, next);
                                                                    scheduleSuggestions(next);
                                                                }}
                                                            >
                                                                <option value="">Widget hosts</option>
                                                                {hosts.map((host) => (
                                                                    <option key={`${row.id}-scope-${host.hostid}`} value={host.hostid}>{host.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {activeSuggestId === row.id && Array.isArray(seriesSuggestions[row.id]) && seriesSuggestions[row.id].length > 0 && (
                                                            <div className="ts-suggestions">
                                                                {seriesSuggestions[row.id].map((item) => (
                                                                    <button
                                                                        key={`${row.id}-${item.itemid}`}
                                                                        type="button"
                                                                        className="ts-suggestion-item"
                                                                        onClick={() => {
                                                                            upsertSeriesRow(row.id, {
                                                                                itemid: item.itemid,
                                                                                hostid: item.hostid || row.hostid || '',
                                                                                itemName: item.name,
                                                                                itemKey: item.key_,
                                                                                host: item.host,
                                                                                filterValue: row.filterType === 'name' ? item.name : item.key_,
                                                                                label: row.label || `${item.host} :: ${item.name}`
                                                                            });
                                                                            setSeriesSuggestions((prev) => ({ ...prev, [row.id]: [] }));
                                                                            setActiveSuggestId('');
                                                                        }}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="editor-label">Selected item</div>
                                                        <div className="editor-control ts-selected-item">
                                                            {row.itemid ? `${row.host} :: ${row.itemName} [${row.itemKey}]` : 'No item selected'}
                                                        </div>
                                                    </div>

                                                    {renderSeriesSection(row.id, 'display', 'Display options', (
                                                        <>
                                                            <div className="editor-label">Draw style</div>
                                                            <div className="editor-control">
                                                                <select value={row.drawStyle || 'line'} onChange={(e) => upsertSeriesRow(row.id, { drawStyle: e.target.value })}>
                                                                    <option value="line">Line</option>
                                                                    <option value="points">Points</option>
                                                                    <option value="bars">Bars</option>
                                                                </select>
                                                            </div>

                                                            <div className="editor-label">Color</div>
                                                            <div className="editor-control">
                                                                {ColorPickerField ? (
                                                                    <ColorPickerField value={row.color} defaultColor={DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length]} onChange={(nextColor) => upsertSeriesRow(row.id, { color: nextColor })} />
                                                                ) : (
                                                                    <input type="text" value={row.color} onChange={(e) => upsertSeriesRow(row.id, { color: e.target.value })} />
                                                                )}
                                                            </div>

                                                            <div className="editor-label">Percentile line</div>
                                                            <div className="editor-control">
                                                                <label>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.showPercentileLine === true}
                                                                        onChange={(e) => upsertSeriesRow(row.id, { showPercentileLine: e.target.checked })}
                                                                    /> Show percentile reference line
                                                                </label>
                                                            </div>

                                                            <div className="editor-label">Percentile (%)</div>
                                                            <div className="editor-control">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={Number(row.percentileValue ?? 95)}
                                                                    disabled={row.showPercentileLine !== true}
                                                                    onChange={(e) => {
                                                                        const raw = String(e.target.value || '').trim();
                                                                        if (raw === '') {
                                                                            upsertSeriesRow(row.id, { percentileValue: 95 });
                                                                            return;
                                                                        }
                                                                        const parsed = Number(raw.replace(/,/g, '.'));
                                                                        if (!Number.isFinite(parsed)) {
                                                                            return;
                                                                        }
                                                                        upsertSeriesRow(row.id, { percentileValue: clampInt(parsed, 95, 0, 100) });
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="editor-label">Line width</div>
                                                            <div className="editor-control">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="8"
                                                                    value={Number(row.lineWidth || 2)}
                                                                    onChange={(e) => {
                                                                        const raw = String(e.target.value || '').trim();
                                                                        const parsed = Number(raw);
                                                                        const next = Number.isFinite(parsed) ? clampInt(parsed, 2, 1, 8) : 2;
                                                                        upsertSeriesRow(row.id, { lineWidth: next });
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="editor-label">Fill opacity (%)</div>
                                                            <div className="editor-control">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={Number(row.fillOpacity || 0)}
                                                                    onChange={(e) => {
                                                                        const raw = String(e.target.value || '').trim();
                                                                        const parsed = Number(raw);
                                                                        const next = Number.isFinite(parsed) ? clampInt(parsed, 0, 0, 100) : 0;
                                                                        upsertSeriesRow(row.id, { fillOpacity: next });
                                                                    }}
                                                                />
                                                            </div>
                                                        </>
                                                    ))}

                                                    {renderSeriesSection(row.id, 'axis', 'Y axis options', (
                                                        <>
                                                            <div className="editor-label">Y axis</div>
                                                            <div className="editor-control">
                                                                <select value={row.axis || 'left'} onChange={(e) => upsertSeriesRow(row.id, { axis: e.target.value === 'right' ? 'right' : 'left' })}>
                                                                    <option value="left">Left</option>
                                                                    <option value="right">Right</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    ))}

                                                    {renderSeriesSection(row.id, 'legend', 'Legend options', (
                                                        <>
                                                            <div className="editor-label">Display label</div>
                                                            <div className="editor-control"><input type="text" value={row.label} onChange={(e) => upsertSeriesRow(row.id, { label: e.target.value })} /></div>

                                                            <div className="editor-label">Show in legend</div>
                                                            <div className="editor-control">
                                                                <label>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.showInLegend !== false}
                                                                        onChange={(e) => upsertSeriesRow(row.id, { showInLegend: e.target.checked })}
                                                                    /> Enabled
                                                                </label>
                                                            </div>
                                                        </>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn-zbx" onClick={addSeriesRow} disabled={seriesConfig.length >= MAX_SERIES}>Add series</button>
                                    </div>
                                </>
                            ))}

                            {renderEditorSection('display', 'Display global', (
                                <>
                                    <div className="editor-label">Stack mode</div>
                                    <div className="editor-control">
                                        <select value={cfg.stackMode || 'off'} onChange={(e) => updateSettings({ stackMode: e.target.value })}>
                                            <option value="off">Off</option>
                                            <option value="normal">Normal</option>
                                            <option value="percent">Percent</option>
                                        </select>
                                    </div>

                                    <div className="editor-label">Line interpolation</div>
                                    <div className="editor-control">
                                        <select value={cfg.lineInterpolation || 'linear'} onChange={(e) => updateSettings({ lineInterpolation: e.target.value })}>
                                            <option value="linear">Linear</option>
                                            <option value="smooth">Smooth</option>
                                            <option value="step">Step</option>
                                        </select>
                                    </div>

                                    <div className="editor-label">Show grid</div>
                                    <div className="editor-control"><label><input type="checkbox" checked={cfg.showGrid} onChange={(e) => updateSettings({ showGrid: e.target.checked })} /> Grid lines</label></div>
                                </>
                            ))}

                            {renderEditorSection('axis', 'Axis & range global', (
                                <>
                                    <div className="editor-label">Lookback (hours)</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="1"
                                            max="336"
                                            value={lookbackDraft}
                                            onChange={(e) => setLookbackDraft(e.target.value)}
                                            onBlur={commitLookbackDraft}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitLookbackDraft();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="editor-label">History points</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="50"
                                            max="2000"
                                            value={historyPointsDraft}
                                            onChange={(e) => setHistoryPointsDraft(e.target.value)}
                                            onBlur={commitHistoryPointsDraft}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitHistoryPointsDraft();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="editor-label">Y min (global)</div>
                                    <div className="editor-control"><input type="text" value={cfg.yMin} placeholder="auto" onChange={(e) => updateSettings({ yMin: e.target.value })} /></div>

                                    <div className="editor-label">Y max (global)</div>
                                    <div className="editor-control"><input type="text" value={cfg.yMax} placeholder="auto" onChange={(e) => updateSettings({ yMax: e.target.value })} /></div>

                                    <div className="editor-label">Thresholds</div>
                                    <div className="editor-control">
                                        <div className="editor-picker-panel">
                                            {thresholdRows.length === 0 && (
                                                <div className="editor-subtle">No thresholds configured.</div>
                                            )}
                                            {thresholdRows.length > 0 && (
                                                <div className="ts-threshold-head">
                                                    <span>Value</span>
                                                    <span>Label</span>
                                                    <span>Fill %</span>
                                                    <span>Color</span>
                                                    <span />
                                                </div>
                                            )}
                                            {thresholdRows.map((row) => (
                                                <div className="ts-threshold-row" key={row.id}>
                                                    <input
                                                        type="number"
                                                        min="-9999"
                                                        max="9999"
                                                        step="0.01"
                                                        value={Number(row.value)}
                                                        onChange={(e) => {
                                                            const parsed = Number(String(e.target.value || '').replace(/,/g, '.'));
                                                            if (Number.isFinite(parsed)) {
                                                                patchThresholdRow(row.id, { value: Math.max(-9999, Math.min(9999, parsed)) });
                                                            }
                                                        }}
                                                        placeholder="0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={row.label}
                                                        maxLength={4}
                                                        onChange={(e) => patchThresholdRow(row.id, { label: String(e.target.value || '').slice(0, 4) })}
                                                        placeholder="T1"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={Number(row.fill)}
                                                        onChange={(e) => {
                                                            const parsed = Number(String(e.target.value || '').replace(/,/g, '.'));
                                                            const nextFill = Number.isFinite(parsed) ? clampInt(parsed, 12, 0, 100) : 12;
                                                            patchThresholdRow(row.id, { fill: nextFill });
                                                        }}
                                                        placeholder="0"
                                                    />
                                                    {ColorPickerField ? (
                                                        <ColorPickerField
                                                            value={row.color}
                                                            defaultColor="#E24D42"
                                                            onChange={(nextColor) => patchThresholdRow(row.id, { color: nextColor })}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={row.color}
                                                            onChange={(e) => patchThresholdRow(row.id, { color: e.target.value })}
                                                            placeholder="#E24D42"
                                                        />
                                                    )}
                                                    <button className="btn-zbx btn-danger" type="button" onClick={() => removeThresholdRow(row.id)}>✕</button>
                                                </div>
                                            ))}
                                            <button className="btn-zbx" type="button" onClick={addThresholdRow} disabled={thresholdRows.length >= 12}>Add threshold</button>
                                        </div>
                                    </div>
                                </>
                            ))}

                            {renderEditorSection('legend', 'Panel legend', (
                                <>
                                    <div className="editor-label">Legend mode</div>
                                    <div className="editor-control">
                                        <select value={cfg.legendMode} onChange={(e) => updateSettings({ legendMode: e.target.value })}>
                                            <option value="list">List</option>
                                            <option value="table">Table</option>
                                            <option value="hidden">Hidden</option>
                                        </select>
                                    </div>

                                    <div className="editor-label">Refresh (sec)</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="5"
                                            max="3600"
                                            value={refreshSecDraft}
                                            onChange={(e) => setRefreshSecDraft(e.target.value)}
                                            onBlur={commitRefreshSecDraft}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitRefreshSecDraft();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="editor-label">Show header</div>
                                    <div className="editor-control"><label><input type="checkbox" checked={cfg.showHeader} onChange={(e) => updateSettings({ showHeader: e.target.checked })} /> Header</label></div>
                                </>
                            ))}
                            </aside>
                        );
                        if (editorHost && ReactDOM && typeof ReactDOM.createPortal === 'function') {
                            return ReactDOM.createPortal(drawer, editorHost);
                        }
                        return null;
                    })()}
                </div>
            </div>
        );
    };

    return {
        DEFAULTS,
        sanitizeSettings
    };
})();
