import React, { useState, useMemo } from 'react';
import { 
    Home, ChevronLeft, ChevronRight, Lock, CheckCircle2, 
    Sun, Users, Wind, BarChart3, Box, Menu, X, Thermometer, Compass
} from 'lucide-react';
import { GlassButton, GlassSlider, SectionHeader } from '../../../ui/Shared';
import { SOLAR_GAINS, WALL_TRANSMISSION, INTERNAL_LOADS } from '../../../../constants';

// --- ТИПЫ ДАННЫХ ---
interface CalcData {
    // Шаг 1: Геометрия
    width: number;
    length: number;
    height: number;
    wallType: keyof typeof WALL_TRANSMISSION;
    azimuth: number; // 0-360 degrees
    
    // Шаг 2: Окна
    glassArea: number;
    isSkylight: boolean; // Replaces 'orientation' logic for Horizontal
    glassType: 'Glass_Single' | 'Glass_Double';
    
    // Шаг 3: Внутренние
    people: number;
    computers: number;
    lighting: boolean;
    
    // Шаг 4: Вентиляция (Опционально)
    ventilationOn: boolean;
    airFlow: number; // м3/ч
}

const CoolingCalculator = ({ onBack, onHome }: any) => {
    // --- STATE ---
    const [currentStep, setCurrentStep] = useState(0);
    const [maxStepReached, setMaxStepReached] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const [data, setData] = useState<CalcData>({
        width: 0, length: 0, height: 3.0, wallType: 'Modern', azimuth: 180,
        glassArea: 0, isSkylight: false, glassType: 'Glass_Double',
        people: 0, computers: 0, lighting: true,
        ventilationOn: false, airFlow: 0
    });

    // --- РАСЧЕТЫ (Reactive) ---
    const results = useMemo(() => {
        // Determine Orientation Key based on Azimuth
        let orientationKey: keyof typeof SOLAR_GAINS = 'North';
        if (data.isSkylight) {
            orientationKey = 'Horizontal';
        } else {
            const deg = data.azimuth;
            if (deg >= 45 && deg < 135) orientationKey = 'East';
            else if (deg >= 135 && deg < 225) orientationKey = 'South';
            else if (deg >= 225 && deg < 315) orientationKey = 'West';
            else orientationKey = 'North';
        }

        // 1. Теплопередача через стены (упрощенно: (Периметр * Высота - Окна) * k * dt)
        const perimeter = (data.width + data.length) * 2;
        const wallArea = Math.max(0, perimeter * data.height - data.glassArea);
        const dt = 10; // Разница температур (32°C улица - 22°C внутри)
        const q_walls = wallArea * WALL_TRANSMISSION[data.wallType] * dt;

        // 2. Солнечная радиация + Теплопередача окон
        const q_sun = data.glassArea * SOLAR_GAINS[orientationKey];
        const q_glass_trans = data.glassArea * WALL_TRANSMISSION[data.glassType] * dt;
        const q_total_windows = q_sun + q_glass_trans;

        // 3. Внутренние нагрузки
        const q_people = data.people * INTERNAL_LOADS.Person_Office;
        const q_equip = data.computers * INTERNAL_LOADS.Computer;
        const floorArea = data.width * data.length;
        const q_light = data.lighting ? floorArea * INTERNAL_LOADS.Lighting_LED : 0;
        const q_internal = q_people + q_equip + q_light;

        // 4. Вентиляция (Q = 0.33 * L * dt)
        const q_vent = data.ventilationOn ? 0.336 * data.airFlow * dt : 0;

        const totalWatts = q_walls + q_total_windows + q_internal + q_vent;
        const btu = totalWatts * 3.412;

        return { q_walls, q_total_windows, q_internal, q_vent, totalWatts, btu, floorArea, orientationKey };
    }, [data]);

    // --- HELPER: CARDINAL DIRECTION LABEL ---
    const getCardinalLabel = (deg: number) => {
        if (deg >= 45 && deg < 135) return 'Восток';
        if (deg >= 135 && deg < 225) return 'Юг';
        if (deg >= 225 && deg < 315) return 'Запад';
        return 'Север';
    };

    // --- ЛОГИКА ШАГОВ ---
    const STEPS = [
        { id: 0, title: 'Помещение', subtitle: 'Геометрия и Азимут', icon: <Box size={18}/>, isValid: data.width > 0 && data.length > 0 },
        { id: 1, title: 'Окна и Солнце', subtitle: 'Инсоляция', icon: <Sun size={18}/>, isValid: true }, 
        { id: 2, title: 'Нагрузки', subtitle: 'Люди и техника', icon: <Users size={18}/>, isValid: true },
        { id: 3, title: 'Результат', subtitle: 'Итоговый отчет', icon: <BarChart3 size={18}/>, isValid: true }
    ];

    const handleNext = () => {
        if (STEPS[currentStep].isValid) {
            const next = currentStep + 1;
            setCurrentStep(next);
            if (next > maxStepReached) setMaxStepReached(next);
        }
    };

    // --- UI КОМПОНЕНТЫ ---
    const StepIndicator = ({ step, index }: any) => {
        const isActive = currentStep === index;
        const isCompleted = index < maxStepReached || (index < currentStep);
        const isLocked = index > maxStepReached;

        return (
            <button 
                onClick={() => !isLocked && setCurrentStep(index)}
                disabled={isLocked}
                className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all border text-left relative overflow-hidden group
                    ${isActive ? 'bg-cyan-600/20 border-cyan-500/50 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 
                      isLocked ? 'bg-transparent border-transparent opacity-40 cursor-not-allowed' : 
                      'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}
                `}
            >
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-cyan-500 text-white' : isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5'}`}>
                    {isCompleted && !isActive ? <CheckCircle2 size={18}/> : isLocked ? <Lock size={18}/> : step.icon}
                </div>
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Шаг {index + 1}</div>
                    <div className="font-bold text-xs">{step.title}</div>
                </div>
                {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>}
            </button>
        );
    };

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
                                    <Thermometer size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className={`text-[9px] font-bold ${textColor} uppercase tracking-widest mt-0.5`}>Калькулятор</p>
                                </div>
                            </div>
                        </div>

                         <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                            <p className="text-[10px] text-cyan-200 font-medium leading-relaxed">
                                Расчет теплопритоков (кондиционирование) методом теплового баланса.
                            </p>
                        </div>
                    </div>

                    {/* Navigation Steps */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2">
                        {STEPS.map((step, idx) => (
                            <StepIndicator key={idx} step={step} index={idx} />
                        ))}
                    </div>

                    {/* Mini Result in Menu */}
                    <div className="p-5 border-t border-white/5 bg-black/40">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/20 to-transparent border border-white/5">
                            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Предварительный итог</div>
                            <div className="text-3xl font-black font-mono text-white">{(results.totalWatts / 1000).toFixed(2)} <span className="text-sm text-slate-500">кВт</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT (Visualization/Form) */}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden p-4 pl-0">
                <div className="flex-1 rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border border-white/5 ring-1 ring-white/5 group flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className={`absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none transition-colors duration-700`}></div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className={`lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-cyan-600 text-white shadow-lg`}>
                        <Menu size={20} />
                    </button>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 overflow-y-auto custom-scrollbar">
                        <div className="w-full max-w-3xl animate-in slide-in-from-right-8 fade-in duration-500 key={currentStep}">
                            
                            {/* STEP 1: ROOM */}
                            {currentStep === 0 && (
                                <div className="bg-[#0f1016]/80 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl">
                                    <SectionHeader icon={<Box size={20}/>} title="Геометрия помещения" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                        <div className="space-y-6">
                                            <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Площадь</label>
                                                <div className="text-5xl font-black text-white">{(data.width * data.length).toFixed(1)} <span className="text-lg text-slate-500">м²</span></div>
                                            </div>
                                            <GlassSlider label="Ширина (м)" icon={<ChevronRight className="rotate-90" size={14}/>} val={data.width} min={0} max={20} step={0.5} onChange={(v:number) => setData({...data, width: v})} unit="м"/>
                                            <GlassSlider label="Длина (м)" icon={<ChevronRight size={14}/>} val={data.length} min={0} max={30} step={0.5} onChange={(v:number) => setData({...data, length: v})} unit="м"/>
                                        </div>
                                        <div className="space-y-6">
                                            <GlassSlider label="Высота (м)" icon={<ChevronRight className="rotate-90" size={14}/>} val={data.height} min={2} max={10} step={0.1} onChange={(v:number) => setData({...data, height: v})} unit="м"/>
                                            
                                            {/* ORIENTATION SLIDER */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Азимут фасада</span>
                                                    <span className="font-bold text-cyan-400 text-sm uppercase">{getCardinalLabel(data.azimuth)}</span>
                                                </div>
                                                <GlassSlider 
                                                    label="" 
                                                    icon={<Compass size={14}/>} 
                                                    val={data.azimuth} 
                                                    min={0} max={360} step={15} 
                                                    onChange={(v:number) => setData({...data, azimuth: v})} 
                                                    unit="°"
                                                />
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Тип стен</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {Object.keys(WALL_TRANSMISSION).slice(0,3).map((type) => (
                                                        <button 
                                                            key={type}
                                                            onClick={() => setData({...data, wallType: type as any})}
                                                            className={`p-4 rounded-xl border text-left text-xs font-bold transition-all ${data.wallType === type ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            {type === 'Concrete' ? 'Бетон (Холодная)' : type === 'Brick_Old' ? 'Кирпич (Средняя)' : 'С утеплителем (Теплая)'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: WINDOWS */}
                            {currentStep === 1 && (
                                <div className="bg-[#0f1016]/80 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl">
                                     <SectionHeader icon={<Sun size={20}/>} title="Остекление и Инсоляция" />
                                     <div className="space-y-8 mt-6">
                                        <GlassSlider label="Площадь окон" icon={<Box size={14}/>} val={data.glassArea} min={0} max={Math.floor(data.width*data.length)} step={0.5} onChange={(v:number) => setData({...data, glassArea: v})} unit="м²"/>
                                        
                                        <div>
                                            <div className="bg-black/20 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-bold text-white mb-1">Мансардное окно</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Горизонтальное остекление (Крыша)</div>
                                                </div>
                                                <button onClick={() => setData({...data, isSkylight: !data.isSkylight})} className={`w-12 h-7 rounded-full transition-colors relative border border-white/10 ${data.isSkylight ? 'bg-amber-600' : 'bg-white/5'}`}>
                                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${data.isSkylight ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>

                                            <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                                                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Расчетная ориентация</span>
                                                 <span className={`font-bold text-sm ${data.isSkylight ? 'text-amber-400' : 'text-cyan-400'}`}>
                                                    {data.isSkylight ? 'ГОРИЗОНТАЛЬНО' : getCardinalLabel(data.azimuth).toUpperCase()}
                                                 </span>
                                            </div>
                                        </div>
                                     </div>
                                </div>
                            )}

                            {/* STEP 3: LOADS */}
                            {currentStep === 2 && (
                                 <div className="bg-[#0f1016]/80 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl">
                                    <SectionHeader icon={<Users size={20}/>} title="Внутренние источники" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                        <div className="space-y-6">
                                             <GlassSlider label="Количество людей" icon={<Users size={14}/>} val={data.people} min={0} max={50} step={1} onChange={(v:number) => setData({...data, people: v})} unit="чел"/>
                                             <GlassSlider label="Компьютеры / ТВ" icon={<Box size={14}/>} val={data.computers} min={0} max={50} step={1} onChange={(v:number) => setData({...data, computers: v})} unit="шт"/>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="bg-black/20 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-bold text-white mb-1">Вентиляция</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Учет приточного воздуха</div>
                                                </div>
                                                <button onClick={() => setData({...data, ventilationOn: !data.ventilationOn})} className={`w-12 h-7 rounded-full transition-colors relative border border-white/10 ${data.ventilationOn ? 'bg-cyan-600' : 'bg-white/5'}`}>
                                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${data.ventilationOn ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>
                                            {data.ventilationOn && (
                                                <div className="animate-in slide-in-from-top-2 fade-in">
                                                    <GlassSlider label="Расход притока" icon={<Wind size={14}/>} val={data.airFlow} min={0} max={1000} step={10} onChange={(v:number) => setData({...data, airFlow: v})} unit="м³/ч"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: RESULTS */}
                            {currentStep === 3 && (
                                <div className="bg-[#0f1016]/80 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl text-center">
                                    <div className="inline-flex p-4 rounded-full bg-cyan-500/20 text-cyan-400 mb-6 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Расчет завершен</h2>
                                    <p className="text-slate-400 mb-8 font-medium">Итоговая тепловая нагрузка на помещение</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 relative z-10">Мощность (СИ)</div>
                                            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 relative z-10">
                                                {(results.totalWatts / 1000).toFixed(2)} <span className="text-lg text-slate-500 font-bold uppercase">кВт</span>
                                            </div>
                                        </div>
                                        <div className="bg-black/30 p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 relative z-10">Мощность (BTU)</div>
                                            <div className="text-6xl font-black text-white relative z-10">
                                                {(results.btu / 1000).toFixed(1)} <span className="text-lg text-slate-500 font-bold uppercase">kBTU</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-3xl p-6 text-left space-y-4 border border-white/5">
                                        <ResultRow label="Стены и кровля" val={results.q_walls} total={results.totalWatts} />
                                        <ResultRow label={`Окна (${data.isSkylight ? 'Горизонт' : getCardinalLabel(data.azimuth)})`} val={results.q_total_windows} total={results.totalWatts} highlight />
                                        <ResultRow label="Люди и техника" val={results.q_internal} total={results.totalWatts} />
                                        <ResultRow label="Вентиляция" val={results.q_vent} total={results.totalWatts} />
                                    </div>
                                </div>
                            )}

                            {/* FOOTER NAVIGATION */}
                            {currentStep < 3 && (
                                <div className="mt-8 flex justify-end">
                                    <GlassButton 
                                        onClick={handleNext} 
                                        label="Далее" 
                                        icon={<ChevronRight size={18}/>} 
                                        active={STEPS[currentStep].isValid}
                                        disabled={!STEPS[currentStep].isValid}
                                        customClass={STEPS[currentStep].isValid ? "bg-cyan-600 text-white w-40 shadow-lg shadow-cyan-500/20" : "bg-white/5 text-slate-500 w-40 opacity-50 border border-white/5"}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResultRow = ({label, val, total, highlight}: any) => {
    const pct = Math.round((val / total) * 100) || 0;
    return (
        <div className="flex items-center gap-4 text-sm group">
            <div className="w-32 text-slate-400 font-bold text-xs uppercase tracking-wider">{label}</div>
            <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full rounded-full transition-all duration-1000 ${highlight ? 'bg-amber-500' : 'bg-cyan-600'}`} style={{width: `${pct}%`}}></div>
            </div>
            <div className="w-20 text-right font-mono font-bold text-white">{(val).toFixed(0)} <span className="text-[10px] text-slate-500">Вт</span></div>
            <div className="w-10 text-right text-xs font-bold text-slate-500">{pct}%</div>
        </div>
    );
};

export default CoolingCalculator;