'use client';

import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link'; // Use Link instead of <a>

export default function Navbar(){
const { user, logout } = useAuth();

  return (
    
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 text-white">
          <nav className="max-w-7xl mx-auto px-6 h-24 grid grid-cols-3 items-center">

            {user ? (
                //Ide kell majd a bejelentkezett navbar
                <>
              <div className="flex justify-start space-x-4">
          <Link href="/" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1">
            Home
          </Link>
          <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-tight border border-blue-500 rounded-md px-5 py-1">
            Dashboard
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center space-y-1">
          <Image 
            src="/AssetHub-logo.png" 
            alt="AssetHub Logo" 
            width={40} 
            height={40} 
          />
          <span className="font-bold tracking-tight text-sm uppercase">AssetHub</span>
        </div>

        <div className="flex justify-end">
          {/* You might want a Logout button or Profile link here later */}
          <button onClick={logout} className="hover:text-red-400 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1">
            Logout
          </button>
        </div>
            </>
            ) : (
                //Kijelentkezett navbar
                <>
              <div className="flex justify-start">
              <Link href="/" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1">
                Home
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
              <Image 
                src="/AssetHub-logo.png" 
                alt="AssetHub Logo" 
                width={40} 
                height={40} 
              />
              <span className="font-bold tracking-tight text-sm uppercase">AssetHub</span>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/auth/login" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1">
                Login
              </Link>
              <Link href="/auth/register" className="hover:text-gray-300 font-bold tracking-tight border border-slate-500 rounded-md px-5 py-1">
                Register
              </Link>
            </div>
            </>
            )}
          </nav>
        </header>
      
  );
}