'use client';

// FIXED IMPORT: Always use 'next/navigation' in the App Router!
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link'; 

export default function Footer(){
  const pathname = usePathname();

  // If the URL starts with /dashboard, return null (don't render the footer)
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }
  
  return (
    <footer className="mt-auto px-6 py-8 border-t border-slate-900 text-center bg-[#020617]">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Image src="/AssetHub-logo.png" alt="AssetHub Logo" className="w-auto m-auto" 
                width={30}
                height={24} 
          />
        </div>
        
        <span className="text-xl font-bold text-white tracking-tight">AssetHub</span>
        <p className="text-slate-500 text-sm mb-2">
          &copy; 2026 AssetHub Systems Inc.
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
            <Link href="#" className="text-slate-500 text-sm mb-2 hover:text-gray-400">
              Privacy Policy
            </Link>
            <Link href="#" className="text-slate-500 text-sm mb-2 hover:text-gray-400">
              Terms of Service
            </Link>  
          </div>
          <div>
            <Link href="/about" className="text-slate-500 text-sm mb-2 hover:text-gray-400">
              Rólunk
            </Link>
          </div>
      </footer>
  );
}