'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function PageWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    // If in dashboard, 0 padding on mobile, 96px (pt-24) on desktop.
    // If anywhere else, always 96px padding.
    <main className={`flex-1 flex flex-col ${isDashboard ? 'pt-0 md:pt-24' : 'pt-24'}`}>
      {children}
    </main>
  );
}