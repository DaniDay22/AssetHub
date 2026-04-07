'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, Building2, ChevronLeft, ArrowRight, Phone, Calendar, MapPin, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A regisztrációs űrlap adatainak kezelése egy közös state-ben, hogy könnyebben lehessen validálni és elküldeni az adatokat.
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dob: '',
    storeName: '',
    storeAddress: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // VALIDÁCIÓS FÜGGVÉNY
  const validateForm = () => {
    // E-mail validáció (alapvető e-mail formátum ellenőrzése)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "Kérjük, adj meg egy érvényes e-mail címet!";
    }

    // Telefonszám validáció (Opcionális '+', számok, szóközök és kötőjelek engedélyezettek, 8-15 karakter)
    const phoneRegex = /^\+?[0-9\s\-]{8,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      return "Kérjük, adj meg egy érvényes telefonszámot (pl. +36 30 123 4567)!";
    }

    // Jelszó validáció (Min 8 karakter, 1 kisbetű, 1 nagybetű, 1 szám, 1 speciális karakter)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      return "A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt, számot és speciális karaktert (@$!%*?&)!";
    }

    return null; // Ha minden rendben, nem térünk vissza hibával
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // --- VALIDÁCIÓ FUTTATÁSA ---
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return; // Ha hiba van, azonnal megállítjuk a folyamatot, nem küldjük el a backendnek
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/Auth/Register/Manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("Sikeres regisztráció! Kérjük, jelentkezz be.");
        router.push('/auth/login');
      } else {
        setError(data.error || "A regisztráció sikertelen volt.");
      }
    } catch (err) {
      setError("Nem sikerült kapcsolódni a szerverhez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <a href="/" className="flex items-center text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8 w-fit mx-auto">
          <ChevronLeft className="w-4 h-4 mr-1" /> Vissza a főoldalra
        </a>
        <h2 className="text-3xl font-bold tracking-tight text-white">Kezdjünk bele</h2>
        <p className="mt-2 text-slate-400">Hozza létre a vállalatainak központi fiókját.</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900/50 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-sm">
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Személyes Adatok */}
              <div className="space-y-5">
                <InputGroup label="Teljes Név" icon={<User size={18}/>} name="name" type="text" placeholder="Kovács János" value={formData.name} onChange={handleChange} />
                <InputGroup label="Munkahelyi E-mail" icon={<Mail size={18}/>} name="email" type="email" placeholder="janos@cegnev.hu" value={formData.email} onChange={handleChange} />
                <InputGroup label="Telefonszám" icon={<Phone size={18}/>} name="phone" type="tel" placeholder="+36 30 123 4567" value={formData.phone} onChange={handleChange} />
              </div>

              {/* Bolt Információk */}
              <div className="space-y-5">
                <InputGroup label="Cégnév / Bolt neve" icon={<Building2 size={18}/>} name="storeName" type="text" placeholder="Példa Kft." value={formData.storeName} onChange={handleChange} />
                <InputGroup label="Bolt Címe" icon={<MapPin size={18}/>} name="storeAddress" type="text" placeholder="1051 Budapest, Fő utca 1." value={formData.storeAddress} onChange={handleChange} />
                <InputGroup label="Születési Dátum" icon={<Calendar size={18}/>} name="dob" type="date" placeholder="" value={formData.dob} onChange={handleChange} />
              </div>
            </div>

            <InputGroup label="Jelszó" icon={<Lock size={18}/>} name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
            <p className="text-xs text-slate-500 mt-1">Min. 8 karakter, kis- és nagybetű, szám, speciális karakter.</p>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 mt-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 group disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Fiók Létrehozása <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-all" /></>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Már van fiókod? <a href="/auth/login" className="font-medium text-blue-400 hover:text-blue-300">Jelentkezz be</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Segédfüggvény az input mezőkhöz, hogy ne kelljen minden mezőnél újraírni a hasonló JSX-et
function InputGroup({ label, icon, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
          {icon}
        </div>
        <input
          {...props}
          required
          className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>
    </div>
  );
}