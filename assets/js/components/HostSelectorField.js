window.ReactDashboardHostSelectorField = ({ hosts, value, onChange, disabled, buttonLabel, clearLabel, emptySummary, modalTitle }) => {
    const { useMemo, useState } = React;

    const parseCsvIds = (raw) => Array.from(new Set(
        String(raw || '')
            .split(/[\s,]+/)
            .map((token) => token.trim())
            .filter((token) => /^\d+$/.test(token))
    ));

    const normalizedHosts = useMemo(() => (Array.isArray(hosts) ? hosts : [])
        .map((host) => ({
            hostid: String((host && host.hostid) || '').trim(),
            name: String((host && host.name) || '').trim()
        }))
        .filter((host) => /^\d+$/.test(host.hostid) && host.name !== ''), [hosts]);

    const selectedIds = useMemo(() => parseCsvIds(value), [value]);
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredHosts = useMemo(() => {
        const query = String(search || '').trim().toLowerCase();
        if (query === '') {
            return normalizedHosts;
        }
        return normalizedHosts.filter((host) => host.name.toLowerCase().includes(query));
    }, [normalizedHosts, search]);

    const summaryText = useMemo(() => {
        const selectedNames = normalizedHosts
            .filter((host) => selectedSet.has(host.hostid))
            .map((host) => host.name);

        if (selectedNames.length === 0 && selectedSet.size > 0) {
            return `${selectedSet.size} host(s) selected`;
        }
        if (selectedNames.length === 0) {
            return emptySummary || 'No hosts selected';
        }
        if (selectedNames.length <= 3) {
            return selectedNames.join(', ');
        }
        return `${selectedNames.slice(0, 3).join(', ')} +${selectedNames.length - 3}`;
    }, [normalizedHosts, selectedSet, emptySummary]);

    const emit = (idsSet) => {
        if (typeof onChange !== 'function') {
            return;
        }
        const next = Array.from(idsSet)
            .filter((id) => /^\d+$/.test(String(id || '').trim()))
            .sort((a, b) => Number(a) - Number(b))
            .join(',');
        onChange(next);
    };

    const toggleHost = (hostid) => {
        const next = new Set(selectedSet);
        if (next.has(hostid)) {
            next.delete(hostid);
        }
        else {
            next.add(hostid);
        }
        emit(next);
    };

    const selectVisible = () => {
        const next = new Set(selectedSet);
        filteredHosts.forEach((host) => next.add(host.hostid));
        emit(next);
    };

    const clearSelection = () => emit(new Set());

    const openDisabled = !!disabled || normalizedHosts.length === 0;

    return (
        <div className="editor-host-selector-field">
            <div className="editor-inline-actions">
                <button className="btn-zbx" type="button" disabled={openDisabled} onClick={() => setOpen(true)}>
                    {buttonLabel || 'Select hosts'}
                </button>
                <button className="btn-zbx" type="button" disabled={selectedSet.size === 0} onClick={clearSelection}>
                    {clearLabel || 'Clear'}
                </button>
                <span className="editor-subtle">
                    Selected: {selectedSet.size}/{normalizedHosts.length}
                </span>
            </div>
            <div className="editor-subtle">{summaryText}</div>

            {open && (
                <div className="editor-modal-backdrop" onClick={() => setOpen(false)}>
                    <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="editor-modal-header">
                            <strong>{modalTitle || 'Select hosts'}</strong>
                            <button className="btn-zbx btn-danger" type="button" onClick={() => setOpen(false)}>✕</button>
                        </div>

                        <div className="editor-inline-actions" style={{ marginBottom: '8px' }}>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filter hosts..."
                            />
                            <button className="btn-zbx" type="button" onClick={selectVisible} disabled={filteredHosts.length === 0}>Select visible</button>
                            <button className="btn-zbx" type="button" onClick={clearSelection} disabled={selectedSet.size === 0}>{clearLabel || 'Clear'}</button>
                        </div>

                        <div className="editor-host-list editor-host-list--picker">
                            {filteredHosts.length === 0 && <div className="editor-subtle">No hosts match this filter.</div>}
                            {filteredHosts.map((host) => (
                                <label key={host.hostid} className="editor-host-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedSet.has(host.hostid)}
                                        onChange={() => toggleHost(host.hostid)}
                                    />
                                    <span>{host.name}</span>
                                </label>
                            ))}
                        </div>

                        <div className="editor-footer" style={{ marginTop: '10px' }}>
                            <button className="btn-zbx" type="button" onClick={() => setOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
