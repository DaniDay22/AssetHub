'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
// Swapped out 'Map' for 'Store'
import { Users, Package, BarChart3, Store, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth(); 

  const navItems = [
    { label: 'Alkalmazottak', icon: <Users size={24} />, href: '/dashboard/employees', roles: [1, 2] }, 
    { label: 'Termékek', icon: <Package size={24} />, href: '/dashboard/product', roles: [1, 2, 3] },
    { label: 'Eladások', icon: <BarChart3 size={24} />, href: '/dashboard/sales', roles: [1, 2, 3] },
    { label: 'Boltok', icon: <Store size={24} />, href: '/dashboard/stores', roles: [1, 2] }, // Only Owners (1) & Managers (2)
    { label: 'Fiók', icon: <User size={24} />, href: '/dashboard/account', roles: [1, 2, 3] },
  ];

  const visibleItems = navItems.filter(item => {
    // If there is no user, or the token is missing AuthLv, show the item to be safe
    if (!user || !user.AuthLv) return true; 
    
    // Convert the user's AuthLv to a number before checking
    return item.roles.includes(Number(user.AuthLv)); 
  });

  return (
    // "flex-row" forces left-to-right layout. "h-full" ensures it fills the screen.
    <div className="flex-1 flex flex-row h-full w-full bg-[#020617] overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 border-r border-slate-800 flex flex-col h-[calc(100vh-96px)] bg-[#020617] shrink-0 relative z-20">
        
        <nav className="flex-1 px-4 mt-8 flex flex-col space-y-2">
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
      </aside>

      {/* PAGE CONTENT */}
      <main className="flex-1 flex flex-col h-[calc(100vh-96px)] relative overflow-y-auto bg-[#020617]">
        {children}
      </main>
      
    </div>
  );
}