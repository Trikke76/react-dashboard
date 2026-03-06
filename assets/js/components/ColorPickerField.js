window.ReactDashboardColorPickerField = ({
    value,
    onChange,
    defaultColor = '#607D8B'
}) => {
    const { useMemo, useState, useEffect, useRef, useCallback } = React;

    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

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

    const rgbToHsv = ({ r, g, b }) => {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;

        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;

        let h = 0;
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
            if (h < 0) {
                h += 360;
            }
        }

        const s = max === 0 ? 0 : (delta / max) * 100;
        const v = max * 100;

        return {
            h: clamp(h, 0, 360),
            s: clamp(s, 0, 100),
            v: clamp(v, 0, 100)
        };
    };

    const hsvToRgb = ({ h, s, v }) => {
        const hh = (clamp(h, 0, 360) % 360) / 60;
        const ss = clamp(s, 0, 100) / 100;
        const vv = clamp(v, 0, 100) / 100;

        const c = vv * ss;
        const x = c * (1 - Math.abs((hh % 2) - 1));
        const m = vv - c;

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

    const hsvToHex = (hsv) => rgbToHex(hsvToRgb(hsv));
    const hexToHsv = (hex) => rgbToHsv(hexToRgb(hex));

    const rootRef = useRef(null);
    const svRef = useRef(null);

    const normalizedDefault = useMemo(() => normalizeColor(defaultColor, '#607D8B'), [defaultColor]);
    const normalizedValue = useMemo(() => normalizeColor(value, normalizedDefault), [value, normalizedDefault]);

    const [isOpen, setIsOpen] = useState(false);
    const [isDraggingSv, setIsDraggingSv] = useState(false);
    const [hsv, setHsv] = useState(() => hexToHsv(normalizedValue));

    useEffect(() => {
        setHsv(hexToHsv(normalizedValue));
    }, [normalizedValue]);

    const emitColor = useCallback((nextHsv) => {
        if (typeof onChange === 'function') {
            onChange(hsvToHex(nextHsv));
        }
    }, [onChange]);

    const applySVAt = useCallback((clientX, clientY) => {
        if (!svRef.current) {
            return;
        }

        const rect = svRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return;
        }

        const x = clamp(clientX - rect.left, 0, rect.width);
        const y = clamp(clientY - rect.top, 0, rect.height);
        const s = (x / rect.width) * 100;
        const v = 100 - ((y / rect.height) * 100);

        setHsv((prev) => {
            const next = { ...prev, s, v };
            emitColor(next);
            return next;
        });
    }, [emitColor]);

    useEffect(() => {
        if (!isDraggingSv) {
            return;
        }

        const onMouseMove = (event) => {
            applySVAt(event.clientX, event.clientY);
        };
        const onTouchMove = (event) => {
            if (event.touches && event.touches[0]) {
                applySVAt(event.touches[0].clientX, event.touches[0].clientY);
            }
        };
        const stopDrag = () => setIsDraggingSv(false);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopDrag);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', stopDrag);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', stopDrag);
        };
    }, [isDraggingSv, applySVAt]);

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

    const hueColor = useMemo(() => hsvToHex({ h: hsv.h, s: 100, v: 100 }), [hsv.h]);
    const currentHex = useMemo(() => hsvToHex(hsv), [hsv]);

    const presetColors = ['#2E7D32', '#C62828', '#607D8B', '#F9A825', '#1E88E5', '#8E24AA', '#EF6C00', '#26A69A', '#6D4C41', '#455A64', '#000000', '#FFFFFF'];

    return (
        <div className="zbx-color-picker" ref={rootRef}>
            <span className="zbx-color-preview" style={{ background: currentHex }} />
            <button
                type="button"
                className="zbx-color-trigger"
                onClick={() => setIsOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={isOpen ? 'true' : 'false'}
            >
                <span className="zbx-color-trigger-swatch" style={{ background: currentHex }} />
            </button>

            {isOpen && (
                <div className="zbx-color-popover" role="dialog" aria-label="Color picker">
                    <div
                        className="zbx-color-sv"
                        ref={svRef}
                        style={{ background: hueColor }}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            applySVAt(event.clientX, event.clientY);
                            setIsDraggingSv(true);
                        }}
                        onTouchStart={(event) => {
                            if (event.touches && event.touches[0]) {
                                applySVAt(event.touches[0].clientX, event.touches[0].clientY);
                                setIsDraggingSv(true);
                            }
                        }}
                    >
                        <div className="zbx-color-sv-white" />
                        <div className="zbx-color-sv-black" />
                        <span
                            className="zbx-color-sv-cursor"
                            style={{
                                left: `${hsv.s}%`,
                                top: `${100 - hsv.v}%`,
                                background: currentHex
                            }}
                        />
                    </div>

                    <input
                        className="zbx-color-hue"
                        type="range"
                        min="0"
                        max="360"
                        value={Math.round(hsv.h)}
                        onChange={(event) => {
                            const nextHue = clamp(Number(event.target.value) || 0, 0, 360);
                            setHsv((prev) => {
                                const next = { ...prev, h: nextHue };
                                emitColor(next);
                                return next;
                            });
                        }}
                    />

                    <div className="zbx-color-hue-preview" style={{ background: currentHex }} />

                    <div className="zbx-color-presets">
                        {presetColors.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                className="zbx-color-preset"
                                style={{ background: preset }}
                                onClick={() => {
                                    const next = hexToHsv(preset);
                                    setHsv(next);
                                    emitColor(next);
                                }}
                            />
                        ))}
                    </div>

                    <div className="zbx-color-popover-footer">
                        <button type="button" className="zbx-color-popover-close" onClick={() => setIsOpen(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
