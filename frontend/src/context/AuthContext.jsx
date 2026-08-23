// =============================================================
// SHIVBAEMPIRE — Auth Context (Direct Collector Access)
// Uses selected Collector identity (Prashant Gadage / Swapnil Gadage)
// =============================================================
import { createContext, useContext } from 'react';
import { useCollector } from './CollectorContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { activeCollector } = useCollector();

  const user = {
    id: activeCollector.id,
    username: activeCollector.username,
    fullName: activeCollector.full_name,
    full_name: activeCollector.full_name,
    mobile: activeCollector.mobile,
    role: 'COLLECTOR',
  };

  const login = async () => user;
  const logout = async () => {};

  const isAdmin = () => true;
  const isCollector = () => true;

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, isAdmin, isCollector }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
