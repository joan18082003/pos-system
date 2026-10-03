import { createContext, useContext, useState, useCallback } from 'react';

// 1. Creamos el "contenedor" del contexto
const AuthContext = createContext(null);

// 2. Creamos el "Proveedor" que envolverá toda la app y compartirá el estado
export function AuthProvider({ children }) {
  // Intentamos cargar la sesión guardada desde el almacenamiento del navegador
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('pos_token') || null);

  // Función de Login: guarda los datos en el estado y en el navegador
  const login = useCallback((userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('pos_user', JSON.stringify(userData));
    localStorage.setItem('pos_token', userToken);
  }, []);

  // Función de Logout: limpia todo
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_token');
  }, []);

  // Ponemos a disposición de toda la app: el usuario, el token, y las funciones
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Hook personalizado para acceder fácilmente al contexto desde cualquier componente
export const useAuth = () => useContext(AuthContext);
