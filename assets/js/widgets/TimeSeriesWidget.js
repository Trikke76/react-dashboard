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
        drawStyle: 'line',
        lineWidth: 2,
        fillOpacity: 0,
        showPoints: false,
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

    const safeSeriesId = (value, idx) => {
        const raw = String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
        return raw || `series_${idx + 1}`;
    };

    const normalizeSeriesRow = (raw, idx) => {
        const source = (raw && typeof raw === 'object') ? raw : {};
        const drawStyle = ['line', 'points', 'bars'].includes(source.drawStyle) ? source.drawStyle : '';

        return {
            id: safeSeriesId(source.id, idx),
            label: toText(source.label, '', 120),
            itemid: /^\d+$/.test(String(source.itemid || '').trim()) ? String(source.itemid).trim() : '',
            itemName: toText(source.itemName, '', 255),
            itemKey: toText(source.itemKey, '', 255),
            host: toText(source.host, '', 120),
            filterType: source.filterType === 'name' ? 'name' : 'key',
            filterValue: toText(source.filterValue, '', 255),
            color: toHex(source.color, DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length]),
            drawStyle,
            lineWidth: clampInt(source.lineWidth, 0, 0, 8),
            fillOpacity: clampInt(source.fillOpacity, 0, 0, 100),
            showPoints: toBoolean(source.showPoints, false)
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
        const drawStyle = ['line', 'points', 'bars'].includes(base.drawStyle) ? base.drawStyle : DEFAULTS.drawStyle;
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
            drawStyle,
            lineWidth: clampInt(base.lineWidth, DEFAULTS.lineWidth, 1, 8),
            fillOpacity: clampInt(base.fillOpacity, DEFAULTS.fillOpacity, 0, 100),
            showPoints: toBoolean(base.showPoints, DEFAULTS.showPoints),
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

    const buildLinePath = (points, scaleX, scaleY) => {
        if (!Array.isArray(points) || points.length === 0) {
            return '';
        }
        return points
            .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(point.t).toFixed(2)} ${scaleY(point.v).toFixed(2)}`)
            .join(' ');
    };

    const buildAreaPath = (points, scaleX, scaleY, baseY) => {
        if (!Array.isArray(points) || points.length === 0) {
            return '';
        }
        const line = buildLinePath(points, scaleX, scaleY);
        if (line === '') {
            return '';
        }
        const firstX = scaleX(points[0].t).toFixed(2);
        const lastX = scaleX(points[points.length - 1].t).toFixed(2);
        const base = baseY.toFixed(2);
        return `${line} L ${lastX} ${base} L ${firstX} ${base} Z`;
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

    window.TimeSeriesWidget = ({ remove, settings, updateSettings, apiClient, globalData }) => {
        const { useState, useEffect, useMemo, useRef, useCallback } = React;
        const ColorPickerField = window.ReactDashboardColorPickerField;
        const cfg = { ...DEFAULTS, ...sanitizeSettings(settings || {}) };

        const bodyRef = useRef(null);
        const svgRef = useRef(null);
        const suggestionTimersRef = useRef(new Map());

        const [editMode, setEditMode] = useState(false);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        const [hosts, setHosts] = useState([]);
        const [hostsLoading, setHostsLoading] = useState(false);
        const [seriesSuggestions, setSeriesSuggestions] = useState({});
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
        const [lineWidthDraft, setLineWidthDraft] = useState(String(cfg.lineWidth));
        const [fillOpacityDraft, setFillOpacityDraft] = useState(String(cfg.fillOpacity));
        const [refreshSecDraft, setRefreshSecDraft] = useState(String(cfg.refreshSec));
        const [hoverState, setHoverState] = useState(null);
        const [dragZoom, setDragZoom] = useState(null);
        const [zoomRange, setZoomRange] = useState(null);

        const seriesConfig = useMemo(() => parseSeries(cfg.seriesJson), [cfg.seriesJson]);
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
        };

        const fetchSeriesData = useCallback(async () => {
            const activeSeries = seriesConfig.filter((row) => /^\d+$/.test(String(row.itemid || '')));
            if (activeSeries.length === 0 || selectedHostIds.length === 0) {
                setModel({ series: [], time_from: 0, time_to: 0 });
                setError('Selecteer host(s) en minstens 1 item.');
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
                        color: row.color,
                        drawStyle: row.drawStyle || cfg.drawStyle,
                        lineWidth: row.lineWidth > 0 ? row.lineWidth : cfg.lineWidth,
                        fillOpacity: row.fillOpacity > 0 ? row.fillOpacity : cfg.fillOpacity,
                        showPoints: row.showPoints || cfg.showPoints ? 1 : 0
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
        }, [apiClient, cfg.drawStyle, cfg.fillOpacity, cfg.historyPoints, cfg.lineWidth, cfg.lookbackHours, cfg.showPoints, selectedHostIds, seriesConfig]);

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
                if (filterValue === '' || selectedHostIds.length === 0) {
                    setSeriesSuggestions((prev) => ({ ...prev, [row.id]: [] }));
                    return;
                }

                try {
                    const payload = await apiClient.cachedRequest({
                        action_type: 'timestate_items',
                        hostids_csv: selectedHostIds.join(','),
                        filter_mode: row.filterType === 'name' ? 'name' : 'key',
                        item_filter: filterValue,
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
            setLineWidthDraft(String(cfg.lineWidth));
            setFillOpacityDraft(String(cfg.fillOpacity));
            setRefreshSecDraft(String(cfg.refreshSec));
        }, [cfg.lookbackHours, cfg.historyPoints, cfg.lineWidth, cfg.fillOpacity, cfg.refreshSec, editMode]);

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

        const visibleValues = useMemo(() => {
            const values = [];
            preparedSeries.forEach((serie) => {
                serie.points.forEach((point) => {
                    if (point.t >= viewTimeFrom && point.t <= safeViewTimeTo) {
                        values.push(point.v);
                    }
                });
            });
            if (values.length > 0) {
                return values;
            }
            return preparedSeries.flatMap((serie) => serie.points.map((point) => point.v));
        }, [preparedSeries, viewTimeFrom, safeViewTimeTo]);

        const valueMin = visibleValues.length > 0 ? Math.min(...visibleValues) : 0;
        const valueMax = visibleValues.length > 0 ? Math.max(...visibleValues) : 1;
        const valueRange = Math.max(0, valueMax - valueMin);
        const autoPadding = valueRange > 0 ? valueRange * 0.08 : Math.max(1, Math.abs(valueMax || 1) * 0.02);
        const autoYMin = valueMin - autoPadding;
        const autoYMax = valueMax + autoPadding;

        const customYMin = parseOptionalNumber(cfg.yMin);
        const customYMax = parseOptionalNumber(cfg.yMax);
        const yMin = customYMin !== null ? customYMin : autoYMin;
        const yMax = customYMax !== null ? customYMax : autoYMax;
        const safeYMax = yMax <= yMin ? yMin + 1 : yMax;

        const legendHeight = cfg.legendMode === 'hidden' ? 0 : (cfg.legendMode === 'table' ? 110 : 46);
        const chartPadding = { top: 12, right: 12, bottom: 20 + legendHeight, left: 42 };
        const plotWidth = Math.max(120, bodySize.width - chartPadding.left - chartPadding.right);
        const plotHeight = Math.max(90, bodySize.height - chartPadding.top - chartPadding.bottom);

        const scaleX = (timestamp) => chartPadding.left + (((Number(timestamp) - viewTimeFrom) / (safeViewTimeTo - viewTimeFrom)) * plotWidth);
        const scaleY = (value) => chartPadding.top + (plotHeight - (((Number(value) - yMin) / (safeYMax - yMin)) * plotHeight));

        const yTicks = 5;
        const xTicks = 6;

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
                last,
                min,
                max
            };
        }), [preparedSeries, viewTimeFrom, safeViewTimeTo]);

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

        const commitLineWidthDraft = () => {
            const raw = String(lineWidthDraft || '').trim();
            if (raw === '') {
                setLineWidthDraft(String(cfg.lineWidth));
                return;
            }
            const parsed = Number(raw.replace(/,/g, '.'));
            if (!Number.isFinite(parsed)) {
                setLineWidthDraft(String(cfg.lineWidth));
                return;
            }
            const next = clampInt(parsed, cfg.lineWidth, 1, 8);
            setLineWidthDraft(String(next));
            if (next !== Number(cfg.lineWidth)) {
                updateSettings({ lineWidth: next });
            }
        };

        const commitFillOpacityDraft = () => {
            const raw = String(fillOpacityDraft || '').trim();
            if (raw === '') {
                setFillOpacityDraft(String(cfg.fillOpacity));
                return;
            }
            const parsed = Number(raw.replace(/,/g, '.'));
            if (!Number.isFinite(parsed)) {
                setFillOpacityDraft(String(cfg.fillOpacity));
                return;
            }
            const next = clampInt(parsed, cfg.fillOpacity, 0, 100);
            setFillOpacityDraft(String(next));
            if (next !== Number(cfg.fillOpacity)) {
                updateSettings({ fillOpacity: next });
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

                        <g className="ts-axis-labels">
                            {Array.from({ length: yTicks + 1 }).map((_, idx) => {
                                const y = chartPadding.top + ((plotHeight / yTicks) * idx);
                                const value = safeYMax - (((safeYMax - yMin) / yTicks) * idx);
                                return (
                                    <text key={`yl-${idx}`} x={chartPadding.left - 8} y={y + 4} textAnchor="end">
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
                            {preparedSeries.map((serie) => {
                                const points = serie.points.filter((point) => point.t >= viewTimeFrom && point.t <= safeViewTimeTo);
                                if (points.length === 0) {
                                    return null;
                                }

                                const drawStyle = ['line', 'points', 'bars'].includes(serie.draw_style) ? serie.draw_style : cfg.drawStyle;
                                const lineWidth = clampInt(serie.line_width, cfg.lineWidth, 1, 8);
                                const fillOpacity = clampInt(serie.fill_opacity, cfg.fillOpacity, 0, 100) / 100;
                                const showPoints = Boolean(Number(serie.show_points)) || cfg.showPoints;
                                const color = serie.color;
                                const key = serie.id;

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
                                    const baseY = scaleY(Math.max(0, yMin));
                                    return (
                                        <g key={key}>
                                            {points.map((point, idx) => {
                                                const x = scaleX(point.t);
                                                const y = scaleY(point.v);
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

                                const linePath = buildLinePath(points, scaleX, scaleY);
                                const areaPath = fillOpacity > 0 ? buildAreaPath(points, scaleX, scaleY, chartPadding.top + plotHeight) : '';

                                return (
                                    <g key={key}>
                                        {areaPath !== '' && <path d={areaPath} fill={color} opacity={fillOpacity.toFixed(2)} />}
                                        {drawStyle !== 'points' && <path d={linePath} fill="none" stroke={color} strokeWidth={lineWidth} strokeLinejoin="round" strokeLinecap="round" />}
                                        {(drawStyle === 'points' || showPoints) && points
                                            .filter((_, idx) => points.length <= 1200 || idx % Math.ceil(points.length / 1200) === 0)
                                            .map((point, idx) => (
                                                <circle
                                                    key={`${key}-pt-${idx}`}
                                                    cx={scaleX(point.t)}
                                                    cy={scaleY(point.v)}
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

                    {cfg.legendMode !== 'hidden' && (
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
                                        {legendRows.map((row) => (
                                            <tr key={row.id}>
                                                <td><span className="ts-legend-dot" style={{ background: row.color }} />{row.label}</td>
                                                <td>{formatLegendNumber(row.min)}</td>
                                                <td>{formatLegendNumber(row.max)}</td>
                                                <td>{formatLegendNumber(row.last)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                legendRows.map((row) => (
                                    <div className="ts-legend-chip" key={row.id}>
                                        <span className="ts-legend-dot" style={{ background: row.color }} />
                                        <span>{row.label}</span>
                                        <span>{formatLegendNumber(row.last)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {editMode && (
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

                                                    <div className="editor-label">Label</div>
                                                    <div className="editor-control"><input type="text" value={row.label} onChange={(e) => upsertSeriesRow(row.id, { label: e.target.value })} /></div>

                                                    <div className="editor-label">Color</div>
                                                    <div className="editor-control">
                                                        {ColorPickerField ? (
                                                            <ColorPickerField value={row.color} defaultColor={DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length]} onChange={(nextColor) => upsertSeriesRow(row.id, { color: nextColor })} />
                                                        ) : (
                                                            <input type="text" value={row.color} onChange={(e) => upsertSeriesRow(row.id, { color: e.target.value })} />
                                                        )}
                                                    </div>

                                                    <div className="editor-label">Selected item</div>
                                                    <div className="editor-control ts-selected-item">
                                                        {row.itemid ? `${row.host} :: ${row.itemName} [${row.itemKey}]` : 'No item selected'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn-zbx" onClick={addSeriesRow} disabled={seriesConfig.length >= MAX_SERIES}>Add series</button>
                                    </div>
                                </>
                            ))}

                            {renderEditorSection('display', 'Display', (
                                <>
                                    <div className="editor-label">Draw style</div>
                                    <div className="editor-control">
                                        <select value={cfg.drawStyle} onChange={(e) => updateSettings({ drawStyle: e.target.value })}>
                                            <option value="line">Line</option>
                                            <option value="points">Points</option>
                                            <option value="bars">Bars</option>
                                        </select>
                                    </div>

                                    <div className="editor-label">Line width</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="1"
                                            max="8"
                                            value={lineWidthDraft}
                                            onChange={(e) => setLineWidthDraft(e.target.value)}
                                            onBlur={commitLineWidthDraft}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitLineWidthDraft();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="editor-label">Fill opacity (%)</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={fillOpacityDraft}
                                            onChange={(e) => setFillOpacityDraft(e.target.value)}
                                            onBlur={commitFillOpacityDraft}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitFillOpacityDraft();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="editor-label">Show points</div>
                                    <div className="editor-control"><label><input type="checkbox" checked={cfg.showPoints} onChange={(e) => updateSettings({ showPoints: e.target.checked })} /> Points</label></div>

                                    <div className="editor-label">Show grid</div>
                                    <div className="editor-control"><label><input type="checkbox" checked={cfg.showGrid} onChange={(e) => updateSettings({ showGrid: e.target.checked })} /> Grid lines</label></div>
                                </>
                            ))}

                            {renderEditorSection('axis', 'Axis', (
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

                                    <div className="editor-label">Y min</div>
                                    <div className="editor-control"><input type="text" value={cfg.yMin} placeholder="auto" onChange={(e) => updateSettings({ yMin: e.target.value })} /></div>

                                    <div className="editor-label">Y max</div>
                                    <div className="editor-control"><input type="text" value={cfg.yMax} placeholder="auto" onChange={(e) => updateSettings({ yMax: e.target.value })} /></div>
                                </>
                            ))}

                            {renderEditorSection('legend', 'Legend', (
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
                    )}
                </div>
            </div>
        );
    };

    return {
        DEFAULTS,
        sanitizeSettings
    };
})();
