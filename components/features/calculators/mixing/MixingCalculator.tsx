import React, { useState, useEffect } from 'react';
import { GitMerge, Wind, Thermometer, Home, ChevronLeft, Menu, X, ArrowRight, Snowflake, Flame } from 'lucide-react';
import { SectionHeader, GlassSlider } from '../../../ui/Shared';

const MixingCalculator = ({ onBack, onHome }: any) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Stream 1 (Outdoor Air)
    const [flow1, setFlow1] = useState(1000);
    const [temp1, setTemp1] = useState(-20);

    // Stream 2 (Recirculation Air)
    const [flow2, setFlow2] = useState(3000);
    const [temp2, setTemp2] = useState(22);

    const [mixedTemp, setMixedTemp] = useState(0);
    const [totalFlow, setTotalFlow] = useState(0);

    useEffect(() => {
        const totalL = flow1 + flow2;
        if (totalL === 0) {
            setMixedTemp(0);
            setTotalFlow(0);
            return;
        }
        // Simple calorimetric mix: (L1*t1 + L2*t2) / (L1+L2)
        const tMix = (flow1 * temp1 + flow2 * temp2) / totalL;
        
        setMixedTemp(tMix);
        setTotalFlow(totalL);
    }, [flow1, temp1, flow2, temp2]);

    const themeColor = 'cyan';
    const gradient = 'from-cyan-500 to-blue-600';
    const textColor = 'text-cyan-400';

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-cyan-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse bg-cyan-600/20`} style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
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
                                <div className={`p-2 rounded-xl bg-gradient-to-tr ${gradient} shadow-lg shadow-cyan-500/20 text-white`}>
                                    <GitMerge size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className={`text-[9px] font-bold ${textColor} uppercase tracking-widest mt-0.5`}>Калькулятор</p>
                                </div>
                            </div>
                        </div>

                         <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                            <p className="text-[10px] text-cyan-200 font-medium leading-relaxed">
                                Расчет параметров смеси двух потоков воздуха (например, наружного и рециркуляционного).
                            </p>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        
                        {/* Stream 1 */}
                        <div className="space-y-6">
                            <SectionHeader icon={<Snowflake size={14}/>} title="Поток 1 (Наружный)" />
                            
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Расход (L1)</span>
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number" 
                                                value={flow1} 
                                                onChange={(e) => setFlow1(Math.max(0, Number(e.target.value)))} 
                                                className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500">м³/ч</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={flow1} min={0} max={10000} step={50} 
                                        onChange={setFlow1} 
                                        gradient="from-cyan-600 to-blue-500"
                                        icon={<Wind size={14}/>}
                                        label=""
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Температура (t1)</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold font-mono text-white">{temp1}</span>
                                            <span className="text-[10px] font-bold text-slate-500">°C</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={temp1} min={-50} max={40} step={1} 
                                        onChange={setTemp1} 
                                        color="temp"
                                        icon={<Thermometer size={14}/>}
                                        label=""
                                    />
                                </div>
                            </div>
                        </div>

                         {/* Stream 2 */}
                         <div className="space-y-6">
                            <SectionHeader icon={<Flame size={14}/>} title="Поток 2 (Рециркуляция)" />
                            
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Расход (L2)</span>
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number" 
                                                value={flow2} 
                                                onChange={(e) => setFlow2(Math.max(0, Number(e.target.value)))} 
                                                className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500">м³/ч</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={flow2} min={0} max={10000} step={50} 
                                        onChange={setFlow2} 
                                        gradient="from-orange-500 to-amber-500"
                                        icon={<Wind size={14}/>}
                                        label=""
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Температура (t2)</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold font-mono text-white">{temp2}</span>
                                            <span className="text-[10px] font-bold text-slate-500">°C</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={temp2} min={15} max={40} step={1} 
                                        onChange={setTemp2} 
                                        color="temp"
                                        icon={<Thermometer size={14}/>}
                                        label=""
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT (Visualization) */}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden p-4 pl-0">
                <div className="flex-1 rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border border-white/5 ring-1 ring-white/5 group flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className={`absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none transition-colors duration-700`}></div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className={`lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-cyan-600 text-white shadow-lg`}>
                        <Menu size={20} />
                    </button>

                    {/* Main Display */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                        
                        {/* Glow Effect */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse`}></div>
                        
                        <div className="text-center space-y-2 mb-12 relative z-10">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Температура смеси</span>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className={`text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 tracking-tighter drop-shadow-2xl`}>
                                    {mixedTemp.toFixed(1)}
                                </span>
                                <span className={`text-2xl font-black ${textColor} uppercase`}>°C</span>
                            </div>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl relative z-10">
                             {/* Total Flow */}
                             <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
                                        <Wind size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Общий расход</div>
                                        <div className="text-sm text-slate-400">L1 + L2</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{totalFlow.toFixed(0)} <span className="text-sm text-slate-500">м³/ч</span></div>
                                </div>
                            </div>

                            {/* Ratio */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                                        <GitMerge size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Пропорция</div>
                                        <div className="text-sm text-slate-400">Поток 1 / Поток 2</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">
                                        {totalFlow > 0 ? ((flow1 / totalFlow) * 100).toFixed(0) : 0}<span className="text-lg text-slate-500">%</span> / {totalFlow > 0 ? ((flow2 / totalFlow) * 100).toFixed(0) : 0}<span className="text-lg text-slate-500">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MixingCalculator;