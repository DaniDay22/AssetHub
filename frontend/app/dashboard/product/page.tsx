'use client';
import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Store, ChevronDown, Loader2, Tag, Hash, Archive, Pencil, Trash2, TrendingUp, FileUp, X, Save } from 'lucide-react';

export default function ProductsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Matches your backend exactly: {PName, PCName, Brand, Unit, Price, Currency, Stock, Description}
  const [newProduct, setNewProduct] = useState({
    PName: '',
    Brand: '',
    PCName: '',
    Unit: 'db',
    Price: '',
    Currency: 'HUF',
    Stock: '',
    Description: ''
  });

  // 1. Fetch Stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/employees/my-stores', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success || Array.isArray(json)) {
          const data = json.data || json;
          setStores(data);
          if (data.length > 0) setSelectedStoreId(data[0].Id.toString());
        }
      } catch (e) { console.error(e); }
    };
    fetchStores();
  }, []);

  // 2. Fetch Products for Store
  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedStoreId) return;
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/StoreInventory/All?storeId=${selectedStoreId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (res.ok && json.success) {
            setProducts(json.data);
        } else {
            setError('Nem sikerült betölteni a termékeket.');
        }
      } catch (e) { 
          setError('Hálózati hiba történt.'); 
      } finally { 
          setLoading(false); 
      }
    };
    fetchProducts();
  }, [selectedStoreId]);

  const filteredProducts = products.filter(p => {
    const name = p?.ProductName || '';
    const brand = p?.Brand || '';
    const category = p?.CategoryName || '';
    const search = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(search) || 
           brand.toLowerCase().includes(search) ||
           category.toLowerCase().includes(search);
  });

  // SUBMIT NEW PRODUCT
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/StoreInvetory', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newProduct)
      });
      
      const json = await res.json();
      console.log(json)
      
      if (json.success) {
        setIsModalOpen(false); 
        // Reset form for next time
        setNewProduct({ PName: '', Brand: '', PCName: '', Unit: 'db', Price: '', Currency: 'HUF', Stock: '', Description: '' });
        window.location.reload(); 
      } else {
        alert(json.message || json.error || 'Hiba történt a mentés során!'); 
      }
    } catch (err) {
      
      alert(err.message+"Nem sikerült kapcsolódni a szerverhez.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-8 w-full max-w-7xl mx-auto relative min-h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">

          {/* STORE SWITCHER */}
          {stores.length > 0 && (
            <div className="relative group">
              <div className="flex items-center bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-2.5 transition-all cursor-pointer">
                <Store className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                <select 
                  value={selectedStoreId} 
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none appearance-none pr-8 cursor-pointer w-full min-w-[160px]"
                >
                  {stores.map(s => <option key={s.Id} value={s.Id} className="bg-slate-800">{s.Name}</option>)}
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
              placeholder="Keresés név, márka vagy kategória alapján..."
              className="w-full bg-transparent py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            className="flex items-center justify-center bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl px-4 py-2.5 font-medium transition-colors"
            title="CSV Készletfeltöltés"
          >
            <FileUp className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
            title="Új termék"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-400">Készlet betöltése...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
              <p className="text-slate-500 text-lg">Nincs megjeleníthető termék ebben a boltban.</p>
              <p className="text-slate-600 mt-2">Kattints a "+" gombra egy új termék hozzáadásához!</p>
            </div>
          ) : (
            filteredProducts.map((p, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group flex flex-col justify-between shadow-lg">
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-1">
                          {p.CategoryName}
                      </span>
                      <h3 className="text-xl font-bold text-white leading-tight">
                          {p.Brand} {p.ProductName}
                      </h3>
                      {p.Description && (
                          <p className="text-sm text-slate-400 mt-2 line-clamp-2" title={p.Description}>
                              {p.Description}
                          </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-xl font-bold text-emerald-400 block whitespace-nowrap">{p.Price} Ft</span>
                      <span className="text-xs text-slate-500">/{p.Unit}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className={`p-3 rounded-xl border ${p.Stock < 10 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      <div className="text-xs uppercase tracking-wider mb-1 opacity-80 flex items-center">
                          <Archive className="w-3 h-3 mr-1" /> Raktáron
                      </div>
                      <div className="text-xl font-bold">
                          {p.Stock} <span className="text-sm font-normal opacity-70">{p.Unit}</span>
                      </div>
                    </div>
                    
                    <div className="p-3 rounded-xl border bg-purple-500/10 border-purple-500/20 text-purple-400">
                      <div className="text-xs uppercase tracking-wider mb-1 opacity-80 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" /> Eladva
                      </div>
                      <div className="text-xl font-bold">
                          {p.Sold || 0} <span className="text-sm font-normal opacity-70">{p.Unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <Pencil size={16}/> Szerkesztés
                  </button>
                  <button className="bg-red-500/10 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 text-red-400 p-2.5 rounded-xl transition-all" title="Termék Törlése">
                    <Trash2 size={18}/>
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* NEW PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-8">
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Új termék hozzáadása</h2>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              
              {/* Row 1: Termék neve és Márka */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Termék neve</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="pl. Coca-Cola Zero"
                    value={newProduct.PName} 
                    onChange={(e) => setNewProduct({...newProduct, PName: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Márka</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="pl. Coca-Cola"
                    value={newProduct.Brand} 
                    onChange={(e) => setNewProduct({...newProduct, Brand: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                  />
                </div>
              </div>

              {/* Row 2: Kategória és Egység */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Kategória</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="pl. Üdítőitalok"
                    value={newProduct.PCName} 
                    onChange={(e) => setNewProduct({...newProduct, PCName: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                  />
                  <p className="text-xs text-slate-500 mt-1">Ha újat írsz be, automatikusan létrejön.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Egység</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="pl. db, kg, csomag"
                    value={newProduct.Unit} 
                    onChange={(e) => setNewProduct({...newProduct, Unit: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                  />
                </div>
              </div>

              {/* Row 3: Ár és Készlet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Eladási Ár (Ft)</label>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    placeholder="pl. 450"
                    value={newProduct.Price} 
                    onChange={(e) => setNewProduct({...newProduct, Price: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Induló Készlet</label>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    placeholder="pl. 100"
                    value={newProduct.Stock} 
                    onChange={(e) => setNewProduct({...newProduct, Stock: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                  />
                </div>
              </div>

              {/* Row 4: Leírás */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Leírás (Opcionális)</label>
                <textarea 
                  rows={2}
                  placeholder="Rövid leírás a termékről..."
                  value={newProduct.Description} 
                  onChange={(e) => setNewProduct({...newProduct, Description: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500 resize-none" 
                />
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Save className="w-5 h-5 mr-2"/> Termék Mentése </>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}