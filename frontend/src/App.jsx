import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Attendance from './pages/Attendance';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';

// Componente raíz que decide qué mostrar según si el usuario está logueado
function AppContent() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('inventory');

  // Si no hay usuario logueado, mostramos la pantalla de Login
  if (!user) {
    return <Login onLoginSuccess={() => setCurrentPage('inventory')} />;
  }

  // Si hay usuario, mostramos la app completa con Navbar
  const renderPage = () => {
    switch (currentPage) {
      case 'inventory': return <Inventory />;
      case 'attendance': return <Attendance />;
      case 'pos': return <POS />;
      case 'dashboard': 
        return user.role === 'admin' ? <Dashboard /> : <POS />;
      default: return <Inventory />;
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      {/* Margen para que el contenido no quede debajo del Navbar fijo */}
      <main style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', background: 'var(--bg-color)' }}>
        {renderPage()}
      </main>
    </div>
  );
}

// Envolvemos todo con el AuthProvider para que funcione el contexto
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
