import React, { useState, useEffect } from 'react';
import { CloudRain, Thermometer, Droplets, Home, ChevronLeft, Menu, X, Gauge, Activity, Waves } from 'lucide-react';
import { SectionHeader, GlassSlider } from '../../../ui/Shared';

const PsychrometryCalculator = ({ onBack, onHome }: any) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Inputs
    const [dryBulb, setDryBulb] = useState(24); // °C
    const [relHum, setRelHum] = useState(50); // %
    const [pressure, setPressure] = useState(101.325); // kPa

    // Results
    const [enthalpy, setEnthalpy] = useState(0);
    const [moistureContent, setMoistureContent] = useState(0);
    const [dewPoint, setDewPoint] = useState(0);
    const [density, setDensity] = useState(0);
    const [wetBulb, setWetBulb] = useState(0);
    const [vaporPressure, setVaporPressure] = useState(0);

    useEffect(() => {
        // --- CONSTANTS ---
        // Magnus formula constants for saturation vapor pressure over water (-45 to +60 C)
        const A = 17.625;
        const B = 243.04;

        // 1. Saturation Vapor Pressure (Es) in hPa
        // Es = 6.1094 * exp( (A * T) / (B + T) )
        const es_hPa = 6.1094 * Math.exp((A * dryBulb) / (B + dryBulb));
        
        // 2. Partial Vapor Pressure (Pv) in kPa
        // Pv = Es * (RH / 100) / 10 (convert hPa to kPa)
        const pv_kPa = (es_hPa * (relHum / 100)) / 10;
        setVaporPressure(pv_kPa);

        // 3. Moisture Content (d or x) in g/kg
        // d = 622 * Pv / (P_atm - Pv)
        // Ensure P > Pv to avoid division by zero or negative
        const safePv = Math.min(pv_kPa, pressure - 0.1);
        const d = 622 * safePv / (pressure - safePv);
        setMoistureContent(d);

        // 4. Enthalpy (h) in kJ/kg
        // h = 1.006*T + (d/1000) * (2501 + 1.86*T)
        // Cp_air = 1.006, LatentHeat = 2501, Cp_vapor = 1.86
        const h = 1.006 * dryBulb + (d / 1000) * (2501 + 1.86 * dryBulb);
        setEnthalpy(h);

        // 5. Dew Point (T_dp) in °C
        // Alpha = ln(RH/100) + (A*T)/(B+T)
        // T_dp = (B * Alpha) / (A - Alpha)
        // Avoid log(0)
        const safeRH = Math.max(relHum, 0.1);
        const alpha = Math.log(safeRH / 100) + ((A * dryBulb) / (B + dryBulb));
        const t_dp = (B * alpha) / (A - alpha);
        setDewPoint(t_dp);

        // 6. Density (rho) in kg/m³
        // rho = P_atm_Pa / (R_moist * T_kelvin)
        // rho = (P - Pv)*1000 / (R_dry * Tk) + (Pv * 1000) / (R_vapor * Tk)
        // R_dry = 287.05, R_vapor = 461.5
        const Tk = dryBulb + 273.15;
        const rho = ((pressure - safePv) * 1000) / (287.05 * Tk) + (safePv * 1000) / (461.5 * Tk);
        setDensity(rho);

        // 7. Wet Bulb (T_wb) - Stull's approximation
        // Valid for standard ranges
        const T = dryBulb;
        const RH = safeRH;
        const tw = T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) + 
                   Math.atan(T + RH) - 
                   Math.atan(RH - 1.676331) + 
                   0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 
                   4.686035;
        setWetBulb(tw);

    }, [dryBulb, relHum, pressure]);

    const themeColor = 'sky';
    const gradient = 'from-sky-500 to-indigo-500';
    const textColor = 'text-sky-400';

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-sky-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse bg-sky-600/20`} style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
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
                                <div className={`p-2 rounded-xl bg-gradient-to-tr ${gradient} shadow-lg shadow-sky-500/20 text-white`}>
                                    <CloudRain size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className={`text-[9px] font-bold ${textColor} uppercase tracking-widest mt-0.5`}>Калькулятор</p>
                                </div>
                            </div>
                        </div>

                         <div className="p-4 bg-sky-500/10 rounded-xl border border-sky-500/20">
                            <p className="text-[10px] text-sky-200 font-medium leading-relaxed">
                                Расчет параметров влажного воздуха по ID-диаграмме: энтальпия, влагосодержание, точка росы и др.
                            </p>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        <div className="space-y-6">
                            <SectionHeader icon={<Thermometer size={14}/>} title="Параметры воздуха" />
                            
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                {/* Dry Bulb Temp */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Температура (t)</span>
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number" 
                                                value={dryBulb} 
                                                onChange={(e) => setDryBulb(Number(e.target.value))} 
                                                className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500">°C</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={dryBulb} min={-40} max={60} step={1} 
                                        onChange={setDryBulb} 
                                        color="temp"
                                        icon={<Thermometer size={14}/>}
                                        label=""
                                    />
                                </div>

                                {/* Relative Humidity */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Влажность (φ)</span>
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number" 
                                                value={relHum} 
                                                onChange={(e) => setRelHum(Math.min(100, Math.max(0, Number(e.target.value))))} 
                                                className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={relHum} min={0} max={100} step={1} 
                                        onChange={setRelHum} 
                                        gradient="from-sky-500 to-blue-500"
                                        icon={<Droplets size={14}/>}
                                        label=""
                                    />
                                </div>

                                {/* Pressure */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Давление (P)</span>
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number" 
                                                value={pressure} 
                                                onChange={(e) => setPressure(Math.max(1, Number(e.target.value)))} 
                                                className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500">кПа</span>
                                        </div>
                                    </div>
                                    <GlassSlider 
                                        val={pressure} min={80} max={120} step={0.1} 
                                        onChange={setPressure} 
                                        gradient="from-indigo-500 to-violet-500"
                                        icon={<Gauge size={14}/>}
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
                    <div className={`absolute inset-0 bg-gradient-to-b from-sky-900/10 to-transparent pointer-events-none transition-colors duration-700`}></div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className={`lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-sky-600 text-white shadow-lg`}>
                        <Menu size={20} />
                    </button>

                    {/* Main Display */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                        
                        {/* Glow Effect */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] animate-pulse`}></div>
                        
                        <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center justify-center mb-12 w-full">
                            {/* Enthalpy Main */}
                            <div className="text-center space-y-2 relative z-10">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Энтальпия (I)</span>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className={`text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-sky-200 tracking-tighter drop-shadow-2xl`}>
                                        {enthalpy.toFixed(1)}
                                    </span>
                                    <span className={`text-xl font-black ${textColor} uppercase`}>кДж/кг</span>
                                </div>
                            </div>

                             {/* Moisture Content Main */}
                             <div className="text-center space-y-2 relative z-10">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Влагосодерж. (d)</span>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className={`text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-200 tracking-tighter drop-shadow-2xl`}>
                                        {moistureContent.toFixed(1)}
                                    </span>
                                    <span className={`text-xl font-black text-indigo-400 uppercase`}>г/кг</span>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl relative z-10">
                             {/* Dew Point */}
                             <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400">
                                        <Droplets size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Точка росы</div>
                                        <div className="text-sm text-slate-400">Конденсация</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{dewPoint.toFixed(1)} <span className="text-sm text-slate-500">°C</span></div>
                                </div>
                            </div>

                            {/* Wet Bulb */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                                        <Thermometer size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Мокрый термометр</div>
                                        <div className="text-sm text-slate-400">Т мокр.</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{wetBulb.toFixed(1)} <span className="text-sm text-slate-500">°C</span></div>
                                </div>
                            </div>

                             {/* Density */}
                             <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-violet-500/20 text-violet-400">
                                        <Waves size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Плотность</div>
                                        <div className="text-sm text-slate-400">Влажного воздуха</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{density.toFixed(2)} <span className="text-sm text-slate-500">кг/м³</span></div>
                                </div>
                            </div>

                            {/* Vapor Pressure */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                                        <Gauge size={24}/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Парц. Давление</div>
                                        <div className="text-sm text-slate-400">Водяного пара</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white">{vaporPressure.toFixed(2)} <span className="text-sm text-slate-500">кПа</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PsychrometryCalculator;