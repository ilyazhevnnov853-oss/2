import React from 'react';
import { Home, ChevronLeft } from 'lucide-react';

export const AppHeader = ({ title, subtitle, icon, onBack, onHome, rightContent }: any) => (
    <div className="flex items-center justify-between p-3 md:p-4 mb-4 glass-panel rounded-2xl shrink-0 border border-white/5 relative z-30">
        <div className="flex items-center gap-2 md:gap-3">
            <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                <button onClick={onHome} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="В Главное меню">
                    <Home size={18} />
                </button>
                {onBack && (
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Назад">
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>
            <div className="h-8 w-px bg-white/10 mx-1 md:mx-2"></div>
            <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    {icon}
                </div>
                <div>
                    <h1 className="text-sm md:text-lg font-bold text-white leading-none">{title}</h1>
                    {subtitle && <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 hidden md:block">{subtitle}</p>}
                </div>
            </div>
        </div>
        {rightContent && <div>{rightContent}</div>}
    </div>
);

export const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <div className="flex items-center gap-2 text-slate-400 mb-2 px-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
    </div>
);

export const GlassMetric = ({ label, value, unit, color }: any) => (
    <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className={`font-mono text-xl font-bold ${color} drop-shadow-sm`}>{value}</span>
            <span className="text-[10px] text-slate-500 font-bold">{unit}</span>
        </div>
    </div>
);

export const GlassButton = ({ onClick, icon, label, active, secondary, customClass, disabled }: any) => {
    let base = "relative overflow-hidden group h-12 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wide ";
    if (disabled) base += " opacity-50 cursor-not-allowed";
    let style = secondary ? "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5" : customClass;
    return (
        <button onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
            <span className={active ? 'scale-110' : 'group-hover:scale-110 transition-transform'}>{icon}</span>
            {label && <span>{label}</span>}
        </button>
    );
};

export const GlassSlider = ({ label, icon, val, min, max, step, unit, onChange, gradient, color }: any) => {
    const pct = ((val - min) / (max - min)) * 100;
    let dynGrad = gradient || 'from-blue-600 to-cyan-400';
    if (color === 'temp') {
        if (val < 20) dynGrad = 'from-cyan-500 to-blue-500';
        else if (val > 26) dynGrad = 'from-orange-500 to-red-500';
        else dynGrad = 'from-emerald-500 to-emerald-400';
    }

    return (
        <div className="group">
            <div className="flex justify-between items-end mb-3 px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">{icon} {label}</div>
                <div className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-1 rounded-lg border border-white/5 min-w-[60px] text-center">{val.toFixed(0)}{unit}</div>
            </div>
            <div className="relative h-6 w-full touch-none flex items-center">
                <div className="absolute inset-0 h-1.5 top-1/2 -translate-y-1/2 bg-white/5 rounded-full overflow-hidden"><div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${dynGrad} opacity-50`} style={{width: `${pct}%`}} /></div>
                <input type="range" min={min} max={max} step={step} value={val} onChange={e => onChange(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"/>
                <div className="absolute h-5 w-5 bg-white rounded-full shadow-lg shadow-black/50 border-2 border-[#0f172a] z-10 pointer-events-none transition-all group-hover:scale-110" style={{left: `calc(${pct}% - 10px)`}}><div className={`absolute inset-1 rounded-full bg-gradient-to-tr ${dynGrad} opacity-80`}></div></div>
            </div>
        </div>
    );
};