import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/api';
import { ClipboardCheck, LogIn, LogOut, Clock, Users, Calendar, Search } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// VISTA ADMINISTRADOR: tabla de registros de asistencia de empleados
// ──────────────────────────────────────────────────────────────
function AdminAttendanceView({ token }) {
  const today = new Date().toISOString().split('T')[0];
  const [logs, setLogs] = useState([]);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/attendance/logs?date_from=${dateFrom}&date_to=${dateTo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setLogs(data);
    } catch {
      console.error('Error al cargar registros');
    }
    setLoading(false);
  }, [token, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const calcHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '—';
    const diff = (new Date(clockOut) - new Date(clockIn)) / 3600000;
    return `${diff.toFixed(1)} h`;
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Users size={32} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Asistencia de Empleados</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Solo tú (el administrador) puedes ver este registro.
          </p>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> Desde
          </label>
          <input
            type="date"
            className="form-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> Hasta
          </label>
          <input
            type="date"
            className="form-input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button
          id="search-attendance-btn"
          onClick={fetchLogs}
          className="btn btn-primary"
          disabled={loading}
          style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Search size={16} />
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          Registros — {Array.isArray(logs) ? logs.length : 0} resultado{Array.isArray(logs) && logs.length !== 1 ? 's' : ''}
        </h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas trabajadas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(logs) || logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No hay registros para el rango seleccionado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isOpen = !log.clock_out;
                  let displayDate = '—';
                  if (log.date) {
                    try {
                      displayDate = new Date(log.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                    } catch (e) {
                      displayDate = log.date;
                    }
                  }
                  
                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600' }}>{log.employee_name}</td>
                      <td>{displayDate}</td>
                      <td style={{ color: '#16a34a', fontWeight: '500' }}>{fmt(log.clock_in)}</td>
                      <td style={{ color: isOpen ? 'var(--text-muted)' : '#b91c1c', fontWeight: '500' }}>{fmt(log.clock_out)}</td>
                      <td>{calcHours(log.clock_in, log.clock_out)}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.7rem',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          background: isOpen ? '#fef9c3' : '#dcfce7',
                          color: isOpen ? '#a16207' : '#15803d',
                        }}>
                          {isOpen ? '⏳ Turno abierto' : '✅ Completado'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// VISTA EMPLEADO: panel de reloj / marcar entrada y salida
// ──────────────────────────────────────────────────────────────
function EmployeeAttendanceView({ token, user }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) =>
    date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) =>
    date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleClockIn = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/attendance/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setMessage(`⚠️ ${data.error}`); setLoading(false); return; }
      setStatus('in');
      setMessage(`✅ Entrada registrada a las ${new Date(data.time).toLocaleTimeString('es-ES')}`);
    } catch {
      setMessage('❌ Error de conexión con el servidor.');
    }
    setLoading(false);
  };

  const handleClockOut = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/attendance/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setMessage(`⚠️ ${data.error}`); setLoading(false); return; }
      setStatus('out');
      setMessage(`✅ Salida registrada a las ${new Date(data.time).toLocaleTimeString('es-ES')}`);
    } catch {
      setMessage('❌ Error de conexión con el servidor.');
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <ClipboardCheck size={32} color="var(--primary)" />
        <h1 style={{ fontSize: '2rem' }}>Control de Asistencia</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Reloj */}
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white', border: 'none' }}>
          <Clock size={48} color="rgba(255,255,255,0.8)" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '3.5rem', fontWeight: '700', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(currentTime)}
          </p>
          <p style={{ fontSize: '1rem', marginTop: '0.5rem', color: '#bfdbfe', textTransform: 'capitalize' }}>
            {formatDate(currentTime)}
          </p>
          <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>👋 Hola, {user?.name}</p>
          </div>
        </div>

        {/* Botones */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Registrar Turno</h2>

          <button
            id="clock-in-btn"
            onClick={handleClockIn}
            disabled={loading || status === 'in'}
            style={{
              ...btnStyle,
              background: status === 'in' ? '#dcfce7' : 'linear-gradient(135deg, #16a34a, #22c55e)',
              color: status === 'in' ? '#16a34a' : 'white',
              cursor: status === 'in' ? 'not-allowed' : 'pointer',
            }}
          >
            <LogIn size={28} />
            <span>{status === 'in' ? '✓ Entrada Registrada' : 'Marcar Entrada'}</span>
          </button>

          <button
            id="clock-out-btn"
            onClick={handleClockOut}
            disabled={loading || status === 'out' || status === null}
            style={{
              ...btnStyle,
              background: status === 'out' ? '#fee2e2' : 'linear-gradient(135deg, #b91c1c, #ef4444)',
              color: status === 'out' ? '#b91c1c' : 'white',
              cursor: (status === 'out' || status === null) ? 'not-allowed' : 'pointer',
              opacity: status === null ? 0.6 : 1,
            }}
          >
            <LogOut size={28} />
            <span>{status === 'out' ? '✓ Salida Registrada' : 'Marcar Salida'}</span>
          </button>

          {message && (
            <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.9rem', textAlign: 'center' }}>
              {message}
            </div>
          )}
          {!message && status === null && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              Presiona "Marcar Entrada" para comenzar tu turno.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  padding: '1.5rem',
  borderRadius: '1rem',
  border: 'none',
  fontSize: '1.2rem',
  fontWeight: '700',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease',
};

// ──────────────────────────────────────────────────────────────
// COMPONENTE RAÍZ — decide qué vista mostrar según el rol
// ──────────────────────────────────────────────────────────────
export default function Attendance() {
  const { token, user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminAttendanceView token={token} />;
  }
  return <EmployeeAttendanceView token={token} user={user} />;
}
