'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';


interface StoreContextType {
  stores: any[];
  selectedStoreId: string;
  setSelectedStoreId: (id: string) => void;
  loadingStores: boolean;
  isOwner: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); // Get user info
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loadingStores, setLoadingStores] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('http://localhost:5000/api/employees/my-stores', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        const data = json.data || json;

        if (Array.isArray(data)) {
          setStores(data);
          
          // Persistence Logic:
          const savedId = localStorage.getItem('lastSelectedStoreId');
          if (savedId && data.find(s => s.Id.toString() === savedId)) {
            setSelectedStoreId(savedId);
          } else if (data.length > 0) {
            setSelectedStoreId(data[0].Id.toString());
          }
        }
      } catch (e) {
        console.error("Store Fetch Error:", e);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  // Custom setter that also saves to localStorage
  const handleSetSelectedStore = (id: string) => {
    setSelectedStoreId(id);
    localStorage.setItem('lastSelectedStoreId', id);
  };

    const isOwner = user?.AuthLv === 1 || user?.AuthLv === "1";
    console.log("DEBUG -> User Level:", user?.AuthLv, "Type:", typeof user?.AuthLv, "isOwner:", isOwner);
  return (
    <StoreContext.Provider value={{ 
      stores, 
      selectedStoreId, 
      setSelectedStoreId: handleSetSelectedStore, 
      loadingStores,
      isOwner
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStores() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  return context;
}