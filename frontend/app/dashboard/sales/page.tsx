'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, CreditCard, Banknote, Clock, User, X, Loader2, Trash2, Store, ChevronDown } from 'lucide-react';

export default function SalesFeedPage() {
  // --- MULTI-STORE STATE ---
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // --- SALES STATE ---
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- MODAL & INVENTORY STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [newSale, setNewSale] = useState({
    inventoryId: '',
    quantity: 1,
    paymentMethod: 'Készpénz' // Translated default
  });

  // 1. Fetch Stores on Page Load
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('http://localhost:5000/api/employees/my-stores', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (json.success || Array.isArray(json)) {
          const storeData = json.data || json; 
          setStores(storeData);
          
          if (storeData.length > 0) {
            setSelectedStoreId(storeData[0].Id.toString());
          }
        }
      } catch (err) {
        console.error("Hiba a boltok betöltésekor:", err);
      }
    };

    fetchStores();
  }, []);

  // 2. Fetch Sales WHENEVER the selected store changes
  useEffect(() => {
    const fetchSales = async () => {
      if (!selectedStoreId) return;

      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/sales/History?storeId=${selectedStoreId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (res.ok && json.success) {
          setSales(json.data);
        } else {
          setError(json.error || 'Nem sikerült betölteni az eladásokat.');
        }
      } catch (err) {
        setError('Nem sikerült kapcsolódni a szerverhez.');
      } finally {
        setLoading(false);
      }
    };

    // Reset inventory so it refetches for the new store next time the modal opens
    setInventory([]); 
    fetchSales();
  }, [selectedStoreId]);

  // 3. Fetch Inventory ONLY when the modal is opened (for the selected store)
  useEffect(() => {
    if (isModalOpen && inventory.length === 0 && selectedStoreId) {
      const fetchInventory = async () => {
        setLoadingInventory(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`http://localhost:5000/api/sales/Inventory?storeId=${selectedStoreId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success) setInventory(json.data);
        } catch (err) {
          console.error("Hiba a készlet betöltésekor", err);
        } finally {
          setLoadingInventory(false);
        }
      };
      fetchInventory();
    }
  }, [isModalOpen, selectedStoreId, inventory.length]);

  const handleDeleteSale = async (saleId: number) => {
    if (!window.confirm("Biztosan törlöd ezt az eladást? A termékek visszakerülnek a raktárba.")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/Sales/${saleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        window.location.reload();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Nem sikerült törölni.");
    }
  };

  const filteredSales = sales.filter(sale => {
    const name = sale?.ProductName || '';
    const brand = sale?.ProductBrand || '';
    const seller = sale?.SellerName || '';
    const search = searchTerm.toLowerCase();

    return name.toLowerCase().includes(search) ||
           brand.toLowerCase().includes(search) ||
           seller.toLowerCase().includes(search);
  });

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/sales/Add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newSale)
      });
      
      const json = await res.json();
      
      if (json.success) {
        setIsModalOpen(false); 
        window.location.reload(); 
      } else {
        alert(json.error); 
      }
    } catch (err) {
      alert("Nem sikerült kapcsolódni a szerverhez.");
    }
  };

  return (
    <div className="flex-1 p-8 w-full max-w-7xl mx-auto relative min-h-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          
          
          {/* The Dropdown UI */}
          {stores.length > 0 && (
            <div className="relative group">
              <div className="flex items-center bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-2.5 transition-all cursor-pointer">
                <Store className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                <select 
                  value={selectedStoreId} 
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none appearance-none pr-8 cursor-pointer w-full min-w-[160px]"
                >
                  {stores.map(store => (
                    <option key={store.Id} value={store.Id} className="bg-slate-800 text-white">
                      {store.Name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 pointer-events-none group-hover:text-white transition-colors" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-xl px-4 w-full md:w-80 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
            <Search className="text-slate-500 w-5 h-5 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Keresés termék, márka vagy eladó alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
        
      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Eladások betöltése...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 ">
          {filteredSales.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
              <p className="text-slate-500 text-lg">Ebben a boltban még nem történt eladás.</p>
              <p className="text-slate-600 mt-2">Kattints a "+" gombra az első tranzakció rögzítéséhez!</p>
            </div>
          ) : (
            filteredSales.map((sale, index) => (
              <div key={index} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1 block">
                      {sale.CategoryName}
                    </span>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {sale.ProductBrand} {sale.ProductName}
                    </h3>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-lg font-bold text-emerald-400 block">{sale.PriceAtSale} Ft</span>
                    <span className="text-xs text-slate-500 mb-2">Db: {sale.Quantity}</span>
                    <button 
                      onClick={() => handleDeleteSale(sale.Id)} 
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Eladás Törlése"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-800/50">
                  <div className="flex items-center text-sm text-slate-400">
                    <User className="w-4 h-4 mr-2" /> Eladó: {sale.SellerName}
                  </div>
                  <div className="flex items-center text-sm text-slate-400">
                    {sale.PaymentMethod.toLowerCase() === 'készpénz' || sale.PaymentMethod.toLowerCase() === 'cash' ? (
                      <Banknote className="w-4 h-4 mr-2 text-green-500/70" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2 text-blue-500/70" />
                    )}
                    {sale.PaymentMethod}
                  </div>
                  <div className="flex items-center text-sm text-slate-500">
                    <Clock className="w-4 h-4 mr-2" /> {new Date(sale.TimeSold).toLocaleString('hu-HU')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* The Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Új eladás rögzítése</h2>

            <form onSubmit={handleCreateSale} className="space-y-4">
              {/* Product / Inventory Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Termék kiválasztása</label>
                {loadingInventory ? (
                  <div className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-400 animate-pulse">
                    Termékek betöltése...
                  </div>
                ) : (
                  <select 
                    required
                    value={newSale.inventoryId}
                    onChange={(e) => setNewSale({...newSale, inventoryId: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>-- Válassz egy terméket --</option>
                    {inventory.map((item, idx) => (
                      <option key={idx} value={item.InventoryId}>
                        {item.Brand} {item.Name} | {item.Stock} db raktáron ({item.Price} Ft)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Mennyiség</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={newSale.quantity}
                  onChange={(e) => setNewSale({...newSale, quantity: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fizetési mód</label>
                <select 
                  value={newSale.paymentMethod}
                  onChange={(e) => setNewSale({...newSale, paymentMethod: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Készpénz">Készpénz</option>
                  <option value="Bankkártya">Bankkártya</option>
                </select>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg mt-4 transition-colors"
              >
                Eladás jóváhagyása
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}