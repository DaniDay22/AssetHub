import React from 'react';
import Image from 'next/image';
import { Users, Target, Rocket, ShieldCheck } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 mt-35">
      {/* Hero / Vision Section */}
      <section className="relative px-6 pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        {/* Background Glow - Matching your landing page */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-blue-400 font-semibold tracking-wider uppercase text-sm mb-4">Our Mission</h2>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            We’re organizing the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              world’s physical assets.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
            Founded in 2024, AssetHub was born out of a simple observation: small and medium businesses 
            were losing millions in productivity due to fragmented inventory systems. We built the 
            operating system for the modern warehouse.
          </p>
        </div>
      </section>

      {/* Values Grid */}
      <section className="px-6 py-20 bg-slate-950/50 border-y border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">The values that drive us</h2>
            <div className="h-1 w-20 bg-blue-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Target className="w-5 h-5 text-blue-400" />,
                title: "Precision First",
                desc: "In inventory, a 1% error is a 100% failure. We build for absolute accuracy."
              },
              {
                icon: <Users className="w-5 h-5 text-blue-400" />,
                title: "User Centric",
                desc: "Software should work for people, not the other way around. Simple is better."
              },
              {
                icon: <Rocket className="w-5 h-5 text-blue-400" />,
                title: "Scalability",
                desc: "Our tools grow with you, from your first garage to your 50th warehouse."
              },
              {
                icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
                title: "Trust & Security",
                desc: "Your data is your competitive advantage. We protect it like our own."
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
      {/* CTA Section - Matching the Social Proof style */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-900 to-blue-900 rounded-4xl p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          
          <h2 className="text-3xl font-bold text-white mb-4 relative z-10">Join our journey</h2>
          <p className="text-blue-100 mb-8 max-w-lg mx-auto relative z-10">
            We're always looking for talented people to help us redefine logistics and supply chain management.
          </p>
          <button className="px-8 py-3 bg-white text-blue-900 font-semibold rounded-full hover:bg-blue-50 transition-colors relative z-10">
            View Openings
          </button>
        </div>
      </section>
    </div>
  );
}