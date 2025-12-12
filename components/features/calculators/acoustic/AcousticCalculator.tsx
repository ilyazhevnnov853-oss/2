import React, { useState, useEffect } from 'react';
import { Volume2, Plus, Trash2, Home, ChevronLeft, Menu, X, Activity, Waves } from 'lucide-react';
import { SectionHeader, GlassSlider, GlassButton } from '../../../ui/Shared';

const AcousticCalculator = ({ onBack, onHome }: any) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Initial state: 2 sources of 35dB
    const [sources, setSources] = useState<number[]>([35, 35]); 
    const [totalNoise, setTotalNoise] = useState(0);

    useEffect(() => {
        if (sources.length === 0) {
            setTotalNoise(0);
            return;
        }
        // Formula: L_sum = 10 * log10( sum( 10^(0.1 * Li) ) )
        const sumPower = sources.reduce((acc, val) => acc + Math.pow(10, 0.1 * val), 0);
        const result = 10 * Math.log10(sumPower);
        setTotalNoise(result);
    }, [sources]);

    const addSource = () => {
        if (sources.length < 10) {
             setSources([...sources, 30]);
        }
    };

    const removeSource = (index: number) => {
        const newSources = [...sources];
        newSources.splice(index, 1);
        setSources(newSources);
    };

    const updateSource = (index: number, value: number) => {
        const newSources = [...sources];
        newSources[index] = value;
        setSources(newSources);
    };

    const themeColor = 'rose';
    const gradient = 'from-rose-500 to-pink-600';
    const textColor = 'text-rose-400';

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-rose-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse bg-rose-600/20`} style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none"></div>

            {/* LEFT PANEL (Controls) */}
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
                            
                            <div className={`flex items-center gap-3`}>
                                <div className={`p-2 rounded-xl bg-gradient-to-tr ${gradient} shadow-lg shadow-rose-500/20 text-white`}>
                                    <Volume2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className={`text-[9px] font-bold ${textColor} uppercase tracking-widest mt-0.5`}>Калькулятор</p>
                                </div>
                            </div>
                        </div>

                         <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                            <p className="text-[10px] text-rose-200 font-medium leading-relaxed">
                                Расчет суммарного уровня шума от нескольких независимых источников по логарифмической шкале.
                            </p>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                        <div className="flex justify-between items-center">
                             <SectionHeader icon={<Waves size={14}/>} title="Источники шума" />
                             <button 
                                onClick={addSource} 
                                disabled={sources.length >= 10}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                             >
                                <Plus size={16} />
                             </button>
                        </div>
                        
                        <div className="space-y-4">
                            {sources.map((val, idx) => (
                                <div key={idx} className="bg-black/20 p-4 rounded-2xl border border-white/5 animate-in slide-in-from-left-4 fade-in duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Источник #{idx + 1}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-bold font-mono text-white">{val}</span>
                                                <span className="text-[10px] font-bold text-slate-500">дБ</span>
                                            </div>
                                            {sources.length > 1 && (
                                                <button onClick={() => removeSource(idx)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={val} min={0} max={120} step={1} 
                                        onChange={(v: number) => updateSource(idx, v)} 
                                        gradient="from-rose-600 to-pink-500"
                                        icon={<Volume2 size={14}/>}
                                        label=""
                                    />
                                </div>
                            ))}
                        </div>
                        
                        {sources.length === 0 && (
                            <div className="text-center py-10 text-slate-500 text-xs">
                                Нет источников. Добавьте первый.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT (Visualization) */}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden p-4 pl-0">
                <div className="flex-1 rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border border-white/5 ring-1 ring-white/5 group flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className={`absolute inset-0 bg-gradient-to-b from-rose-900/10 to-transparent pointer-events-none transition-colors duration-700`}></div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className={`lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-rose-600 text-white shadow-lg`}>
                        <Menu size={20} />
                    </button>

                    {/* Main Display */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                        
                        {/* Glow Effect */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] animate-pulse`}></div>
                        
                        {/* Animated Ring Visualization */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                            <div className="w-[300px] h-[300px] border border-rose-500/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                            <div className="w-[200px] h-[200px] border border-rose-500/20 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] animation-delay-1000"></div>
                        </div>

                        <div className="text-center space-y-2 mb-12 relative z-10">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Общий уровень шума</span>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className={`text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-rose-200 tracking-tighter drop-shadow-2xl`}>
                                    {totalNoise.toFixed(1)}
                                </span>
                                <span className={`text-2xl font-black ${textColor} uppercase`}>дБ</span>
                            </div>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                             {/* Source Count */}
                             <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                                        <Waves size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Источники</div>
                                        <div className="text-sm text-slate-400">Количество</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{sources.length} <span className="text-sm text-slate-500">шт</span></div>
                                </div>
                            </div>

                            {/* Loudest Source */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-pink-500/20 text-pink-400">
                                        <Activity size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Максимум</div>
                                        <div className="text-sm text-slate-400">Самый шумный</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{Math.max(0, ...sources).toFixed(0)} <span className="text-sm text-slate-500">дБ</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcousticCalculator;