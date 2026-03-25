'use client';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Package, BarChart3, Store, User, Menu, X , LogOut} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  // 1. STATE FOR MOBILE MENU
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 2. CLOSE MENU AUTOMATICALLY WHEN CHANGING PAGES
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Alkalmazottak', icon: <Users size={24} />, href: '/dashboard/employees', roles: [1, 2] }, 
    { label: 'Termékek', icon: <Package size={24} />, href: '/dashboard/product', roles: [1, 2] },
    { label: 'Eladások', icon: <BarChart3 size={24} />, href: '/dashboard/sales', roles: [1, 2, 3] },
    { label: 'Boltok', icon: <Store size={24} />, href: '/dashboard/stores', roles: [1] },
    { label: 'Fiók', icon: <User size={24} />, href: '/dashboard/account', roles: [1, 2, 3] },
  ];

  const visibleItems = navItems.filter(item => {
    if (!user || !user.AuthLv) return true; 
    return item.roles.includes(Number(user.AuthLv)); 
  });

  return (
    // Changed to flex-col on mobile, flex-row on desktop so we can add a mobile header!
    <div className="flex-1 flex flex-col md:flex-row h-full w-full bg-[#020617] overflow-hidden font-sans relative">
      
      {/* MOBILE HEADER (Only shows on phones) */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-[#020617] shrink-0 z-10">
        <div className="flex items-center gap-3 text-white font-bold text-lg">
          <Store className="text-blue-500 w-6 h-6" />
          <span>AssetHub</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-slate-400 hover:text-white transition-colors p-1"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* MOBILE OVERLAY (Darkens the background when menu is open) */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* SIDEBAR */}
      <aside className={`
        fixed md:relative top-0 left-0 z-50 w-72 border-r border-slate-800 flex flex-col h-[100dvh] md:h-[calc(100vh-96px)] bg-[#020617] shrink-0
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* MOBILE CLOSE BUTTON (Inside Sidebar) */}
        <div className="md:hidden flex justify-end p-4">
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 md:mt-8 mt-2 flex flex-col space-y-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span className="text-base font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {/* --- ADD THIS NEW BOTTOM SECTION --- */}
        <div className="p-4 border-t border-slate-800 mt-auto md:hidden"> 
          <button 
            onClick={logout}
            className="flex items-center w-full space-x-4 px-4 py-3.5 rounded-2xl transition-all text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={24} />
            <span className="text-base font-semibold">Kijelentkezés</span>
          </button>
        </div>
        {/* ----------------------------------- */}
        
      </aside>

      {/* PAGE CONTENT */}
      {/* Removed the fixed height calc on mobile so it scrolls naturally */}
      <main className="flex-1 flex flex-col h-full md:h-[calc(100vh-96px)] relative overflow-y-auto bg-[#020617]">
        {children}
      </main>
      
    </div>
  );
}