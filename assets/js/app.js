const { useState, useEffect } = React;

function ZabbixWidget({ title }) {
    const [status, setStatus] = useState('Standby');
    const [count, setCount] = useState(0);

    return (
        <div style={{ padding: '20px', backgroundColor: '#f3f6f8', border: '1px solid #dfe4e7' }}>
            <h2 style={{ color: '#1f2c33' }}>{title}</h2>
            <p>Status: <strong>{status}</strong></p>
            <p>Klikjes: {count}</p>
            
            <button 
                className="btn-alt"
                onClick={() => {
                    setCount(count + 1);
                    setStatus('Bezig met tellen...');
                }}
            >
                Verhoog teller
            </button>
        </div>
    );
}

// Render de app in de div uit de PHP view
const root = ReactDOM.createRoot(document.getElementById('react-root'));
root.render(<ZabbixWidget title="Mijn React Dashboard Widget" />);
