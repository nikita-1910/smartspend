import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('ss_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('ss_token'));

  function login(tokenVal, userObj) {
    localStorage.setItem('ss_token', tokenVal);
    localStorage.setItem('ss_user', JSON.stringify(userObj));
    setToken(tokenVal);
    setUser(userObj);
  }

  function logout() {
    localStorage.clear();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
