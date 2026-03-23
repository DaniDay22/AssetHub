'use client';
import { ArrowLeft, MousePointerClick } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full h-full text-center relative overflow-hidden bg-[#020617]">
      
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -z-10" />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center gap-4 mb-6">
          <ArrowLeft className="w-8 h-8 text-blue-500" />
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Kérlek, válassz egy menüpontot
          </h2>
        </div>
        
        <p className="text-slate-400 max-w-sm text-lg leading-relaxed mb-8">
          Válassz egy kategóriát az oldalsávból a készlet kezeléséhez vagy a legutóbbi eladások megtekintéséhez.
        </p>

        
      </div>

    </div>
  );
}