'use client';
import React, { useState, useEffect } from 'react';
import { useStores } from '../../context/StoreContext';
import { ShoppingCart, Plus, Search, Store, ChevronDown, Loader2, Archive, Pencil, Trash2, TrendingUp, FileUp, X, Save } from 'lucide-react';

export default function ProductsPage() {
  const { stores, selectedStoreId, setSelectedStoreId, isOwner } = useStores();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // Track which product we are editing
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSV UPLOAD STATE
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<any>(null);

  // LOW STOCK THRESHOLD STATE 
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);

  // CSV Template letöltése a kiválasztott bolthoz (ha nincs kiválasztva bolt, figyelmeztetünk)
  const handleDownloadTemplate = async () => {
    if (!selectedStoreId) return alert("Válassz ki egy boltot először!");
    
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`http://localhost:5000/api/StoreInventory/export-template/${selectedStoreId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Hiba a letöltéskor");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keszlet_sablon_bolt_${selectedStoreId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch(err) {
      alert("Nem sikerült letölteni a sablont.");
    }
  };

  // Bevásárlólista letöltése a kiválasztott bolthoz és határértékhez (ha nincs kiválasztva bolt, figyelmeztetünk)
  const handleDownloadShoppingList = async () => {
    if (!selectedStoreId) return alert("Válassz ki egy boltot először!");
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/StoreInventory/export-template/${selectedStoreId}?threshold=${lowStockThreshold}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 404) return alert("Minden rendben! Nincs alacsony készletű termék ebben a boltban.");
        throw new Error("Hiba a letöltéskor");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bevasarlista_bolt_${selectedStoreId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch(err) {
      alert("Nem sikerült letölteni a bevásárlólistát.");
    }
  };

  // CSV fájl feltöltése a backendre a kiválasztott bolt készletének frissítéséhez (ha nincs kiválasztva bolt vagy fájl, figyelmeztetünk)
  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile || !selectedStoreId) return;
    
    setIsUploading(true);
    setCsvResult(null);

    try {
      const token = localStorage.getItem('token');
      
      // FormData kell a fájl feltöltéséhez, ne állítsuk be a Content-Type-ot, a böngésző automatikusan megteszi helyettünk!
      const formData = new FormData();
      formData.append('RestockFile', csvFile);
      formData.append('StoreId', selectedStoreId); // Tell backend which store to restock!

      const res = await fetch('http://localhost:5000/api/StoreInventory', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }, 
        body: formData
      });

      const json = await res.json();
      setCsvResult(json);
      
      if (json.stats && json.stats.success > 0) {
        setTimeout(() => window.location.reload(), 3000); 
      }
    } catch (err) {
      alert("Hálózati hiba a fájl feltöltésekor.");
    } finally {
      setIsUploading(false);
    }
  };

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

  

  // Termékek lekérése a kiválasztott bolthoz (minden alkalommal, amikor a selectedStoreId változik, vagyis amikor a felhasználó másik boltot választ)
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

const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      
      const bodyData = editingId 
        ? { ...newProduct, StoreInvId: editingId, ProductId: products.find(p => p.StoreInventoryId === editingId)?.ProductId }
        : { ...newProduct, StoreId: selectedStoreId };

      const res = await fetch('http://localhost:5000/api/StoreInventory', {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(bodyData)
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setEditingId(null); 
        window.location.reload();
      } else {
        alert(json.message || "Hiba történt.");
      }
    } catch (err) {
      alert("Szerver hiba.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Szerkesztés gombra kattintva megnyílik a modal, és a form mezői feltöltődnek a kiválasztott termék adataival. Az editingId beállítása jelzi, hogy szerkesztési módban vagyunk.
  const handleEditClick = (product: any) => {
    setNewProduct({
      PName: product.ProductName,
      Brand: product.Brand,
      PCName: product.CategoryName,
      Unit: product.Unit,
      Price: product.Price.toString(),
      Currency: 'HUF',
      Stock: product.Stock.toString(),
      Description: product.Description || ''
    });
    setEditingId(product.StoreInventoryId); // Ez segít megkülönböztetni a szerkesztést az új termék létrehozásától a handleSaveProduct függvényben
    setIsModalOpen(true);
  };

  // Törlés gombra kattintva megjelenik egy megerősítő ablak, és ha a felhasználó megerősíti, akkor elküldünk egy DELETE kérést a backendnek a termék törléséhez.
  const handleDeleteProduct = async (storeInvId: number, productId: number) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a terméket?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/StoreInventory', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          StoreInvId: storeInvId, 
          ProductId: productId 
        })
      });

      const json = await res.json();
      if (json.success) {
        window.location.reload();
      } else {
        alert(json.message || "Hiba a törlés során.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Hálózati hiba történt.");
    }
  };

  return (
    <div className="flex-1 p-8 w-full max-w-7xl mx-auto relative min-h-full">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 mb-8">
        
      {isOwner && stores.length > 1 ? (
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
      ) : (
     // Ha nincs több bolt, vagy a felhasználó nem tulajdonos, akkor csak egy statikus boltdoboz jelenik meg a kiválasztott bolt nevével, nem kattintható.
      <div className="flex items-center bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5">
       <Store className="w-5 h-5 text-blue-400 mr-3" />
       <span className="text-white font-medium">
         {stores.find(s => s.Id.toString() === selectedStoreId)?.Name || 'Betöltés...'}
       </span>
          </div>
      )}

        {/* Alsó sor: Keresés és műveletek */}
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          
          {/* Keresés */}
          <div className="flex-1 flex items-center bg-slate-900/50 border border-slate-800 rounded-xl px-4 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all min-h-[48px]">
            <Search className="text-slate-500 w-5 h-5 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Keresés név, márka vagy kategória alapján..."
              className="w-full bg-transparent py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Gombok */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap gap-3 shrink-0">
            
            {/* CSV Feltöltés */}
            <button 
              onClick={() => { setIsCsvModalOpen(true); setCsvResult(null); setCsvFile(null); }}
              className="flex-1 sm:flex-none flex items-center justify-center bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl px-4 py-2.5 transition-colors min-h-[48px]"
              title="CSV Készletfeltöltés"
            >
              <FileUp className="w-5 h-5" />
            </button>

            {/* Bevásárlólista */}
            <div className="flex-1 sm:flex-none flex items-center bg-orange-500/10 border border-orange-500/30 rounded-xl transition-colors focus-within:border-orange-500/60 focus-within:bg-orange-500/20 min-h-[48px]">
              <div className="flex items-center px-3 border-r border-orange-500/30 h-full">
                <span className="text-orange-400/80 text-sm font-medium mr-2 hidden sm:block">Határ:</span>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                  className="w-10 sm:w-12 bg-transparent text-orange-400 font-bold focus:outline-none text-center"
                  title="Készlet riasztási határ"
                />
              </div>
              <button 
                onClick={handleDownloadShoppingList}
                className="flex items-center justify-center text-orange-400 hover:text-white hover:bg-orange-500 px-4 h-full rounded-r-xl transition-colors"
                title="Bevásárlólista letöltése"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            </div>

            {/* Új Termék */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors min-h-[48px]"
              title="Új termék"
            >
              <Plus className="w-6 h-6 sm:mr-2" />
              <span className="hidden sm:inline">Új termék</span>
            </button>
          </div>

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
                          {p.Sold} <span className="text-sm font-normal opacity-70">{p.Unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(p)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Pencil size={16}/> Szerkesztés
                  </button>
                  <button
                   onClick={() => handleDeleteProduct(p.StoreInventoryId, p.ProductId)}
                   className="bg-red-500/10 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 text-red-400 p-2.5 rounded-xl transition-all" title="Termék Törlése"
                   >
                    <Trash2 size={18}/>
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* ÚJ TERMÉK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-8">
            
            <button 
              onClick={() => {
               setIsModalOpen(false);
                setEditingId(null); 
                setNewProduct({ PName: '', Brand: '', PCName: '', Unit: 'db', Price: '', Currency: 'HUF', Stock: '', Description: '' });
              }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Termék szerkesztése' : 'Új termék hozzáadása'}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* 1. Sor: Termék neve és Márka */}
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

              {/* 2. Sor: Kategória és Egység */}
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

              {/* 3. Sor: Ár és Készlet */}
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

              {/* 4. Sor: Leírás */}
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

      {/* CSV Feltöltés MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-8">
            
            <button 
              onClick={() => setIsCsvModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Tömeges Készletfeltöltés</h2>
            <p className="text-slate-400 text-sm mb-6">Fontos a sablon használata a feltöltéshez!</p>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">1. Lépés: Sablon letöltése</h4>
                <p className="text-xs text-blue-400 mt-1">A jelenleg kiválasztott bolt készletét tartalmazza.</p>
              </div>
              <button 
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Letöltés
              </button>
            </div>
            

            {/* Feltöltés űrlap */}
            <form onSubmit={handleUploadCsv}>
              <div className="mb-6">
                <input 
                  type="file" 
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer border border-slate-700 rounded-xl p-2 bg-slate-800"
                />
              </div>

              {/* Feltöltés eredményei */}
              {csvResult && (
                <div className={`mb-6 p-4 rounded-xl border ${csvResult.stats?.failed > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                  <h4 className="text-white font-bold mb-2">{csvResult.message}</h4>
                  <div className="flex gap-4 text-sm">
                    <span className="text-slate-300">Összes: {csvResult.stats?.total}</span>
                    <span className="text-emerald-400">Sikeres: {csvResult.stats?.success}</span>
                    <span className="text-red-400">Sikertelen: {csvResult.stats?.failed}</span>
                  </div>
                  
                  {/* Hibaüzenetek */}
                  {csvResult.errors && csvResult.errors.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto text-xs text-orange-300 space-y-1 bg-black/20 p-2 rounded">
                      {csvResult.errors.map((err: any, i: number) => (
                        <div key={i}>⚠️ {err.ProductName} - {err.ErrorReason}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                disabled={!csvFile || isUploading}
                className="w-full flex justify-center items-center bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-xl transition-colors"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <FileUp className="w-5 h-5 mr-2"/> Feltöltés indítása </>}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}