import { ArrowLeft } from 'lucide-react';

export default function DashboardPlaceholder() {
  return (
    <>// We use flex-1 to fill the space and h-full to ensure it doesn't collapse
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center px-4 relative min-h-[400px]">
      
      {/* Background Glow */}
      <div className="absolute w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full -z-10" />

      {/* Main Content Group */}
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-4 animate-pulse">
          <ArrowLeft className="w-8 h-8 text-blue-500" />
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Please select an option
          </h2>
        </div>
        
        <p className="text-slate-400 max-w-sm mx-auto text-lg leading-relaxed">
          Choose a category from the sidebar to manage your assets or view recent sales.
        </p>

        
      </div>
    </div>
    </>
  );
}