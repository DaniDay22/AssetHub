//Nem működik
// app/(dashboard)/map/page.tsx
'use client';
import React, { useState } from 'react';
import { Box, Save, Plus, MousePointer2 } from 'lucide-react';

export default function StoreMapPage() {
  const [items, setItems] = useState<{ x: number, y: number }[]>([]);
  const [tool, setTool] = useState<'build' | 'inspect'>('build');
  const GRID_SIZE = 12;

  const toggleCell = (x: number, y: number) => {
    const exists = items.find(i => i.x === x && i.y === y);
    if (exists) {
      setItems(items.filter(i => i !== exists));
    } else {
      setItems([...items, { x, y }]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Store Blueprint</h1>
          <p className="text-slate-400 text-sm">Design and optimize your asset locations.</p>
        </div>
        <button className="bg-white text-black px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-lg active:scale-95">
          <Save size={18} /> Save Plan
        </button>
      </div>

      {/* Main Grid & Controls */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* THE MAP - Resizes based on container width */}
        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl md:rounded-[2rem] p-3 md:p-6 backdrop-blur-sm shadow-xl">
          <div 
            className="grid gap-1 md:gap-2 w-full aspect-square"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const isOccupied = items.find(item => item.x === x && item.y === y);

              return (
                <button
                  key={i}
                  onClick={() => toggleCell(x, y)}
                  className={`
                    relative rounded-sm md:rounded-md transition-all aspect-square border
                    ${isOccupied 
                      ? 'bg-blue-600 border-blue-400' 
                      : 'bg-slate-950/50 border-slate-800/50 hover:bg-slate-800'}
                  `}
                >
                  {isOccupied && <Box className="text-white w-2/3 h-2/3 mx-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTROLS - Stacks on mobile, Sidebar on XL screens */}
        <div className="w-full xl:w-80 flex flex-col sm:flex-row xl:flex-col gap-4">
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Toolbar</h3>
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
              <button 
                onClick={() => setTool('build')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${tool === 'build' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Plus size={18} /> <span>Place Shelf</span>
              </button>
              <button 
                onClick={() => setTool('inspect')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${tool === 'inspect' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <MousePointer2 size={18} /> <span>Inspect</span>
              </button>
            </div>
          </div>

          <div className="flex-1 bg-blue-600/5 border border-blue-500/10 rounded-2xl p-6">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Map Density</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">{items.length}</span>
              <span className="text-slate-500 mb-1">/ {GRID_SIZE * GRID_SIZE} Units</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}