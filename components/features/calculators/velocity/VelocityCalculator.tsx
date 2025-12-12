import React, { useState } from 'react';
import { Calculator, Grid, CircleDot, Wind, Settings2, Home, ChevronLeft, Menu, X } from 'lucide-react';
import { SectionHeader, GlassSlider } from '../../../ui/Shared';

const VelocityCalculator = ({ onBack, onHome }: any) => {
    const [volume, setVolume] = useState<number>(1000);
    const [minSpeed, setMinSpeed] = useState<number>(2);
    const [maxSpeed, setMaxSpeed] = useState<number>(5);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data ranges
    const circularSizes = [100, 125, 160, 200, 250, 315, 355, 400, 450, 500, 630, 710, 800, 1000, 1250];
    const rectSizes = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000];

    // Helper
    const calculateSpeed = (area: number) => {
        if (!area || area === 0) return 0;
        return volume / (3600 * area);
    };

    const getStatusColor = (speed: number) => {
        if (speed === 0) return "text-slate-700";
        if (speed >= minSpeed && speed <= maxSpeed) return "text-emerald-400 font-bold bg-emerald-500/10 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)] border-emerald-500/20";
        if (speed > maxSpeed) return "text-amber-500/50";
        return "text-slate-600";
    };

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-emerald-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none"></div>

            {/* LEFT PANEL (Controls & Circular) */}
             <div className={`
                fixed inset-0 z-50 bg-black/95 backdrop-blur-xl lg:static lg:bg-transparent
                flex flex-col lg:w-[420px] h-screen shrink-0 transition-transform duration-300
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                relative z-30 p-4 pl-0 lg:pl-4
            `}>
                <div className="flex-1 flex flex-col rounded-[32px] bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative">
                         <div className="flex justify-between items-center lg:hidden mb-4">
                            <h2 className="text-lg font-bold text-white">Меню</h2>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-lg text-white"><X size={20} /></button>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex gap-2">
                                <button onClick={onHome} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group" title="На главную">
                                    <Home size={18} />
                                </button>
                                <button onClick={onBack} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group" title="Назад">
                                    <ChevronLeft size={18} />
                                </button>
                            </div>
                            <div className="h-8 w-px bg-white/10"></div>
                            
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20 text-white">
                                    <Calculator size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Калькулятор</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        
                        {/* Inputs Section */}
                        <div className="space-y-6">
                            <SectionHeader icon={<Settings2 size={14}/>} title="Параметры потока" />
                            
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Расход воздуха</span>
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number" 
                                                value={volume} 
                                                onChange={(e) => setVolume(Math.max(0, Number(e.target.value)))} 
                                                className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-emerald-500/50 transition-colors"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500">м³/ч</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={volume} min={0} max={5000} step={50} 
                                        onChange={setVolume} 
                                        gradient="from-emerald-600 via-teal-500 to-cyan-400"
                                        icon={<Wind size={14}/>}
                                        label=""
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Мин. Скорость</div>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                value={minSpeed} 
                                                onChange={(e) => setMinSpeed(Number(e.target.value))} 
                                                className="bg-transparent w-full text-sm font-bold font-mono text-white outline-none" 
                                            />
                                            <span className="text-[10px] text-slate-600">м/с</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Макс. Скорость</div>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                value={maxSpeed} 
                                                onChange={(e) => setMaxSpeed(Number(e.target.value))} 
                                                className="bg-transparent w-full text-sm font-bold font-mono text-white outline-none" 
                                            />
                                            <span className="text-[10px] text-slate-600">м/с</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Circular Ducts Section */}
                        <div className="space-y-4">
                            <SectionHeader icon={<CircleDot size={14}/>} title="Круглые сечения" />
                            <div className="grid grid-cols-2 gap-2">
                                {circularSizes.map(d => {
                                    const area = Math.PI * Math.pow(d / 1000, 2) / 4;
                                    const speed = calculateSpeed(area);
                                    const isGood = speed >= minSpeed && speed <= maxSpeed;
                                    
                                    return (
                                        <div key={d} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isGood ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_4px_12px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 opacity-60'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isGood ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                                                <span className="font-mono text-xs font-bold text-slate-300">Ø{d}</span>
                                            </div>
                                            <span className={`font-mono text-xs font-bold ${isGood ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {speed.toFixed(1)} <span className="text-[9px] opacity-70">м/с</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT (Rectangular Matrix) */}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden p-4 pl-0">
                <div className="flex-1 rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border border-white/5 ring-1 ring-white/5 group flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none"></div>

                    {/* Header */}
                    <div className="p-8 pb-4 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 rounded-full bg-blue-600 text-white shadow-lg"><Menu size={20} /></button>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <Grid className="text-emerald-500" size={24} />
                                    Прямоугольные воздуховоды
                                </h2>
                                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider ml-9">Таблица скоростей (м/с)</p>
                            </div>
                        </div>
                    </div>

                    {/* Matrix */}
                    <div className="flex-1 overflow-auto custom-scrollbar p-6 pt-0 relative z-10">
                         <div className="inline-block min-w-full align-middle">
                            <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm">
                                <table className="min-w-full divide-y divide-white/10">
                                    <thead className="bg-[#0f172a]/90 sticky top-0 z-20 backdrop-blur-md">
                                        <tr>
                                            <th scope="col" className="sticky left-0 z-30 bg-[#0f172a] p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                                A x B (мм)
                                            </th>
                                            {rectSizes.map(w => (
                                                <th key={w} scope="col" className="p-3 text-center text-[10px] font-bold text-slate-400 font-mono border-l border-white/5 min-w-[60px]">
                                                    {w}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {rectSizes.map(h => (
                                            <tr key={h} className="hover:bg-white/5 transition-colors">
                                                <td className="sticky left-0 z-10 bg-[#0b0c15] p-3 text-[11px] font-bold text-slate-300 font-mono border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                                    {h}
                                                </td>
                                                {rectSizes.map(w => {
                                                    const area = (w / 1000) * (h / 1000);
                                                    const speed = calculateSpeed(area);
                                                    const statusClass = getStatusColor(speed);
                                                    return (
                                                        <td key={`${h}x${w}`} className={`p-2 text-center border-l border-white/5 transition-colors duration-300 ${statusClass.includes('bg-emerald') ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : ''}`}>
                                                            <div className={`text-xs font-mono font-medium ${statusClass}`}>
                                                                {speed.toFixed(1)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    {/* Legend Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 justify-end">
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                             <span>Оптимально ({minSpeed}-{maxSpeed} м/с)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                             <span>Превышение ({'>'}{maxSpeed} м/с)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                             <span>Низкая скорость ({'<'}{minSpeed} м/с)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VelocityCalculator;