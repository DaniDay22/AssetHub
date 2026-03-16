'use client'; // Required for Context and LocalStorage

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 2}; SameSite=Lax`;
    localStorage.setItem('token', token);

    try {
      const decoded = jwtDecode(token);
      setUser({ token });
    } catch (error) {
      console.error('Invalid token:', error);
    }
    
    router.push('/dashboard'); // Next.js navigation
  };

  const logout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    localStorage.removeItem('token');
    setUser(null);
    router.push('/auth/login'); // Next.js navigation
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);