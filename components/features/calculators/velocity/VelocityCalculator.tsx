import React, { useState, useMemo } from 'react';
import { Calculator, Grid, CircleDot, Wind, Settings2, Home, ChevronLeft, Menu, X, Table2, Wand2, CheckCircle2, ArrowRight } from 'lucide-react';
import { SectionHeader, GlassSlider, GlassButton } from '../../../ui/Shared';

const VelocityCalculator = ({ onBack, onHome }: any) => {
    const [volume, setVolume] = useState<number>(1000);
    const [minSpeed, setMinSpeed] = useState<number>(2);
    const [maxSpeed, setMaxSpeed] = useState<number>(5); // Acts as Limit in Wizard
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mode, setMode] = useState<'check' | 'wizard'>('check');

    // Data ranges
    const circularSizes = [100, 125, 160, 200, 250, 315, 355, 400, 450, 500, 630, 710, 800, 1000, 1250];
    const rectSizes = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000];

    // Helper
    const calculateSpeed = (area: number) => {
        if (!area || area === 0) return 0;
        return volume / (3600 * area);
    };

    // Wizard Logic
    const suggestions = useMemo(() => {
        if (mode !== 'wizard') return { round: [], rect: [] };

        // Circular
        const round = circularSizes.map(d => {
            const area = Math.PI * Math.pow(d / 1000, 2) / 4;
            const v = calculateSpeed(area);
            return { d, v, area };
        })
        .filter(i => i.v <= maxSpeed && i.v > 0.5) // Filter valid
        .sort((a, b) => b.v - a.v); // Sort closest to limit

        // Rectangular
        const rect = [];
        for (let h of rectSizes) {
            for (let w of rectSizes) {
                if (w < h) continue; // standard format w >= h
                const area = (w / 1000) * (h / 1000);
                const v = calculateSpeed(area);
                if (v <= maxSpeed && v > 0.5) {
                    rect.push({ w, h, v, area });
                }
            }
        }
        // Heuristic sort: Closest to limit velocity (smallest suitable size)
        rect.sort((a, b) => b.v - a.v);

        return { round, rect: rect.slice(0, 50) }; // Limit rect results
    }, [volume, maxSpeed, mode]);

    const getStatusColor = (speed: number) => {
        if (speed === 0) return "text-slate-700";
        if (speed >= minSpeed && speed <= maxSpeed) return "text-emerald-400 font-bold bg-emerald-500/10 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)] border-emerald-500/20";
        if (speed > maxSpeed) return "text-amber-500/50";
        return "text-slate-600";
    };

    return (
        <div className="flex w-full h-[100dvh] bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-emerald-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none"></div>

            {/* LEFT PANEL (Controls) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/80 z-[60] lg:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            )}

             <div className={`
                fixed inset-y-0 left-0 z-[70] bg-[#0a0a0f] lg:bg-transparent lg:static w-[85vw] md:w-[420px] lg:w-[420px] h-full shrink-0 transition-transform duration-300 ease-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                p-0 lg:p-4 lg:pl-4 border-r border-white/10 lg:border-none shadow-2xl lg:shadow-none
            `}>
                <div className="flex-1 flex flex-col h-full lg:rounded-[32px] bg-[#0a0a0f] lg:bg-[#0a0a0f]/80 backdrop-blur-2xl lg:border border-white/5 overflow-hidden ring-1 ring-white/5">
                    {/* Header */}
                    <div className="p-5 lg:p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative pt-safe-top">
                         <div className="flex justify-between items-center lg:hidden mb-4">
                            <h2 className="text-lg font-bold text-white">Меню</h2>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-lg text-white"><X size={20} /></button>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex gap-2">
                                <button onClick={onHome} className="p-3 lg:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group" title="На главную" aria-label="На главную">
                                    <Home size={18} />
                                </button>
                                <button onClick={onBack} className="p-3 lg:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group" title="Назад" aria-label="Назад">
                                    <ChevronLeft size={18} />
                                </button>
                            </div>
                            <div className="h-8 w-px bg-white/10 hidden lg:block"></div>
                            
                            <div className="hidden lg:flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20 text-white">
                                    <Calculator size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Калькулятор</p>
                                </div>
                            </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                            <button 
                                onClick={() => { setMode('check'); setIsMobileMenuOpen(false); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'check' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Table2 size={14} /> Таблица
                            </button>
                            <button 
                                onClick={() => { setMode('wizard'); setIsMobileMenuOpen(false); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'wizard' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Wand2 size={14} /> Подбор
                            </button>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-5 space-y-8 pb-20 lg:pb-5">
                        
                        {/* Common Input */}
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
                                                aria-label="Air Volume"
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
                                        ariaLabel="Air Volume Slider"
                                    />
                                </div>
                                
                                {mode === 'check' && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Мин. Скорость</div>
                                            <div className="flex items-center gap-1">
                                                <input 
                                                    type="number" 
                                                    value={minSpeed} 
                                                    onChange={(e) => setMinSpeed(Number(e.target.value))} 
                                                    className="bg-transparent w-full text-sm font-bold font-mono text-white outline-none"
                                                    aria-label="Minimum Speed"
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
                                                    aria-label="Maximum Speed"
                                                />
                                                <span className="text-[10px] text-slate-600">м/с</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {mode === 'wizard' && (
                                     <div className="pt-2">
                                         <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Лимит скорости</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-bold font-mono text-white">{maxSpeed}</span>
                                                <span className="text-[10px] font-bold text-slate-500">м/с</span>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={maxSpeed} min={1} max={15} step={0.5} 
                                            onChange={setMaxSpeed} 
                                            gradient="from-teal-500 to-emerald-400"
                                            icon={<Wind size={14}/>}
                                            label=""
                                            ariaLabel="Speed Limit Slider"
                                        />
                                        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="flex items-center gap-2 mb-1 text-emerald-400">
                                                <Wand2 size={14} />
                                                <span className="text-[10px] font-bold uppercase">Автоподбор</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                                Система подберет сечения, в которых скорость не превышает {maxSpeed} м/с.
                                            </p>
                                        </div>
                                     </div>
                                )}
                            </div>
                        </div>

                        {/* Circular List for Check Mode Only */}
                        {mode === 'check' && (
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
                        )}

                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden p-0 lg:p-4 lg:pl-0">
                <div className="flex-1 lg:rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border border-white/5 ring-1 ring-white/5 group flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none"></div>

                    {/* Header */}
                    <div className="p-6 pt-safe-top lg:pt-8 pb-4 flex items-center justify-between relative z-10 bg-[#030304]/80 backdrop-blur-md lg:bg-transparent">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 rounded-full bg-blue-600 text-white shadow-lg active:scale-95 transition-transform"><Menu size={20} /></button>
                            <div>
                                <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    {mode === 'check' ? <Grid className="text-emerald-500" size={24} /> : <Wand2 className="text-teal-500" size={24} />}
                                    <span className="truncate">{mode === 'check' ? 'Прямоугольные' : 'Результаты'}</span>
                                </h2>
                                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider hidden sm:block">
                                    {mode === 'check' ? 'Таблица скоростей (м/с)' : `Подходящие сечения (V ≤ ${maxSpeed} м/с)`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    {mode === 'check' ? (
                        // EXISTING CHECK MODE (MATRIX)
                        <div className="flex-1 overflow-auto custom-scrollbar p-0 lg:p-6 lg:pt-0 relative z-10">
                            <div className="inline-block min-w-full align-middle">
                                <div className="border-t lg:border border-white/10 lg:rounded-2xl overflow-hidden bg-black/40 backdrop-blur-sm shadow-2xl">
                                    <table className="min-w-full divide-y divide-white/5 border-collapse">
                                        <thead className="bg-[#0a0a0f] sticky top-0 z-20 shadow-lg">
                                            <tr>
                                                <th scope="col" className="sticky left-0 z-30 bg-[#0a0a0f] p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)] min-w-[100px]">
                                                    A x B (мм)
                                                </th>
                                                {rectSizes.map(w => (
                                                    <th key={w} scope="col" className="p-2 text-center text-[10px] font-bold text-slate-400 font-mono border-l border-white/5 min-w-[50px] bg-[#0a0a0f]">
                                                        {w}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-[#050508]">
                                            {rectSizes.map(h => (
                                                <tr key={h} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="sticky left-0 z-10 bg-[#0a0a0f] p-3 text-[11px] font-bold text-slate-400 font-mono border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)] group-hover:text-white transition-colors">
                                                        {h}
                                                    </td>
                                                    {rectSizes.map(w => {
                                                        const area = (w / 1000) * (h / 1000);
                                                        const speed = calculateSpeed(area);
                                                        
                                                        const isOptimal = speed >= minSpeed && speed <= maxSpeed;
                                                        const isHigh = speed > maxSpeed;
                                                        const isLow = speed < minSpeed;

                                                        return (
                                                            <td key={`${h}x${w}`} className="p-1 text-center border-l border-white/5 border-b border-white/5">
                                                                <div className={`
                                                                    w-full h-8 flex items-center justify-center text-xs font-mono transition-all duration-300 rounded
                                                                    ${isOptimal ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : ''}
                                                                    ${isHigh ? 'text-amber-700/70' : ''}
                                                                    ${isLow ? 'text-slate-800' : ''}
                                                                `}>
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
                    ) : (
                        // NEW WIZARD MODE (LIST)
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 lg:pt-0 relative z-10 space-y-8 animate-in slide-in-from-right-8 duration-500">
                             
                             {/* Circular Section */}
                             <div>
                                <SectionHeader icon={<CircleDot size={16}/>} title="Круглые воздуховоды" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
                                    {suggestions.round.length > 0 ? suggestions.round.map((item, i) => (
                                        <div key={item.d} className={`relative p-4 rounded-2xl border transition-all hover:scale-[1.02] ${i === 0 ? 'bg-teal-500/20 border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                            {i === 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-lg">Optimal</div>}
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-xl font-bold text-white">Ø{item.d}</span>
                                                <CheckCircle2 size={16} className={i === 0 ? "text-teal-400" : "text-slate-600"} />
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase">Скорость</div>
                                                <div className={`font-mono text-lg font-bold ${i === 0 ? 'text-teal-300' : 'text-slate-300'}`}>{item.v.toFixed(2)} <span className="text-[10px]">м/с</span></div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="col-span-full py-8 text-center text-slate-500 text-sm italic">Нет подходящих круглых сечений</div>
                                    )}
                                </div>
                             </div>

                             {/* Rectangular Section */}
                             <div>
                                <SectionHeader icon={<Grid size={16}/>} title="Прямоугольные (Топ 50)" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4 pb-24 lg:pb-10">
                                    {suggestions.rect.length > 0 ? suggestions.rect.map((item, i) => (
                                        <div key={`${item.w}x${item.h}`} className={`relative p-4 rounded-2xl border transition-all hover:scale-[1.02] ${i === 0 ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                             {i === 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-lg">Optimal</div>}
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-lg font-bold text-white">{item.w}×{item.h}</span>
                                                <ArrowRight size={14} className="text-slate-600" />
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase">Скорость</div>
                                                <div className={`font-mono text-lg font-bold ${i === 0 ? 'text-emerald-300' : 'text-slate-300'}`}>{item.v.toFixed(2)} <span className="text-[10px]">м/с</span></div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="col-span-full py-8 text-center text-slate-500 text-sm italic">Нет подходящих прямоугольных сечений</div>
                                    )}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VelocityCalculator;