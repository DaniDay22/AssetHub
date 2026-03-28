'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function PageWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <main className={`flex-1 flex flex-col`}>
      {children}
    </main>
  );
}