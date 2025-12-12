import React, { useState, useEffect } from 'react';
import { Calculator, Thermometer, Wind, Zap, Droplets, Home, ChevronLeft, Menu, X, ArrowRight, Flame, Snowflake } from 'lucide-react';
import { SectionHeader, GlassSlider, GlassButton, GlassMetric } from '../../../ui/Shared';

const HeaterCalculator = ({ onBack, onHome }: any) => {
    const [airflow, setAirflow] = useState<number>(1000);
    const [tempIn, setTempIn] = useState<number>(-26);
    const [tempOut, setTempOut] = useState<number>(22);
    const [mode, setMode] = useState<'heating' | 'cooling'>('heating');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Constants
    const AIR_DENSITY = 1.2; // kg/m3
    const AIR_HEAT_CAPACITY = 1.006; // kJ/(kg*C)
    const CONSTANT_FACTOR = 0.278; // 1000 / 3600 (conversion factor) * density * heat_capacity approx 0.336 but let's use accurate formula

    // Calculation Results
    const [powerKW, setPowerKW] = useState(0);
    const [waterFlow, setWaterFlow] = useState(0);
    const [electricCurrent, setElectricCurrent] = useState(0);

    useEffect(() => {
        // Q (W) = L (m3/h) * rho (kg/m3) * c (kJ/kgC) * dt (C) * (1000/3600)
        // Simplified Q (kW) = L * dt * 0.336 / 1000 approx
        
        const dt = Math.abs(tempOut - tempIn);
        
        // Exact formula: Power (kW) = Airflow (m3/h) * Density (1.2) * Specific Heat (1.006) * DeltaT / 3600
        const pKW = (airflow * AIR_DENSITY * AIR_HEAT_CAPACITY * dt) / 3600;
        
        setPowerKW(pKW);

        // Water Flow Estimation (assuming dt water = 20C for heating, 5C for cooling)
        // Q (kW) = G_water (kg/s) * C_water (4.187) * dt_water
        // G_water (kg/h) = Q(kW) * 3600 / (4.187 * dt_water)
        const dtWater = mode === 'heating' ? 20 : 5; // Standard engineering deltas
        const wFlow = (pKW * 3600) / (4.187 * dtWater);
        setWaterFlow(wFlow);

        // Electric Current Estimation (3-phase 400V, cos phi = 1)
        // I = P (W) / (sqrt(3) * 400 * 1)
        const amps = (pKW * 1000) / (1.732 * 400);
        setElectricCurrent(amps);

    }, [airflow, tempIn, tempOut, mode]);

    // Theme Colors
    const themeColor = mode === 'heating' ? 'orange' : 'cyan';
    const gradient = mode === 'heating' ? 'from-orange-500 to-red-600' : 'from-cyan-400 to-blue-600';
    const textColor = mode === 'heating' ? 'text-orange-400' : 'text-cyan-400';

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-orange-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse bg-${themeColor}-600/20`} style={{animationDuration: '8s'}} />
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
                                <div className={`p-2 rounded-xl bg-gradient-to-tr ${gradient} shadow-lg shadow-${themeColor}-500/20 text-white`}>
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className={`text-[9px] font-bold ${textColor} uppercase tracking-widest mt-0.5`}>Калькулятор</p>
                                </div>
                            </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                            <button 
                                onClick={() => setMode('heating')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'heating' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Flame size={14} /> Нагрев
                            </button>
                            <button 
                                onClick={() => setMode('cooling')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'cooling' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Snowflake size={14} /> Охлаждение
                            </button>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        <div className="space-y-6">
                            <SectionHeader icon={<Wind size={14}/>} title="Параметры воздуха" />
                            
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                {/* Airflow Input */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Расход воздуха</span>
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number" 
                                                value={airflow} 
                                                onChange={(e) => setAirflow(Math.max(0, Number(e.target.value)))} 
                                                className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500">м³/ч</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={airflow} min={0} max={10000} step={50} 
                                        onChange={setAirflow} 
                                        gradient={mode === 'heating' ? "from-orange-600 via-red-500 to-amber-400" : "from-blue-600 via-cyan-500 to-teal-400"}
                                        icon={<Wind size={14}/>}
                                        label=""
                                    />
                                </div>
                            </div>

                            <SectionHeader icon={<Thermometer size={14}/>} title="Температуры" />
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                
                                {/* Temp In */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Вход (Улица)</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold font-mono text-white">{tempIn}</span>
                                            <span className="text-[10px] font-bold text-slate-500">°C</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={tempIn} min={-40} max={40} step={1} 
                                        onChange={setTempIn} 
                                        color="temp"
                                        icon={<ArrowRight size={14} className="rotate-180"/>}
                                        label=""
                                    />
                                </div>

                                {/* Temp Out */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Выход (Канал)</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold font-mono text-white">{tempOut}</span>
                                            <span className="text-[10px] font-bold text-slate-500">°C</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={tempOut} min={5} max={50} step={1} 
                                        onChange={setTempOut} 
                                        color="temp"
                                        icon={<ArrowRight size={14}/>}
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
                    <div className={`absolute inset-0 bg-gradient-to-b from-${themeColor}-900/10 to-transparent pointer-events-none transition-colors duration-700`}></div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className={`lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-${themeColor}-600 text-white shadow-lg`}>
                        <Menu size={20} />
                    </button>

                    {/* Main Display */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                        
                        {/* Glow Effect */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-${themeColor}-500/10 rounded-full blur-[100px] animate-pulse`}></div>

                        <div className="text-center space-y-2 mb-12">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Расчетная мощность</span>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className={`text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b ${mode === 'heating' ? 'from-white to-orange-200' : 'from-white to-cyan-200'} tracking-tighter drop-shadow-2xl`}>
                                    {powerKW.toFixed(2)}
                                </span>
                                <span className={`text-2xl font-black ${textColor} uppercase`}>кВт</span>
                            </div>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                             {/* Delta T */}
                             <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white/5 text-slate-300">
                                        <Thermometer size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Перепад (ΔT)</div>
                                        <div className="text-sm text-slate-400">Нагрев воздуха</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{Math.abs(tempOut - tempIn).toFixed(0)} <span className="text-sm text-slate-500">°C</span></div>
                                </div>
                            </div>

                            {/* Water Flow */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                                        <Droplets size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Расход воды</div>
                                        <div className="text-sm text-slate-400">
                                            При Δt {mode === 'heating' ? '20' : '5'}°C
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{waterFlow.toFixed(0)} <span className="text-sm text-slate-500">л/ч</span></div>
                                </div>
                            </div>

                            {/* Electric Current */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                                        <Zap size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ток (I)</div>
                                        <div className="text-sm text-slate-400">380В / 3 фазы</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{electricCurrent.toFixed(1)} <span className="text-sm text-slate-500">А</span></div>
                                </div>
                            </div>
                            
                            {/* Air Mass Flow */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-slate-500/20 text-slate-300">
                                        <Wind size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Массовый расход</div>
                                        <div className="text-sm text-slate-400">Плотность 1.2</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{(airflow * 1.2).toFixed(0)} <span className="text-sm text-slate-500">кг/ч</span></div>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    {/* Legend Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                         <div>Формула: Q = L · ρ · c · ΔT</div>
                         <div>p = 1.2 кг/м³ · c = 1.006 кДж/кг°C</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeaterCalculator;