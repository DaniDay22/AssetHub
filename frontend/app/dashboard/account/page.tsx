'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Shield, Building2, Save, Loader2, KeyRound, X } from 'lucide-react';

export default function AccountPage() {
  const { user } = useAuth(); // Az AuthContext-ból lekérjük a bejelentkezett felhasználó adatait
  
  const [formData, setFormData] = useState({
    email: '',
    phone: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Jelszó módosítás state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.Email || '',
        phone: user.Phone || ''
      });
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/Auth/UpdateProfile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();

      if (json.success) {
        setMessage({ text: 'Sikeresen frissítetted az adataidat!', type: 'success' });
      } else {
        setMessage({ text: json.error || 'Hiba történt a mentés során.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Nem sikerült kapcsolódni a szerverhez.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage({ text: '', type: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setPassMessage({ text: 'Az új jelszavak nem egyeznek!', type: 'error' });
    }

    // JELSZÓ ERŐSSÉG VALIDÁCIÓ
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      return setPassMessage({ 
        text: 'Az új jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt, számot és speciális karaktert (@$!%*?&)!', 
        type: 'error' 
      });
    }

    setPassLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/Auth/UpdatePassword', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });

      const json = await res.json();

      if (json.success) {
        setPassMessage({ text: 'Jelszó sikeresen megváltoztatva!', type: 'success' });
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setIsPasswordModalOpen(false), 2000); 
      } else {
        setPassMessage({ text: json.error || 'Hiba történt.', type: 'error' });
      }
    } catch (err) {
      setPassMessage({ text: 'Hálózati hiba.', type: 'error' });
    } finally {
      setPassLoading(false);
    }
  };

  const getRoleName = (level: number) => {
    if (level === 1) return 'Tulajdonos';
    if (level === 2) return 'Üzletvezető';
    if (level === 4) return 'Készletkezelő';
    return 'Eladó';
  };

  return (
    <div className="flex-1 p-8 w-full max-w-4xl mx-auto relative min-h-full">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Fiók Beállítások</h1>
        <p className="text-slate-400 mt-1">Személyes adatok és elérhetőségek kezelése</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* BAL OSZLOP: Profil összegzés */}
        <div className="col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="w-20 h-20 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <User size={40} />
            </div>
            <h2 className="text-xl font-bold text-white text-center">{user?.Name || 'Felhasználó'}</h2>
            <p className="text-sm font-medium text-blue-400 text-center uppercase tracking-wider mb-6">
              {user ? getRoleName(Number(user.AuthLv)) : 'Betöltés...'}
            </p>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center text-slate-300">
                <Shield className="w-5 h-5 text-slate-500 mr-3" />
                <span className="text-sm">Azonosító: #{user?.UserId || '-'}</span>
              </div>
              <div className="flex items-center text-slate-300">
                <Building2 className="w-5 h-5 text-slate-500 mr-3" />
                <span className="text-sm">Franchise ID: {user?.FranchiseId || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* JOBB OSZLOP: Szerkesztő űrlap */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Kapcsolati Adatok</h3>
            
            {message.text && (
              <div className={`p-4 mb-6 rounded-xl text-sm border ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">E-mail cím</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Telefonszám</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center py-2.5 px-6 rounded-xl text-white font-semibold bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Módosítások mentése
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Jelszó Módosítása */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Jelszó Módosítása</h3>
                  <p className="text-sm text-slate-400 mt-1">Javasolt a biztonság érdekében rendszeresen frissíteni.</p>
                </div>
                <button 
                  onClick={() => { setIsPasswordModalOpen(true); setPassMessage({ text: '', type: '' }); }}
                  className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-colors"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Módosítás
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* JELSZÓ MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsPasswordModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Jelszó Módosítása</h2>

            {passMessage.text && (
              <div className={`p-3 mb-4 rounded-xl text-sm border ${passMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {passMessage.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Jelenlegi jelszó</label>
                <input 
                  type="password" required 
                  value={passwordData.oldPassword} 
                  onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Új jelszó</label>
                <input 
                  type="password" required minLength={8}
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                />
                {/* HELPER SZÖVEG*/}
                <p className="text-xs text-slate-500 mt-1">Min. 8 karakter, kis- és nagybetű, szám, speciális karakter.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Új jelszó megerősítése</label>
                <input 
                  type="password" required minLength={8}
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                />
              </div>

              <button 
                type="submit" disabled={passLoading}
                className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg mt-4 transition-colors disabled:opacity-50"
              >
                {passLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Jelszó frissítése"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}