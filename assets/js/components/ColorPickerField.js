window.ReactDashboardColorPickerField = ({
    value,
    onChange,
    defaultColor = '#607D8B'
}) => {
    const { useMemo, useState, useEffect, useRef } = React;

    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));
    const normalizeHue = (h) => ((Number(h) % 360) + 360) % 360;

    const normalizeColor = (raw, fallback = '#607D8B') => {
        const trimmed = String(raw || '').trim().toUpperCase();
        if (/^#[0-9A-F]{6}$/.test(trimmed)) {
            return trimmed;
        }

        const compact = trimmed.replace(/^#/, '');
        if (/^[0-9A-F]{3}$/.test(compact)) {
            return `#${compact.split('').map((char) => `${char}${char}`).join('')}`;
        }

        return String(fallback || '#607D8B').toUpperCase();
    };

    const hexToRgb = (hex) => {
        const color = normalizeColor(hex, '#607D8B').slice(1);
        return {
            r: parseInt(color.slice(0, 2), 16),
            g: parseInt(color.slice(2, 4), 16),
            b: parseInt(color.slice(4, 6), 16)
        };
    };

    const rgbToHex = ({ r, g, b }) => {
        const toHex = (num) => clamp(Math.round(num), 0, 255).toString(16).padStart(2, '0').toUpperCase();
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const rgbToHsl = ({ r, g, b }) => {
        const rn = clamp(r, 0, 255) / 255;
        const gn = clamp(g, 0, 255) / 255;
        const bn = clamp(b, 0, 255) / 255;

        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;
        const l = (max + min) / 2;

        let h = 0;
        let s = 0;

        if (delta !== 0) {
            if (max === rn) {
                h = ((gn - bn) / delta) % 6;
            }
            else if (max === gn) {
                h = ((bn - rn) / delta) + 2;
            }
            else {
                h = ((rn - gn) / delta) + 4;
            }

            h *= 60;
            s = delta / (1 - Math.abs((2 * l) - 1));
        }

        return {
            h: normalizeHue(h),
            s: clamp(s * 100, 0, 100),
            l: clamp(l * 100, 0, 100)
        };
    };

    const hslToRgb = ({ h, s, l }) => {
        const hh = normalizeHue(h) / 60;
        const ss = clamp(s, 0, 100) / 100;
        const ll = clamp(l, 0, 100) / 100;

        const c = (1 - Math.abs((2 * ll) - 1)) * ss;
        const x = c * (1 - Math.abs((hh % 2) - 1));
        const m = ll - (c / 2);

        let rp = 0;
        let gp = 0;
        let bp = 0;

        if (hh >= 0 && hh < 1) {
            rp = c; gp = x; bp = 0;
        }
        else if (hh >= 1 && hh < 2) {
            rp = x; gp = c; bp = 0;
        }
        else if (hh >= 2 && hh < 3) {
            rp = 0; gp = c; bp = x;
        }
        else if (hh >= 3 && hh < 4) {
            rp = 0; gp = x; bp = c;
        }
        else if (hh >= 4 && hh < 5) {
            rp = x; gp = 0; bp = c;
        }
        else {
            rp = c; gp = 0; bp = x;
        }

        return {
            r: (rp + m) * 255,
            g: (gp + m) * 255,
            b: (bp + m) * 255
        };
    };

    const rootRef = useRef(null);
    const wheelRef = useRef(null);

    const normalizedDefault = useMemo(() => normalizeColor(defaultColor, '#607D8B'), [defaultColor]);
    const normalizedValue = useMemo(() => normalizeColor(value, normalizedDefault), [value, normalizedDefault]);

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('colors');
    const [customHex, setCustomHex] = useState(normalizedValue);
    const [customHsl, setCustomHsl] = useState(() => rgbToHsl(hexToRgb(normalizedValue)));
    const [harmonyMode, setHarmonyMode] = useState('analog');
    const [isDraggingWheel, setIsDraggingWheel] = useState(false);

    useEffect(() => {
        const nextHsl = rgbToHsl(hexToRgb(normalizedValue));
        setCustomHex(normalizedValue);
        setCustomHsl(nextHsl);
    }, [normalizedValue, isOpen]);

    useEffect(() => {
        const onDocumentMouseDown = (event) => {
            if (!rootRef.current) {
                return;
            }
            if (!rootRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsDraggingWheel(false);
            }
        };

        const onDocumentKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setIsDraggingWheel(false);
            }
        };

        document.addEventListener('mousedown', onDocumentMouseDown);
        document.addEventListener('keydown', onDocumentKeyDown);

        return () => {
            document.removeEventListener('mousedown', onDocumentMouseDown);
            document.removeEventListener('keydown', onDocumentKeyDown);
        };
    }, []);

    const emitColor = (raw) => {
        if (typeof onChange === 'function') {
            onChange(normalizeColor(raw, normalizedDefault));
        }
    };

    const applyHsl = (nextHsl) => {
        const normalizedHsl = {
            h: normalizeHue(nextHsl.h),
            s: clamp(Number(nextHsl.s), 0, 100),
            l: clamp(Number(nextHsl.l), 0, 100)
        };

        const nextHex = rgbToHex(hslToRgb(normalizedHsl));
        setCustomHsl(normalizedHsl);
        setCustomHex(nextHex);
        emitColor(nextHex);
    };

    const applyWheelAt = (clientX, clientY) => {
        if (!wheelRef.current) {
            return;
        }

        const rect = wheelRef.current.getBoundingClientRect();
        const cx = rect.left + (rect.width / 2);
        const cy = rect.top + (rect.height / 2);

        const dx = clientX - cx;
        const dy = clientY - cy;

        if (dx === 0 && dy === 0) {
            return;
        }

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const distance = Math.sqrt((dx * dx) + (dy * dy));
        const maxRadius = Math.max(1, Math.min(rect.width, rect.height) / 2);
        const saturation = clamp((distance / maxRadius) * 100, 0, 100);

        applyHsl({ ...customHsl, h: normalizeHue(angle), s: saturation });
    };

    useEffect(() => {
        if (!isDraggingWheel) {
            return;
        }

        const onMouseMove = (event) => {
            applyWheelAt(event.clientX, event.clientY);
        };

        const stop = () => setIsDraggingWheel(false);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stop);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stop);
        };
    }, [isDraggingWheel, customHsl]);

    const commitCustomHex = () => {
        if (!/^#[0-9A-F]{6}$/.test(String(customHex || '').trim().toUpperCase())) {
            return;
        }

        const nextHex = normalizeColor(customHex, normalizedValue);
        const nextHsl = rgbToHsl(hexToRgb(nextHex));
        setCustomHex(nextHex);
        setCustomHsl(nextHsl);
        emitColor(nextHex);
    };

    const selectColor = (hex, shouldClose = false) => {
        const nextHex = normalizeColor(hex, normalizedValue);
        setCustomHex(nextHex);
        setCustomHsl(rgbToHsl(hexToRgb(nextHex)));
        emitColor(nextHex);
        if (shouldClose) {
            setIsOpen(false);
            setIsDraggingWheel(false);
        }
    };

    const paletteColors = [
        '#991B1B', '#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#7F1D1D', '#9A3412',
        '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#7C2D12', '#9A3412', '#B45309', '#D97706',
        '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#78350F', '#92400E', '#A16207', '#CA8A04', '#EAB308', '#FACC15',
        '#365314', '#3F6212', '#4D7C0F', '#65A30D', '#84CC16', '#A3E635', '#BEF264', '#D9F99D', '#14532D', '#166534',
        '#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#134E4A', '#115E59', '#0F766E', '#0D9488',
        '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#0C4A6E', '#075985', '#0369A1', '#0284C7', '#0EA5E9', '#38BDF8',
        '#7DD3FC', '#BAE6FD', '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE',
        '#3B0764', '#5B21B6', '#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#831843', '#BE185D',
        '#DB2777', '#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#FCE7F3', '#0F172A', '#1E293B', '#334155', '#475569',
        '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'
    ];

    const harmonyModes = [
        { id: 'analog', label: 'Analog' },
        { id: 'mono', label: 'Mono' },
        { id: 'complement', label: 'Complement' },
        { id: 'split', label: 'Split' },
        { id: 'triad', label: 'Triad' }
    ];

    const harmonySwatches = useMemo(() => {
        const base = { ...customHsl };
        const fromHue = (offset) => rgbToHex(hslToRgb({ ...base, h: normalizeHue(base.h + offset) }));

        if (harmonyMode === 'mono') {
            return [22, 34, 46, 58, 70, 82].map((lightness) => rgbToHex(hslToRgb({ ...base, l: lightness })));
        }

        if (harmonyMode === 'complement') {
            return [0, 15, 30, 180, 195, 210].map(fromHue);
        }

        if (harmonyMode === 'split') {
            return [0, 15, 30, 150, 165, 180].map(fromHue);
        }

        if (harmonyMode === 'triad') {
            return [0, 10, 120, 130, 240, 250].map(fromHue);
        }

        return [-30, -15, 0, 15, 30, 45].map(fromHue);
    }, [harmonyMode, customHsl]);

    const wheelMarkerAngle = (customHsl.h * Math.PI) / 180;
    const markerRadiusPercent = (clamp(customHsl.s, 0, 100) / 100) * 44;
    const wheelMarkerX = 50 + (Math.cos(wheelMarkerAngle) * markerRadiusPercent);
    const wheelMarkerY = 50 + (Math.sin(wheelMarkerAngle) * markerRadiusPercent);
    const isCustomValid = /^#[0-9A-F]{6}$/.test(String(customHex || '').trim().toUpperCase());

    return (
        <div className="rd-color-picker" ref={rootRef}>
            <button
                type="button"
                className="rd-color-trigger"
                onClick={() => setIsOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={isOpen ? 'true' : 'false'}
            >
                <span className="rd-color-trigger-swatch" style={{ background: normalizedValue }} />
            </button>

            {isOpen && (
                <div className="rd-color-popover" role="dialog" aria-label="Color picker">
                    <div className="rd-color-tabs">
                        <button
                            type="button"
                            className={`rd-color-tab ${activeTab === 'colors' ? 'active' : ''}`}
                            onClick={() => setActiveTab('colors')}
                        >
                            Colors
                        </button>
                        <button
                            type="button"
                            className={`rd-color-tab ${activeTab === 'custom' ? 'active' : ''}`}
                            onClick={() => setActiveTab('custom')}
                        >
                            Custom
                        </button>
                    </div>

                    {activeTab === 'colors' ? (
                        <div className="rd-color-grid">
                            {paletteColors.map((color, index) => (
                                <button
                                    key={`${color}-${index}`}
                                    type="button"
                                    className="rd-color-swatch"
                                    style={{ background: color }}
                                    onClick={() => selectColor(color, true)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rd-color-custom">
                            <div className="rd-color-custom-top">
                                <input
                                    type="text"
                                    className="rd-color-custom-input"
                                    value={customHex}
                                    onChange={(event) => setCustomHex(event.target.value)}
                                    onBlur={() => {
                                        if (isCustomValid) {
                                            commitCustomHex();
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && isCustomValid) {
                                            event.preventDefault();
                                            commitCustomHex();
                                        }
                                    }}
                                    placeholder="#607D8B"
                                    spellCheck={false}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="rd-color-section-label">Wheel</div>
                            <div className="rd-color-wheel-row">
                                <div
                                    className="rd-color-wheel"
                                    ref={wheelRef}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        applyWheelAt(event.clientX, event.clientY);
                                        setIsDraggingWheel(true);
                                    }}
                                >
                                    <span
                                        className="rd-color-wheel-marker"
                                        style={{
                                            left: `${wheelMarkerX}%`,
                                            top: `${wheelMarkerY}%`,
                                            background: rgbToHex(hslToRgb(customHsl))
                                        }}
                                    />
                                </div>
                                <div className="rd-color-sliders">
                                    <div className="rd-color-slider-row">
                                        <span>S</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={Math.round(customHsl.s)}
                                            onChange={(event) => applyHsl({ ...customHsl, s: Number(event.target.value) })}
                                        />
                                    </div>
                                    <div className="rd-color-slider-row">
                                        <span>L</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={Math.round(customHsl.l)}
                                            onChange={(event) => applyHsl({ ...customHsl, l: Number(event.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rd-color-divider" />
                            <div className="rd-color-section-label">Harmony</div>
                            <div className="rd-color-harmony-modes">
                                {harmonyModes.map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        className={`rd-color-harmony-btn ${harmonyMode === mode.id ? 'active' : ''}`}
                                        onClick={() => setHarmonyMode(mode.id)}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                            <div className="rd-color-harmony-swatches">
                                {harmonySwatches.map((swatch, index) => (
                                    <button
                                        key={`${harmonyMode}-${index}-${swatch}`}
                                        type="button"
                                        className="rd-color-harmony-swatch"
                                        style={{ background: swatch }}
                                        onClick={() => selectColor(swatch, false)}
                                    />
                                ))}
                            </div>

                            <div className="rd-color-custom-actions">
                                <button type="button" className="rd-color-reset-btn" onClick={() => selectColor(normalizedValue, false)}>
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
