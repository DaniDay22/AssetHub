import React from 'react';
import Image from 'next/image';
import { Users, Target, Rocket, ShieldCheck } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 mt-35">
      {/* Hero Szekció */}
      <section className="relative px-6 pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        {/* Háttér fény */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-blue-400 font-semibold tracking-wider uppercase text-sm mb-4">Küldetésünk</h2>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Rendszerezzük a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              világ fizikai eszközeit.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
            A 2026-ban alapított AssetHub egy egyszerű megfigyelésből született: a kis- és középvállalkozások 
            milliókat veszítettek a termelékenységből a szétaprózódott készletnyilvántartó rendszerek miatt. 
            Felépítettük a modern raktárak operációs rendszerét.
          </p>
        </div>
      </section>

      {/* Values Grid */}
      <section className="px-6 py-20 bg-slate-950/50 border-y border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Értékek, melyek vezérelnek minket</h2>
            <div className="h-1 w-20 bg-blue-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Target className="w-5 h-5 text-blue-400" />,
                title: "Első a pontosság",
                desc: "A készletezésben az 1% hiba 100% kudarc. A tökéletes pontosságra törekszünk."
              },
              {
                icon: <Users className="w-5 h-5 text-blue-400" />,
                title: "Felhasználó-központúság",
                desc: "A szoftvernek kell az emberekért dolgoznia, nem fordítva. Az egyszerűbb mindig jobb."
              },
              {
                icon: <Rocket className="w-5 h-5 text-blue-400" />,
                title: "Skálázhatóság",
                desc: "Eszközeink veled együtt nőnek, az első garázsodtól egészen az 50. boltodig."
              },
              {
                icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
                title: "Bizalom és Biztonság",
                desc: "Az adatod a te versenyelőnyöd. Úgy védjük, mintha a sajátunk lenne."
              }
            ].map((value, i) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition-all">
                <div className="mb-4">{value.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      
    </div>
  );
}