'use client';
import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, Loader2, MapPin, Users, Pencil, X, Save, Building2 } from 'lucide-react';

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  // Lekérjük a boltok listáját a szerverről, amikor a komponens betöltődik. 
  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/stores/List', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (res.ok && json.success) {
            setStores(json.data);
        } else {
            setError(json.error || 'Nem sikerült betölteni a boltokat.');
        }
      } catch (e) { 
          setError('Hálózati hiba történt.'); 
      } finally { 
          setLoading(false); 
      }
    };
    fetchStores();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({ name: '', address: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (store: any) => {
    setIsEditMode(true);
    setEditingId(store.Id);
    setFormData({ name: store.Name, address: store.Address });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEditMode 
        ? `http://localhost:5000/api/stores/${editingId}`
        : 'http://localhost:5000/api/stores/Add';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      const json = await res.json();
      
      if (json.success) {
        setIsModalOpen(false); 
        window.location.reload(); 
      } else {
        alert(json.error || 'Hiba történt a mentés során!'); 
      }
    } catch (err) {
      alert("Nem sikerült kapcsolódni a szerverhez.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStores = stores.filter(s => 
    s.Name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.Address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 w-full max-w-7xl mx-auto relative min-h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-xl px-4 w-full md:w-80 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
            <Search className="text-slate-500 w-5 h-5 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Keresés név vagy cím alapján..."
              className="w-full bg-transparent py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={openAddModal}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-6 h-6 mr-2" /> Új Bolt
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-400">Boltok betöltése...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          
          {filteredStores.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
              <p className="text-slate-500 text-lg">Nem található ilyen bolt.</p>
            </div>
          ) : (
            filteredStores.map((store, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group flex flex-col justify-between shadow-lg relative overflow-hidden">
                
                {/* Dekoráció */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                      <Store size={24} />
                    </div>
                    
                    <button 
                      onClick={() => openEditModal(store)}
                      className="text-slate-500 hover:text-blue-400 transition-colors p-2 bg-slate-800/50 rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      title="Bolt Szerkesztése"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{store.Name}</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start text-sm text-slate-400">
                      <MapPin className="w-4 h-4 mr-3 mt-0.5 shrink-0 text-slate-500" />
                      <span className="leading-tight">{store.Address}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-400">
                      <Users className="w-4 h-4 mr-3 shrink-0 text-slate-500" />
                      <span>{store.EmployeeCount} regisztrált alkalmazott</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center mb-6">
              <Building2 className="w-6 h-6 text-blue-400 mr-3" />
              <h2 className="text-2xl font-bold text-white">
                {isEditMode ? "Bolt Szerkesztése" : "Új Bolt Létrehozása"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bolt Neve</label>
                <input 
                  type="text" 
                  required 
                  placeholder="pl. Budapest Fő tér"
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Pontos Cím</label>
                <input 
                  type="text" 
                  required 
                  placeholder="pl. 1051 Budapest, Fő utca 1."
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" 
                />
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Save className="w-5 h-5 mr-2"/> {isEditMode ? "Módosítások Mentése" : "Bolt Hozzáadása"} </>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}