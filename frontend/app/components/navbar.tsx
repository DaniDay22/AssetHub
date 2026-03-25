'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { Menu, X } from 'lucide-react'; 
import { usePathname } from 'next/navigation'; // <-- 1. ADD THIS

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname(); // <-- 2. ADD THIS
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 3. CHECK IF WE ARE IN THE DASHBOARD
  const isDashboard = pathname?.startsWith('/dashboard');

  const handleMobileAction = (action?: () => void) => {
    setIsMobileMenuOpen(false);
    if (action) action();
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 text-white transition-all ${isDashboard ? 'hidden md:block' : 'block'}`}>
    {/* 4. ADD DYNAMIC CLASSES TO HIDE ON MOBILE IF IN DASHBOARD */}
      
      {/* ... KEEP THE REST OF YOUR NAVBAR CODE EXACTLY THE SAME ... */}
      {/* ========================================= */}
      {/* DESKTOP NAVBAR (Hidden on phones) */}
      {/* ========================================= */}
      <nav className="hidden md:grid max-w-7xl mx-auto px-6 h-24 grid-cols-3 items-center">
        {user ? (
          <>
            <div className="flex justify-start space-x-4">
              <Link href="/" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1 transition-colors">
                Kezdőlap
              </Link>
              <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-tight border border-blue-500 rounded-md px-5 py-1 transition-colors">
                Vezérlőpult
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
              <Image src="/AssetHub-logo.png" alt="AssetHub Logo" width={40} height={40} />
              <span className="font-bold tracking-tight text-sm uppercase">AssetHub</span>
            </div>

            <div className="flex justify-end">
              <button onClick={logout} className="hover:text-red-400 hover:border-red-400/50 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1 transition-colors">
                Kijelentkezés
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-start">
              <Link href="/" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1 transition-colors">
                Kezdőlap
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
              <Image src="/AssetHub-logo.png" alt="AssetHub Logo" width={40} height={40} />
              <span className="font-bold tracking-tight text-sm uppercase">AssetHub</span>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/auth/login" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1 transition-colors">
                Bejelentkezés
              </Link>
              <Link href="/auth/register" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1 transition-colors">
                Regisztráció
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* ========================================= */}
      {/* MOBILE NAVBAR (Visible ONLY on phones) */}
      {/* ========================================= */}
      <nav className="md:hidden flex justify-between items-center px-4 h-20">
        <Link href="/" className="flex items-center gap-3 text-white" onClick={() => setIsMobileMenuOpen(false)}>
          <Image src="/AssetHub-logo.png" alt="AssetHub Logo" width={36} height={36} />
          <span className="font-bold tracking-tight text-sm uppercase">AssetHub</span>
        </Link>
        
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* MOBILE DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 absolute w-full left-0 flex flex-col p-4 shadow-2xl">
          {user ? (
            <div className="flex flex-col space-y-3">
              <Link href="/" onClick={() => handleMobileAction()} className="text-center hover:text-gray-300 font-bold tracking-tight border border-slate-700 rounded-md py-3 transition-colors">
                Kezdőlap
              </Link>
              <Link href="/dashboard" onClick={() => handleMobileAction()} className="text-center bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-tight border border-blue-500 rounded-md py-3 transition-colors">
                Vezérlőpult
              </Link>
              <button onClick={() => handleMobileAction(logout)} className="text-center hover:text-red-400 font-bold tracking-tight border border-slate-700 rounded-md py-3 mt-4 transition-colors">
                Kijelentkezés
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <Link href="/" onClick={() => handleMobileAction()} className="text-center hover:text-gray-300 font-bold tracking-tight border border-slate-700 rounded-md py-3 transition-colors">
                Kezdőlap
              </Link>
              <Link href="/auth/login" onClick={() => handleMobileAction()} className="text-center hover:text-gray-300 font-bold tracking-tight border border-slate-700 rounded-md py-3 transition-colors">
                Bejelentkezés
              </Link>
              <Link href="/auth/register" onClick={() => handleMobileAction()} className="text-center hover:text-gray-300 font-bold tracking-tight border border-slate-700 rounded-md py-3 transition-colors">
                Regisztráció
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}