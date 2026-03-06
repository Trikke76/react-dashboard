window.ReactDashboardColorPickerField = ({
    value,
    onChange,
    defaultColor = '#607D8B'
}) => {
    const { useMemo } = React;

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

    const normalizedDefault = useMemo(() => normalizeColor(defaultColor, '#607D8B'), [defaultColor]);
    const normalizedValue = useMemo(() => normalizeColor(value, normalizedDefault), [value, normalizedDefault]);

    const commitColor = (raw) => {
        const next = normalizeColor(raw, normalizedDefault);
        if (typeof onChange === 'function') {
            onChange(next);
        }
    };

    return (
        <div className="zbx-color-picker">
            <span className="zbx-color-preview" style={{ background: normalizedValue }} />
            <input
                className="zbx-color-native"
                type="color"
                value={normalizedValue}
                onChange={(event) => commitColor(event.target.value)}
            />
        </div>
    );
};
