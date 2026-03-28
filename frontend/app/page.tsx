'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Package, ShieldCheck, BarChart3,
  CheckCircle2, XCircle, Star, ChevronDown, PlayCircle, Zap
} from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-blue-500/30">



      {/* Hero Szekció */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-blue-400 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" /> Készletkezelés, ami végre működik
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-8">
            Vedd át az irányítást a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">készleted felett.</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Felejtsd el a káoszos Excel táblákat és az elveszett papírokat. Az AssetHub egyetlen felületen egyesíti az értékesítést, a raktárt és a csapatot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
              Kezdjünk hozzá <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>



      {/* Funkciók Szekció */}
      <section id="features" className="py-24 px-6 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Minden, amire egy boltnak szüksége van</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Nem funkciókat árulunk, hanem megoldásokat a mindennapi problémáidra.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Package}
              title="Valós idejű Készlet"
              feature="Automatikus szinkronizáció az eladásokkal."
              benefit="Soha többé nem kell órákat töltened a raktárban számolással. Mindig pontosan tudod, mi van a polcon."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Szerepkörök & Jogosultságok"
              feature="Külön fiók a tulajdonosnak, menedzsernek és eladónak."
              benefit="Az alkalmazottak csak azt látják, amire szükségük van a munkához. A beszerzési árak és a teljes bevétel szigorúan csak a te szemednek szól."
            />
            <FeatureCard
              icon={BarChart3}
              title="Okos Bevásárlólista"
              feature="Riasztások alacsony készlet esetén egyetlen kattintással."
              benefit="Nem maradsz le a bevételről, mert kifogyott a legnépszerűbb terméked. A rendszer szól, mielőtt a polc kiürülne."
            />
          </div>
        </div>
      </section>

      {/* Összehasonlítás Szekció */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">Miért az AssetHub?</h2>
            <p className="text-slate-400">Ideje magad mögött hagyni az elavult módszereket.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* A régi mód */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-xl font-bold text-slate-400 mb-6 flex items-center gap-2">
                <XCircle className="text-slate-500 w-6 h-6" /> Hagyományos módszerek
              </h3>
              <ul className="space-y-4">
                <ComparisonItem bad text="Káoszos, kézzel írt füzetek" />
                <ComparisonItem bad text="Excel táblák, amiket mindenki elront" />
                <ComparisonItem bad text="Leltárhiány, amire hetekkel később derül fény" />
                <ComparisonItem bad text="Nincs rálátásod a boltra, ha nem vagy ott" />
              </ul>
            </div>

            {/* Az AssetHub mód */}
            <div className="bg-blue-900/10 border border-blue-500/30 p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="w-24 h-24 text-blue-500" /></div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                <CheckCircle2 className="text-blue-400 w-6 h-6" /> AssetHub
              </h3>
              <ul className="space-y-4 relative z-10">
                <ComparisonItem good text="Letisztult, modern digitális felület" />
                <ComparisonItem good text="Automatikus vonalkód és CSV feltöltés" />
                <ComparisonItem good text="Azonnali riasztások készlethiány esetén" />
                <ComparisonItem good text="Bárhonnan ellenőrizheted az üzleted állását" />
              </ul>
            </div>
          </div>
        </div>
      </section>



      {/* GYAKORI KÉRDÉSEK */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-10 text-center">Gyakori Kérdések</h2>
          <div className="space-y-4">
            <FaqItem
              id={1} openId={openFaq} setOpen={setOpenFaq}
              question="Nehéz betanítani a dolgozókat a használatára?"
              answer="Egyáltalán nem. Az eladói felület (Sales) szándékosan le van butítva a legszükségesebb funkciókra. Ha valaki tud használni egy okostelefont, az AssetHub is menni fog neki 5 perc alatt."
            />
            <FaqItem
              id={2} openId={openFaq} setOpen={setOpenFaq}
              question="Meglévő Excel táblából át tudom hozni a készletet?"
              answer="Igen! A CSV feltöltő modulunk segítségével a meglévő táblázataidat egyetlen gombnyomással importálhatod a rendszerbe."
            />
            <FaqItem
              id={3} openId={openFaq} setOpen={setOpenFaq}
              question="Mi történik, ha elmegy az internet?"
              answer="A rendszer felhő alapú a maximális biztonság érdekében, így az aktuális adatok mentéséhez hálózati kapcsolat szükséges. Ha megszakad a net, a felület értesít."
            />
          </div>
        </div>
      </section>

      {/* Végleges CTA Szekció */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto bg-blue-600 rounded-[2.5rem] p-12 text-center relative overflow-hidden shadow-2xl shadow-blue-600/20">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20"><Zap className="w-64 h-64 text-white" /></div>
          <h2 className="text-4xl font-extrabold text-white mb-6 relative z-10">Készen állsz a szintlépésre?</h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto relative z-10">
            Csatlakozz a modern boltvezetők táborához, és spórolj a papírmunkával.
          </p>
          <Link href="auth/register" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-xl text-xl font-extrabold transition-transform hover:scale-105 shadow-lg relative z-10">
            Regisztráció
          </Link>
        </div>
      </section>


    </div>
  );
}

// Komponensek a landing page-hez

function FeatureCard({ icon: Icon, title, feature, benefit }: any) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl hover:border-slate-600 transition-colors group">
      <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
        <Icon className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-blue-400 text-sm font-medium mb-3">{feature}</p>
      <p className="text-slate-400 leading-relaxed">{benefit}</p>
    </div>
  );
}

function ComparisonItem({ good, bad, text }: any) {
  return (
    <li className={`flex items-start gap-3 ${good ? 'text-blue-100' : 'text-slate-500'}`}>
      {good ? <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />}
      <span className="font-medium">{text}</span>
    </li>
  );
}

function FaqItem({ id, openId, setOpen, question, answer }: any) {
  const isOpen = openId === id;
  return (
    <div className="border border-slate-700 bg-slate-800/40 rounded-2xl overflow-hidden transition-all">
      <button
        onClick={() => setOpen(isOpen ? null : id)}
        className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none"
      >
        <span className="font-bold text-white text-lg">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-slate-400 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}