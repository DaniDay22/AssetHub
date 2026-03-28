'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { Menu, X, ArrowRight, LogOut } from 'lucide-react'; 
import { usePathname } from 'next/navigation'; 

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname(); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDashboard = pathname?.startsWith('/dashboard');

  const handleMobileAction = (action?: () => void) => {
    setIsMobileMenuOpen(false);
    if (action) action();
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 text-white transition-all ${isDashboard ? 'hidden md:block' : 'block'}`}>
      

      {/* DESKTOP NAVBAR */}
      <nav className="hidden md:grid max-w-7xl mx-auto px-6 h-24 grid-cols-3 items-center">
        
        {/* Bal Oszlop: Főbb Linkek */}
        <div className="flex justify-start gap-6 items-center">
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Kezdőlap
          </Link>
          {user && (
            <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
              Vezérlőpult <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Középső Oszlop: Logo & Brand */}
        <div className="flex justify-center items-center">
          <Link href="/" className="flex flex-col items-center justify-center gap-1 hover:opacity-90 transition-opacity">
            <Image src="/AssetHub-logo.png" alt="AssetHub Logo" width={40} height={40} className="" />
            <span className="text-xl font-extrabold text-white tracking-tight">Asset<span className="text-blue-500">Hub</span></span>
          </Link>
        </div>

        {/* Jobb Oszlop: Hitelesítési Akciók */}
        <div className="flex justify-end gap-6 items-center">
          {user ? (
            <button 
              onClick={logout} 
              className="text-sm font-medium text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Kijelentkezés
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Bejelentkezés
              </Link>
              <Link href="/auth/register" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
                Regisztráció
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* MOBILE NAVBAR  */}
      <nav className="md:hidden flex justify-between items-center px-6 h-20">
        <Link href="/" className="flex items-center gap-3 text-white" onClick={() => setIsMobileMenuOpen(false)}>
          <Image src="/AssetHub-logo.png" alt="AssetHub Logo" width={32} height={32} className="" />
          <span className="text-xl font-extrabold text-white tracking-tight">Asset<span className="text-blue-500">Hub</span></span>
        </Link>
        
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white transition-colors focus:outline-none"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>


      {/* MOBILE HAMBURGER MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0f172a] border-t border-slate-800 absolute w-full left-0 flex flex-col px-6 py-6 shadow-2xl space-y-3">
          {user ? (
            <>
              <Link href="/" onClick={() => handleMobileAction()} className="w-full text-center text-slate-300 hover:text-white hover:bg-slate-800/50 font-medium rounded-xl py-3.5 transition-colors">
                Kezdőlap
              </Link>
              <Link href="/dashboard" onClick={() => handleMobileAction()} className="w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                Vezérlőpult <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => handleMobileAction(logout)} className="w-full flex items-center justify-center gap-2 text-center text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium rounded-xl py-3.5 mt-2 transition-colors">
                <LogOut className="w-4 h-4" /> Kijelentkezés
              </button>
            </>
          ) : (
            <>
              <Link href="/" onClick={() => handleMobileAction()} className="w-full text-center text-slate-300 hover:text-white hover:bg-slate-800/50 font-medium rounded-xl py-3.5 transition-colors">
                Kezdőlap
              </Link>
              <Link href="/auth/login" onClick={() => handleMobileAction()} className="w-full text-center text-slate-300 hover:text-white hover:bg-slate-800/50 font-medium rounded-xl py-3.5 transition-colors">
                Bejelentkezés
              </Link>
              <Link href="/auth/register" onClick={() => handleMobileAction()} className="w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-blue-500/20">
                Regisztráció
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}