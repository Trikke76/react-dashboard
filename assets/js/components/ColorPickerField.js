window.ReactDashboardColorPickerField = ({
    value,
    onChange,
    defaultColor = '#607D8B'
}) => {
    const { useMemo, useState, useEffect, useRef } = React;

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

    const rootRef = useRef(null);
    const normalizedDefault = useMemo(() => normalizeColor(defaultColor, '#607D8B'), [defaultColor]);
    const normalizedValue = useMemo(() => normalizeColor(value, normalizedDefault), [value, normalizedDefault]);

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('colors');
    const [customHex, setCustomHex] = useState(normalizedValue);

    useEffect(() => {
        setCustomHex(normalizedValue);
    }, [normalizedValue, isOpen]);

    useEffect(() => {
        const onDocumentMouseDown = (event) => {
            if (!rootRef.current) {
                return;
            }
            if (!rootRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const onDocumentKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
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

    const isCustomValid = /^#[0-9A-F]{6}$/.test(String(customHex || '').trim().toUpperCase());

    return (
        <div className="zbx-color-picker" ref={rootRef}>
            <button
                type="button"
                className="zbx-color-trigger"
                onClick={() => setIsOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={isOpen ? 'true' : 'false'}
            >
                <span className="zbx-color-trigger-swatch" style={{ background: normalizedValue }} />
            </button>

            {isOpen && (
                <div className="zbx-color-popover" role="dialog" aria-label="Color picker">
                    <div className="zbx-color-tabs">
                        <button
                            type="button"
                            className={`zbx-color-tab ${activeTab === 'colors' ? 'active' : ''}`}
                            onClick={() => setActiveTab('colors')}
                        >
                            Colors
                        </button>
                        <button
                            type="button"
                            className={`zbx-color-tab ${activeTab === 'custom' ? 'active' : ''}`}
                            onClick={() => setActiveTab('custom')}
                        >
                            Custom
                        </button>
                    </div>

                    {activeTab === 'colors' ? (
                        <div className="zbx-color-grid">
                            {paletteColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className="zbx-color-swatch"
                                    style={{ background: color }}
                                    onClick={() => {
                                        emitColor(color);
                                        setIsOpen(false);
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="zbx-color-custom">
                            <input
                                type="text"
                                className="zbx-color-custom-input"
                                value={customHex}
                                onChange={(event) => setCustomHex(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && isCustomValid) {
                                        event.preventDefault();
                                        emitColor(customHex);
                                        setIsOpen(false);
                                    }
                                }}
                                placeholder="#607D8B"
                                spellCheck={false}
                                autoComplete="off"
                            />
                            <div className="zbx-color-custom-actions">
                                <button
                                    type="button"
                                    className="zbx-color-custom-btn"
                                    disabled={!isCustomValid}
                                    onClick={() => {
                                        emitColor(customHex);
                                        setIsOpen(false);
                                    }}
                                >
                                    Apply
                                </button>
                                <button
                                    type="button"
                                    className="zbx-color-custom-btn"
                                    onClick={() => setCustomHex(normalizedValue)}
                                >
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
