import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const AccordionItem = ({ title, isOpen, onClick, children, icon }: any) => (
    <div className={`group rounded-[24px] transition-all duration-500 border mb-4 overflow-hidden relative ${isOpen ? 'bg-[#1a1b26]/60 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
        <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-500 ${isOpen ? 'opacity-100' : ''}`} />
        
        <button 
            onClick={onClick} 
            className="w-full p-5 flex justify-between items-center relative z-10"
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl transition-all duration-500 ${isOpen ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-slate-400'}`}>
                    {icon}
                </div>
                <span className={`font-bold text-xs uppercase tracking-[0.15em] transition-colors ${isOpen ? 'text-white' : 'text-slate-400'}`}>{title}</span>
            </div>
            <div className={`p-1.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-white/10 rotate-180 text-white' : 'text-slate-500'}`}>
                <ChevronDown size={14} />
            </div>
        </button>
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] overflow-hidden ${isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-5 pb-5 space-y-6 pt-1 relative z-10">
                {children}
            </div>
        </div>
    </div>
);

export const InfoRow = ({ label, value, unit, subValue, highlight = false, alert = false }: any) => (
    <div className="flex justify-between items-end border-b border-white/5 last:border-0 py-3.5 group hover:bg-white/5 px-4 rounded-2xl transition-all duration-300 relative overflow-hidden">
        {highlight && <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"/>}
        {alert && <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"/>}
        
        <div className="flex flex-col relative z-10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            {subValue && <span className="text-[9px] text-slate-600 font-medium tracking-wide">{subValue}</span>}
        </div>
        <div className="text-right relative z-10">
            <div className={`font-mono font-black text-sm tracking-tight flex items-baseline gap-1 justify-end ${alert ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : highlight ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-white'}`}>
                {value} <span className="text-[10px] text-slate-500 font-sans font-bold uppercase">{unit}</span>
            </div>
        </div>
    </div>
);