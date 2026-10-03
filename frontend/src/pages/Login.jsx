import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShoppingCart, Lock, UserPlus, UserCheck, Store } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const status = await api.getAuthStatus();
      if (!status.hasUsers) {
        setIsInitialSetup(true);
        setIsRegistering(true);
        setRole('admin');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${api.API_URL || 'http://localhost:5000/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciales incorrectas');
        setLoading(false);
        return;
      }

      login(data.user, data.token);
      onLoginSuccess();
    } catch {
      setError('No se pudo conectar con el servidor.');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await api.registerUser({ name, email, password, role });
      setSuccessMsg('¡Cuenta registrada exitosamente! Iniciando sesión...');
      
      // Auto-login con las credenciales registradas
      const res = await fetch(`${api.API_URL || 'http://localhost:5000/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        login(data.user, data.token);
        onLoginSuccess();
      } else {
        setIsRegistering(false);
      }
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta');
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Logo / Encabezado */}
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            {isInitialSetup ? <Store size={36} color="white" /> : <ShoppingCart size={36} color="white" />}
          </div>
          <h1 style={styles.title}>Sistema POS</h1>
          <p style={styles.subtitle}>
            {isInitialSetup 
              ? 'Configuración Inicial del Negocio' 
              : 'Gestión Comercial & Punto de Venta'}
          </p>
        </div>

        {/* Notificación de Configuración Inicial */}
        {isInitialSetup && (
          <div style={styles.infoBox}>
            🚀 <strong>¡Bienvenido!</strong> No hay usuarios registrados en este sistema. Registra la cuenta del <strong>Dueño / Administrador</strong> para comenzar.
          </div>
        )}

        {/* Pestañas (si no es instalación inicial) */}
        {!isInitialSetup && (
          <div style={styles.tabGroup}>
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(''); setSuccessMsg(''); }}
              style={{ ...styles.tabBtn, ...( !isRegistering ? styles.tabBtnActive : {} ) }}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setError(''); setSuccessMsg(''); }}
              style={{ ...styles.tabBtn, ...( isRegistering ? styles.tabBtnActive : {} ) }}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Formulario de Login o Registro */}
        {isRegistering ? (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Nombre Completo / Negocio</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Juan Pérez / Mi Comercial"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                className="form-input"
                placeholder="dueno@mi-negocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Rol de Usuario</label>
              <select
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="admin">Administrador (Dueño)</option>
                <option value="cashier">Cajero / Empleado</option>
              </select>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}
            {successMsg && <div style={styles.successBox}>{successMsg}</div>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', fontSize: '1rem' }} disabled={loading}>
              <UserPlus size={18} />
              {loading ? 'Registrando...' : (isInitialSetup ? 'Crear Cuenta del Dueño' : 'Registrar Cuenta')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="tu-correo@negocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <button id="login-submit" type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', fontSize: '1rem' }} disabled={loading}>
              <Lock size={18} />
              {loading ? 'Entrando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          Sistema de Punto de Venta — Licencia Comercial v1.0
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    padding: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '1.25rem',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '440px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  iconWrapper: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    borderRadius: '50%',
    width: '72px',
    height: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    boxShadow: '0 8px 20px rgba(37,99,235,0.4)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
    fontSize: '0.9rem',
  },
  infoBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
    lineHeight: '1.4',
  },
  tabGroup: {
    display: 'flex',
    background: '#f1f5f9',
    borderRadius: '0.5rem',
    padding: '4px',
    marginBottom: '1.5rem',
  },
  tabBtn: {
    flex: 1,
    padding: '0.5rem',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '0.9rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: 'white',
    color: '#1e3a5f',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
  },
};
