'use client';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/Auth/Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // A login függvény meghívása a Context-ben, hogy frissítsük a bejelentkezett állapotot és a token-t.
        login(data.token); 
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 2}; SameSite=Lax`;
      } else {
        // Ha a válasz nem ok és van egy error üzenet, azt jelenítjük meg, különben egy általános hibaüzenetet.
        setError(data.error || 'A bejelentkezés sikertelen volt');
      }
    } catch (err) {
      setError('Nem sikerült kapcsolódni a szerverhez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Háttér fény */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <a href="/" className="flex items-center text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8 w-fit">
          <ChevronLeft className="w-4 h-4 mr-1" /> Vissza a főoldalra
        </a>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Üdvözlünk újra!
        </h2>
        <p className="mt-2 text-slate-400">
          Jelentkezz be a készlet és az erőforrások kezeléséhez.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/50 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-sm">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Error üzenet */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300">E-mail cím</label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="nev@cegnev.hu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Jelszó</label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/50" />
                <label className="ml-2 text-slate-400">Emlékezz rám</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300">Elfelejtetted a jelszavad?</a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Bejelentkezés
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Még nincs fiókod?{' '}
              <a href="/auth/register" className="font-medium text-blue-400 hover:text-blue-300">
                Hozz létre egy fiókot
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}