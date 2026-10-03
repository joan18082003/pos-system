import { useAuth } from '../context/AuthContext';
import { Package, ClipboardCheck, ShoppingCart, LayoutDashboard, LogOut } from 'lucide-react';

const navItems = [
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'attendance', label: 'Asistencia', icon: ClipboardCheck },
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (item.id === 'dashboard') {
      return user?.role === 'admin';
    }
    return true;
  });

  return (
    <nav style={styles.nav}>
      {/* Logo */}
      <div style={styles.logo}>
        <ShoppingCart size={24} color="white" />
        <span style={styles.logoText}>POS System</span>
      </div>

      {/* Menú */}
      <ul style={styles.menu}>
        {filteredNavItems.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              id={`nav-${id}`}
              onClick={() => onNavigate(id)}
              style={{
                ...styles.menuItem,
                ...(currentPage === id ? styles.menuItemActive : {}),
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Usuario y Logout */}
      <div style={styles.userArea}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'white' }}>{user?.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'capitalize' }}>{user?.role}</p>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    width: '240px',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1e3a5f 0%, #1e40af 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0 0.5rem',
    marginBottom: '2.5rem',
  },
  logoText: {
    color: 'white',
    fontWeight: '700',
    fontSize: '1.2rem',
    letterSpacing: '-0.5px',
  },
  menu: {
    listStyle: 'none',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    color: '#bfdbfe',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  menuItemActive: {
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
  },
  userArea: {
    borderTop: '1px solid rgba(255,255,255,0.15)',
    paddingTop: '1rem',
    marginTop: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1rem',
    flexShrink: 0,
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
};
