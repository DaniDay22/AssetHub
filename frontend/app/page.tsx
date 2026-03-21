import React from 'react';
import { BarChart3, Package, Map } from 'lucide-react';

export default function AssetHubLanding() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-6xl mx-auto text-center">

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Készletkezelés <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              fejfájás nélkül.
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10">
            Az AssetHub valós idejű rálátást biztosít az árukészletedre, 
            részletes analitikát és egyedi bolttérképet kínál, hogy hatékonyan növelhesd a vállalkozásodat.
          </p>
          

        </div>
      </section>

      {/* Feature Grid */}
      <section className="px-6 py-20 bg-slate-950/50 border-y border-slate-900 ">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Package className="w-6 h-6 text-blue-400" />,
                title: "Készletkövetés",
                desc: "Élő adatok több helyszínről. Egyetlen pillantással láthatod, mi található pontosan a raktáradban."
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
                title: "Részletes Analitika",
                desc: "Jósolj meg keresleti mintákat és optimalizáld a tőkédet intelligens, adatalapú készletinformációkkal."
              },
              {
                icon: <Map className="w-6 h-6 text-blue-400" />,
                title: "Interaktív Bolttérkép",
                desc: "Soha többé ne keresgéld a termékeket. Hozz létre egyedi térképet az üzletedhez és a raktáradhoz."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats !!to be edited!!*/}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-blue-800 to-indigo-700 rounded-4xl p-12 text-center shadow-2xl overflow-hidden relative">
            {/* Subtle Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            <h2 className="text-3xl font-bold text-white mb-8 relative z-10">Több mint 500 növekvő vállalkozás bizalmával</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                <div>
                    <div className="text-4xl font-bold text-white mb-1">99.7%</div>
                    <div className="text-blue-100 text-sm">Pontosság</div>
                </div>
                <div>
                    <div className="text-4xl font-bold text-white mb-1">24/7</div>
                    <div className="text-blue-100 text-sm">Élő Felügyelet</div>
                </div>
                <div>
                    <div className="text-4xl font-bold text-white mb-1">12m+</div>
                    <div className="text-blue-100 text-sm">Kezelt Termék</div>
                </div>
                <div>
                    <div className="text-4xl font-bold text-white mb-1">30%</div>
                    <div className="text-blue-100 text-sm">Költségmegtakarítás</div>
                </div>
            </div>
        </div>
      </section>

      
    </div>
  );
}