'use client';
import React from 'react';
import { usePathname } from 'next/navigation'; // The GPS hook
import Link from 'next/link';
import { Users, Package, BarChart3, Map, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // Tells us if we are at /employees, /products, etc.

  const navItems = [
    { label: 'Employees', icon: <Users size={20} />, href: '/dashboard/employees' },
    { label: 'Products', icon: <Package size={20} />, href: '/dashboard/product' },
    { label: 'Sales Feed', icon: <BarChart3 size={20} />, href: '/dashboard/sales' },
    { label: 'Store Map', icon: <Map size={20} />, href: '/dashboard/map' },
  ];

  return (
    <div className="flex min-h-screen bg-[#020617]">
      {/* SIDEBAR */}
      <aside className="w-72 border-r border-slate-800 flex flex-col fixed h-full bg-[#020617]">
        <div className="p-8 text-2xl font-bold text-white italic">AssetHub</div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href; // Automatic active state!
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mt-2 flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                {item.icon}
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        
      </aside>

      {/* PAGE CONTENT */}
      <main className="flex-1 ml-72 p-10">
        {children}
      </main>
    </div>
  );
}