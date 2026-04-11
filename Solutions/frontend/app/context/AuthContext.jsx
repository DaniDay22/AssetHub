'use client'; 

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
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000; // Konvertáljuk a jelenlegi időt másodpercekbe

        // Megnézzük, hogy lejárt-e a token
        if (decoded.exp < currentTime) {
          console.warn("Token expired! Logging out...");
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          setUser(null);
        } else {
          // A token érvényes, beállítjuk a felhasználó adatait
          setUser(decoded);
        }
      } catch (error) {
        // Ha a token érvénytelen, eltávolítjuk és kijelentkeztetjük a felhasználót
        console.error("Invalid token found:", error);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 2}; SameSite=Lax`;
    localStorage.setItem('token', token);
    
    try {
      const decoded = jwtDecode(token);
      setUser(decoded); 
    } catch (error) {
      console.error('Invalid token on login:', error);
    }
    
    window.location.href = '/dashboard'; 
  };

  const logout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/auth/login'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);