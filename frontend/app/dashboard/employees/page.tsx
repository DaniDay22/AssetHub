'use client';
import React, { useState, useEffect } from 'react';
import { useStores } from '../../context/StoreContext';
import { Search, Plus, Mail, Store, Loader2, X, ChevronDown, RefreshCw, Trash2, Pencil, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EmployeesPage() {
  const { stores, selectedStoreId, setSelectedStoreId, isOwner } = useStores();
  const { user } = useAuth();
  
  // Jogosultságok kiszámítása (Tulajdonos = 1, Üzletvezető = 2)
  const isManager = user?.AuthLvl === 2 || user?.AuthLv === 2;
  const canEdit = isOwner || isManager;

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
    authLv: 3,
    phone: '',
    doB: '',
    salary: '',
    currency: '' 
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  //A jelszó generátor 10 karakter hosszú, és tartalmaz nagybetűket, kisbetűket, számokat és speciális karaktereket is.
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Modal megnyitása üres űrlappal új alkalmazott létrehozásához
  const openModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setNewEmployee({
      name: '', email: '', password: generateTempPassword(), authLv: 3, phone: '', doB: '', salary: '', currency: 'HUF'
    });
    setIsModalOpen(true);
  };

  // Modal megnyitása kitöltött űrlappal meglévő alkalmazott szerkesztéséhez
  const openEditModal = (emp: any) => {
    setIsEditMode(true);
    setEditingId(emp.Id);

    // Konvertáljuk a DoB-t ISO formátumra, hogy a date inputban helyesen jelenjen meg. Ha nincs DoB, akkor üres stringet használunk.
    const formattedDate = emp.DoB ? new Date(emp.DoB).toISOString().split('T')[0] : '';

    setNewEmployee({
      name: emp.Name || '',
      email: emp.Email || '',
      password: '', // Jelszót nem töltünk be szerkesztéskor, csak új alkalmazottnál generálunk ideiglenes jelszót.
      authLv: emp.AuthLv || 3,
      phone: emp.Phone || '',
      doB: formattedDate,
      salary: emp.Salary || '',
      currency: emp.Currency || 'HUF'
    });
    setIsModalOpen(true);
  };


  // Betöltjük az alkalmazottakat, amikor a selectedStoreId változik (tehát amikor a bolt kiválasztása megtörténik vagy megváltozik).
  useEffect(() => {
    const fetchEmployees = async () => {
      // Ha nincs kiválasztott bolt, akkor nem próbáljuk meg lekérni az alkalmazottakat.
      if (!selectedStoreId) return;

      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/employees/List?storeId=${selectedStoreId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (res.ok && json.success) {
          setEmployees(json.data);
        } else {
          setError('Nem sikerült betölteni az alkalmazottakat.');
        }
      } catch (err) {
        console.error("Hiba az alkalmazottak betöltésekor:", err);
        setError('Hálózati hiba történt.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [selectedStoreId]);

  const filteredEmployees = employees.filter(emp => {
    const name = emp?.Name || '';
    const email = emp?.Email || '';
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      const url = isEditMode
        ? `http://localhost:5000/api/employees/${editingId}`
        : 'http://localhost:5000/api/employees/Add';

      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newEmployee, storeId: selectedStoreId })
      });

      // Biztonsági ellenőrzés
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await res.text();
        console.error("Backend HTML Error:", textError);
        alert("Szerver hiba! (Nézd meg a Node.js terminált a pontos hibáért!)");
        return;
      }

      const json = await res.json();

      if (json.success) {
        if (!isEditMode) {
          alert(`Sikeres! Az új alkalmazott ideiglenes jelszava: ${newEmployee.password}`);
        }
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Hálózati hiba történt az adatok küldésekor.");
    }
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a dolgozót?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/employees/${employeeId}`, {
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
      alert("Nem sikerült törölni a dolgozót.");
    }
  };

  const getAuthBadge = (level: number) => {
    if (level === 1) return <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">Tulajdonos</span>;
    if (level <= 2) return <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-1">Üzletvezető</span>;
    if (level === 4) return <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-1">KÉSZLETKEZELŐ</span>;
    return <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Eladó</span>;
  };

  console.log("ME:", user);

  return (
    <div className="flex-1 p-8 w-full max-w-7xl mx-auto relative min-h-full">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">


          {/* Store Selection Dropdown */}
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
            // Ha nem tulajdonos, vagy csak egy boltja van, akkor egyszerűen csak megjelenítjük a bolt nevét egy nem interaktív elemként, hogy lássa a felhasználó melyik bolt adatait nézi.
            <div className="flex items-center bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5">
              <Store className="w-5 h-5 text-blue-400 mr-3" />
              <span className="text-white font-medium">
                {stores.find(s => s.Id.toString() === selectedStoreId)?.Name || 'Betöltés...'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-xl px-4 w-full md:w-80 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
            <Search className="text-slate-500 w-5 h-5 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Keresés név vagy e-mail alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          
          {/* Csak Owner és Manager adhat hozzá új alkalmazottat */}
          {canEdit && (
            <button
              onClick={openModal}
              className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors whitespace-nowrap"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Csapat adatainak betöltése...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          {filteredEmployees.map((emp, index) => (
            <div key={index} className="bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors group p-6">

              {/* Felső rész */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  {getAuthBadge(emp.AuthLv)}
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {emp.Name}
                  </h3>
                </div>

                {/* Gombok */}
                <div className="flex items-start gap-4">
                  {/* Szerkesztés Gomb csak Owner és Manager számára */}
                  {canEdit && (
                    <button
                      onClick={() => openEditModal(emp)}
                      className="text-slate-500 hover:text-blue-400 transition-colors"
                      title="Alkalmazott Szerkesztése"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}
                  {/* Delete Gomb csak akkor ha nem az aktuális felhasználó, és ha a belépett felhasználó Owner vagy Manager */}
                  {String(emp.Id) !== String(user?.UserId) && canEdit && (
                    <button
                      onClick={() => handleDeleteEmployee(emp.Id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Alkalmazott Törlése"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Alsó rész */}
              <div className="space-y-2 pt-4 border-t border-slate-800/50">
                <div className="flex items-center text-sm text-slate-400">
                  <Mail className="w-4 h-4 mr-2" /> {emp.Email}
                </div>
                {emp.Phone && (
                  <div className="flex items-center text-sm text-slate-400">
                    <Phone className="w-4 h-4 mr-2" /> {emp.Phone}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-8">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">
              {isEditMode ? "Alkalmazott Szerkesztése" : "Új Alkalmazott"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Sor: Név és Születési dátum */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Teljes Név</label>
                  <input type="text" required value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Születési Dátum</label>
                  <input type="date" required value={newEmployee.doB} onChange={(e) => setNewEmployee({ ...newEmployee, doB: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
              </div>

              {/* 2. Sor: E-mail és Telefonszám */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">E-mail cím</label>
                  <input disabled={!isOwner} type="email" required value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Telefonszám</label>
                  <input disabled={!isOwner} type="text" required value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="+36..." />
                </div>
              </div>

              {/* 3. Sor: Szerepkör */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Szerepkör {!isOwner && <span className="text-xs text-orange-400 ml-2">(Csak tulajdonos módosíthatja)</span>}
                </label>
                <select 
                  value={newEmployee.authLv} 
                  onChange={(e) => setNewEmployee({ ...newEmployee, authLv: parseInt(e.target.value) })} 
                  disabled={!isOwner} /* CSAK A TULAJDONOS SZERKESZTHETI */
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900"
                >
                  <option value={3}>Eladó</option>
                  <option value={2}>Üzletvezető</option>
                  <option value={4}>Készletkezelő</option>
                  <option value={1}>Tulajdonos</option>
                </select>
              </div>

              {/* 4. Sor: Fizetés és Pénznem */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Fizetés (Opcionális)</label>
                  <input 
                    type="number" 
                    value={newEmployee.salary} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                    placeholder="pl. 400000" 
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Pénznem</label>
                  <select 
                    value={newEmployee.currency} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, currency: e.target.value })} 
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="HUF">HUF</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Csak akkor jelenik meg, ha új felhasználót hozunk létre */}
              {!isEditMode && (
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Generált Ideiglenes Jelszó</label>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-mono text-lg">{newEmployee.password}</span>
                    <button type="button" onClick={() => setNewEmployee({ ...newEmployee, password: generateTempPassword() })} className="text-slate-400 hover:text-white" title="Jelszó Újragenerálása">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg mt-4 transition-colors">
                {isEditMode ? "Módosítások Mentése" : "Felvétel"}
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}