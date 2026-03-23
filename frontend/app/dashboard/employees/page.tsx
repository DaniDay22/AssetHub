'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Mail, Store, User, Loader2, X, ChevronDown, RefreshCw, Trash2, Pencil, Phone } from 'lucide-react';

export default function EmployeesPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
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
    salary: ''
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  //THE AUTO-PASSWORD GENERATOR
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

 // Opens a clean slate for a NEW hire
  const openModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setNewEmployee({
      name: '', email: '', password: generateTempPassword(), authLv: 3, phone: '', doB: '', salary: ''
    });
    setIsModalOpen(true);
  };

  // Opens the modal pre-filled with EXISTING data
  const openEditModal = (emp: any) => {
    setIsEditMode(true);
    setEditingId(emp.Id);
    
    // Convert SQL date to YYYY-MM-DD for the HTML input
    const formattedDate = emp.DoB ? new Date(emp.DoB).toISOString().split('T')[0] : '';

    setNewEmployee({
      name: emp.Name || '', 
      email: emp.Email || '', 
      password: '', // We don't touch passwords during a profile edit
      authLv: emp.AuthLv || 3, 
      phone: emp.Phone || '', 
      doB: formattedDate, 
      salary: emp.Salary || ''
    });
    setIsModalOpen(true);
  };

  // 1. Fetch Stores on Page Load AND get the logged-in User's ID
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // --- NEW: Decode the token to find out who is logged in! ---
        try {
          // A JWT token has 3 parts separated by dots. The middle part ([1]) has the data.
          // 'atob' decrypts it so we can read the UserId inside!
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.UserId) {
            setCurrentUserId(Number(payload.UserId));
          }
        } catch (e) {
          console.error("Nem sikerült dekódolni a tokent.");
        }
        // ------------------------------------------------------------

        const res = await fetch('http://localhost:5000/api/employees/my-stores', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (json.success || Array.isArray(json)) {
          const storeData = json.data || json; 
          setStores(storeData);
          
          // Automatically trigger the employee fetch by setting the ID!
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

  // 2. Fetch Employees WHENEVER the selected store changes
  useEffect(() => {
    const fetchEmployees = async () => {
      // Don't fetch if the store hasn't been set yet
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
      
      // NEW: SAFETY CHECK
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
    return <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Eladó</span>;
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
              placeholder="Keresés név vagy e-mail alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button 
            onClick={openModal}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-6 h-6" />
          </button>
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
                
                {/* Top Section */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    {getAuthBadge(emp.AuthLv)}
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {emp.Name}
                    </h3>
                  </div>
                  
                  {/* Action Buttons grouped on the right */}
                  <div className="flex items-start gap-4">
                    <button 
                      onClick={() => openEditModal(emp)} 
                      className="text-slate-500 hover:text-blue-400 transition-colors"
                      title="Alkalmazott Szerkesztése"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    {/* NEW: Only show Delete if it's NOT the logged-in user */}
                    {emp.Id !== currentUserId && (
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

                {/* Bottom Section */}
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-8">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">
              {isEditMode ? "Alkalmazott Szerkesztése" : "Új Alkalmazott"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Name & DOB */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Teljes Név</label>
                  <input type="text" required value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Születési Dátum</label>
                  <input type="date" required value={newEmployee.doB} onChange={(e) => setNewEmployee({...newEmployee, doB: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">E-mail cím</label>
                  <input type="email" required value={newEmployee.email} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Telefonszám</label>
                  <input type="text" required value={newEmployee.phone} onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="+36..." />
                </div>
              </div>

              {/* Row 3: Role & Salary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Szerepkör</label>
                  <select value={newEmployee.authLv} onChange={(e) => setNewEmployee({...newEmployee, authLv: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value={3}>Eladó</option>
                    <option value={2}>Üzletvezető</option>
                    <option value={1}>Tulajdonos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Fizetés (Opcionális)</label>
                  <input type="number" value={newEmployee.salary} onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="pl. 400000" />
                </div>
              </div>

              {/* Only show the password generator if we are creating a NEW user */}
              {!isEditMode && (
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Generált Ideiglenes Jelszó</label>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-mono text-lg">{newEmployee.password}</span>
                    <button type="button" onClick={() => setNewEmployee({...newEmployee, password: generateTempPassword()})} className="text-slate-400 hover:text-white" title="Jelszó Újragenerálása">
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