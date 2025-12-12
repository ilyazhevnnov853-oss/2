import React, { useState, useEffect } from 'react';
import { Gauge, Wind, Ruler, Settings2, Home, ChevronLeft, Menu, X, Activity, Box, CircleDot } from 'lucide-react';
import { SectionHeader, GlassSlider } from '../../../ui/Shared';

const PressureLossCalculator = ({ onBack, onHome }: any) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Inputs
    const [airflow, setAirflow] = useState(1000);
    const [shape, setShape] = useState<'round' | 'rect'>('round');
    
    // Dimensions
    const [diameter, setDiameter] = useState(200);
    const [width, setWidth] = useState(300);
    const [height, setHeight] = useState(200);
    
    // Network Params
    const [length, setLength] = useState(20);
    const [zeta, setZeta] = useState(2); // Local resistance sum
    const [roughness] = useState(0.1); // mm (galvanized steel default)

    // Results
    const [totalLoss, setTotalLoss] = useState(0);
    const [frictionLoss, setFrictionLoss] = useState(0);
    const [localLoss, setLocalLoss] = useState(0);
    const [velocity, setVelocity] = useState(0);

    useEffect(() => {
        // Physics constants
        const rho = 1.2; // kg/m3 (Air density)
        const nu = 15.11e-6; // m2/s (Kinematic viscosity)
        
        // Geometry Calculation
        let d_calc = 0; // meters (hydraulic diameter)
        let area = 0; // m2

        if (shape === 'round') {
            d_calc = diameter / 1000;
            area = Math.PI * Math.pow(d_calc, 2) / 4;
        } else {
            const a = width / 1000;
            const b = height / 1000;
            area = a * b;
            // Hydraulic diameter Dh = 4A/P = 2ab/(a+b)
            d_calc = (2 * a * b) / (a + b);
        }

        if (area <= 0 || d_calc <= 0) {
            setTotalLoss(0); setFrictionLoss(0); setLocalLoss(0); setVelocity(0);
            return;
        }

        // Velocity (m/s)
        const v = airflow / 3600 / area;
        setVelocity(v);

        // Reynolds Number
        const Re = (v * d_calc) / nu;

        // Friction Factor (Lambda) - Altshul approximation
        // lambda = 0.11 * (k/d + 68/Re)^0.25
        const k = roughness / 1000; // to meters
        let lambda = 0.02; 
        if (Re > 0) {
            lambda = 0.11 * Math.pow((k/d_calc) + (68/Re), 0.25);
        }

        // Dynamic Pressure (Pa)
        const dynPress = (rho * Math.pow(v, 2)) / 2;

        // Pressure Drop Friction (Darcy-Weisbach)
        // dP = lambda * (L/d) * Pd
        const dP_f = lambda * (length / d_calc) * dynPress;
        
        // Pressure Drop Local
        // dP = zeta * Pd
        const dP_l = zeta * dynPress;

        setFrictionLoss(dP_f);
        setLocalLoss(dP_l);
        setTotalLoss(dP_f + dP_l);

    }, [airflow, shape, diameter, width, height, length, zeta, roughness]);

    const themeColor = 'purple';
    const gradient = 'from-purple-500 to-indigo-600';
    const textColor = 'text-purple-400';

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-purple-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse bg-purple-600/20`} style={{animationDuration: '8s'}} />
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
                                <div className={`p-2 rounded-xl bg-gradient-to-tr ${gradient} shadow-lg shadow-purple-500/20 text-white`}>
                                    <Gauge size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className={`text-[9px] font-bold ${textColor} uppercase tracking-widest mt-0.5`}>Калькулятор</p>
                                </div>
                            </div>
                        </div>

                        {/* Shape Switcher */}
                        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                            <button 
                                onClick={() => setShape('round')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${shape === 'round' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <CircleDot size={14} /> Круглый
                            </button>
                            <button 
                                onClick={() => setShape('rect')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${shape === 'rect' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Box size={14} /> Прямоуг.
                            </button>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        <div className="space-y-6">
                            <SectionHeader icon={<Settings2 size={14}/>} title="Входные данные" />
                            
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                {/* Airflow Input */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Расход (L)</span>
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
                                        gradient="from-purple-600 to-indigo-500"
                                        icon={<Wind size={14}/>}
                                        label=""
                                    />
                                </div>

                                {/* Geometry Inputs */}
                                {shape === 'round' ? (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Диаметр (D)</span>
                                            <div className="flex items-baseline gap-1">
                                                <input 
                                                    type="number" 
                                                    value={diameter} 
                                                    onChange={(e) => setDiameter(Math.max(10, Number(e.target.value)))} 
                                                    className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                                />
                                                <span className="text-[10px] font-bold text-slate-500">мм</span>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={diameter} min={100} max={1250} step={5} 
                                            onChange={setDiameter} 
                                            gradient="from-indigo-500 to-purple-500"
                                            icon={<CircleDot size={14}/>}
                                            label=""
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ширина (A)</span>
                                            </div>
                                            <GlassSlider 
                                                val={width} min={100} max={2000} step={50} 
                                                onChange={setWidth} unit=" мм"
                                                gradient="from-indigo-500 to-blue-500"
                                                icon={<Ruler size={14}/>}
                                                label=""
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Высота (B)</span>
                                            </div>
                                            <GlassSlider 
                                                val={height} min={100} max={2000} step={50} 
                                                onChange={setHeight} unit=" мм"
                                                gradient="from-indigo-500 to-blue-500"
                                                icon={<Ruler size={14} className="rotate-90"/>}
                                                label=""
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <SectionHeader icon={<Activity size={14}/>} title="Параметры сети" />
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                {/* Length Input */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Длина (L)</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold font-mono text-white">{length}</span>
                                            <span className="text-[10px] font-bold text-slate-500">м</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={length} min={1} max={200} step={1} 
                                        onChange={setLength} 
                                        gradient="from-blue-500 to-indigo-500"
                                        icon={<Ruler size={14}/>}
                                        label=""
                                    />
                                </div>

                                {/* Local Resistance Input */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">КМС (Σζ)</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold font-mono text-white">{zeta.toFixed(1)}</span>
                                            <span className="text-[10px] font-bold text-slate-500">ед.</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={zeta} min={0} max={20} step={0.1} 
                                        onChange={setZeta} 
                                        gradient="from-purple-500 to-pink-500"
                                        icon={<Activity size={14}/>}
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
                    <div className={`absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none transition-colors duration-700`}></div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className={`lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-purple-600 text-white shadow-lg`}>
                        <Menu size={20} />
                    </button>

                    {/* Main Display */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                        
                        {/* Glow Effect */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse`}></div>

                        <div className="text-center space-y-2 mb-12">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Полные потери</span>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className={`text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-200 tracking-tighter drop-shadow-2xl`}>
                                    {totalLoss.toFixed(0)}
                                </span>
                                <span className={`text-2xl font-black ${textColor} uppercase`}>Па</span>
                            </div>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                             {/* Friction Loss */}
                             <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                                        <Wind size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">На трение</div>
                                        <div className="text-sm text-slate-400">По длине {length}м</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{frictionLoss.toFixed(0)} <span className="text-sm text-slate-500">Па</span></div>
                                    <div className="text-[10px] text-slate-500">{(frictionLoss/length).toFixed(1)} Па/м</div>
                                </div>
                            </div>

                            {/* Local Loss */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-pink-500/20 text-pink-400">
                                        <Activity size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Местные</div>
                                        <div className="text-sm text-slate-400">КМС = {zeta}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{localLoss.toFixed(0)} <span className="text-sm text-slate-500">Па</span></div>
                                </div>
                            </div>

                            {/* Velocity */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                                        <Wind size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Скорость</div>
                                        <div className="text-sm text-slate-400">Потока</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{velocity.toFixed(1)} <span className="text-sm text-slate-500">м/с</span></div>
                                </div>
                            </div>
                            
                            {/* Dynamic Pressure */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                                        <Gauge size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Дин. Напор</div>
                                        <div className="text-sm text-slate-400">Pd</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{((1.2 * velocity * velocity)/2).toFixed(0)} <span className="text-sm text-slate-500">Па</span></div>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    {/* Legend Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                         <div>Формула: ΔP = (λ·L/d + Σζ) · (ρ·v²/2)</div>
                         <div>Altshul Approximation</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PressureLossCalculator;