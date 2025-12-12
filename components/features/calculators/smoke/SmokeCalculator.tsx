import React, { useState, useMemo } from 'react';
import { 
    Home, ChevronLeft, ChevronRight, Lock, CheckCircle2, 
    Flame, DoorOpen, Fan, Thermometer, Wind, Building2, AlertTriangle, ArrowUpFromLine
} from 'lucide-react';
import { GlassButton, GlassSlider, SectionHeader } from '../../../ui/Shared';
import { FIRE_LOADS } from './constants_fire';

// --- ТИПЫ ДАННЫХ ---
interface SmokeData {
    // --- SYSTEM TYPE ---
    systemType: 'Extraction' | 'Pressurization'; // ДУ или Подпор

    // ШАГ 1: ПОМЕЩЕНИЕ ОЧАГА
    roomArea: number;      // м2
    roomHeight: number;    // м
    fireLoadMass: number;  // кг (мебель, бумага...)
    material: keyof typeof FIRE_LOADS;
    
    // ШАГ 2: КОРИДОР И ДВЕРЬ
    corridorWidth: number; // м
    corridorLength: number; // м
    doorWidth: number;     // м
    doorHeight: number;    // м
    isSingleDoor: boolean; // Одинарная или двойная (влияет на коэфф сжатия)

    // ШАГ 3: СЕТЬ
    floors: number;        // Этажность
    ductLength: number;    // Длина шахты
}

const SmokeCalculator = ({ onBack, onHome }: any) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [maxStepReached, setMaxStepReached] = useState(0);
    
    const [data, setData] = useState<SmokeData>({
        systemType: 'Extraction',
        roomArea: 25, roomHeight: 3.0, fireLoadMass: 400, material: 'Office_Furniture',
        corridorWidth: 2.0, corridorLength: 15.0, doorWidth: 0.9, doorHeight: 2.1, isSingleDoor: true,
        floors: 5, ductLength: 15
    });

    // --- ЯДРО РАСЧЕТА (ВНИИПО АППРОКСИМАЦИЯ) ---
    const results = useMemo(() => {
        if (data.systemType === 'Pressurization') return null; // Заглушка для подпора

        // 1. ПАРАМЕТРЫ ПОЖАРА
        const mat = FIRE_LOADS[data.material];
        const fireLoadDensity = data.fireLoadMass / data.roomArea; // gk (кг/м2)
        
        // Температура в помещении (Trm)
        // Упрощенная зависимость от удельной пожарной нагрузки для расчета по ВНИИПО
        // Обычно Tmax = To + 224 * K^(-0.528), где K - фактор проемности.
        // Для UI используем аппроксимацию: чем больше нагрузка, тем выше T, но до предела (1100С)
        let T_room_max = 20 + 900 * (1 - Math.exp(-0.05 * fireLoadDensity));
        if (T_room_max > 1100) T_room_max = 1100;

        // 2. ВЫБРОС В КОРИДОР
        // Коэффициент смешения (насколько дым остывает, проходя через дверь и смешиваясь с воздухом)
        // Зависит от высоты двери и дымового слоя.
        // Tsm = Tr + (Troom - Tr) * alpha
        const alpha = 0.55; // Усредненный коэффициент эжекции для стандартной двери
        const T_smoke_corridor = 20 + (T_room_max - 20) * alpha;

        // Плотность дыма при Tsm
        const rho_smoke = 353 / (273 + T_smoke_corridor); // 353 = 273 * 1.29

        // 3. МАССОВЫЙ РАСХОД (Gsm, кг/с)
        // Основная формула: G = k * A_door * H_door^0.5
        // k зависит от высоты нейтральной зоны (обычно 0.5-0.6 высоты двери)
        // A_door = ширина * высота
        const A_door = data.doorWidth * data.doorHeight;
        
        // Коэффициент расхода мю (0.64 для проемов) * Коэфф дверей
        const k_flow = data.isSingleDoor ? 1.0 : 1.2; 
        
        // Gsm ~ k * B * H^1.5 * function(T)
        // Упрощенная формула МР ВНИИПО для двери:
        const G_sm = 0.05 * k_flow * A_door * Math.pow(data.doorHeight, 0.5) * Math.pow(T_room_max, 0.25); // Эмпирическая связка

        // 4. ОБЪЕМНЫЙ РАСХОД (Lsm, м3/ч)
        // Вентилятор подбирают по L, а не по G!
        // L = (G / rho) * 3600
        // Важно: нужно учитывать подсосы воздуха в шахте (Floors)
        const leakage_factor = 1 + (0.015 * data.floors); // 1.5% на этаж
        const L_sm = (G_sm / rho_smoke) * 3600 * leakage_factor;

        return { 
            T_room_max, 
            T_smoke_corridor, 
            G_sm, 
            L_sm, 
            rho_smoke,
            fireLoadDensity
        };
    }, [data]);

    // --- ШАГИ ---
    const STEPS = [
        { id: 0, title: 'Очаг пожара', icon: <Flame size={18}/>, isValid: data.roomArea > 0 && data.fireLoadMass > 0 },
        { id: 1, title: 'Эвакуация', icon: <DoorOpen size={18}/>, isValid: data.doorWidth > 0 },
        { id: 2, title: 'Результат', icon: <Fan size={18}/>, isValid: true }
    ];

    const handleNext = () => {
        if (STEPS[currentStep].isValid) {
            const next = currentStep + 1;
            setCurrentStep(next);
            if (next > maxStepReached) setMaxStepReached(next);
        }
    };

    // UI Helper for Tabs
    const SystemTab = ({ type, label, icon }: any) => (
        <button 
            onClick={() => setData({...data, systemType: type})}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border
                ${data.systemType === type 
                    ? 'bg-orange-600/20 border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]' 
                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}
            `}
        >
            {icon} {label}
        </button>
    );

    return (
        <div className="flex w-full min-h-screen bg-[#020205] text-white font-sans overflow-hidden">
             {/* BACKGROUND FIRE */}
            <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />

            {/* LEFT PANEL */}
            <div className="w-[400px] flex flex-col p-4 z-20 bg-black/80 backdrop-blur-xl border-r border-white/5 h-screen overflow-y-auto custom-scrollbar">
                <div className="mb-6">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-6">
                        <ChevronLeft size={16}/> Меню
                    </button>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-4">Противодымная<br/>защита</h1>
                    
                    {/* SYSTEM SELECTOR */}
                    <div className="flex gap-2 mb-8 bg-black/40 p-1 rounded-2xl border border-white/10">
                        <SystemTab type="Extraction" label="Дымоудаление" icon={<Wind size={14}/>} />
                        <SystemTab type="Pressurization" label="Подпор" icon={<ArrowUpFromLine size={14}/>} />
                    </div>
                </div>

                {data.systemType === 'Extraction' ? (
                    <>
                        {/* WIZARD STEPS */}
                        <div className="space-y-2 mb-8">
                            {STEPS.map((step, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => idx <= maxStepReached && setCurrentStep(idx)}
                                    disabled={idx > maxStepReached}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border text-left relative overflow-hidden
                                        ${currentStep === idx ? 'bg-orange-600/10 border-orange-500 text-white' : 
                                          idx > maxStepReached ? 'opacity-30 cursor-not-allowed border-transparent' : 
                                          'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}
                                    `}
                                >
                                    <div className={`p-2 rounded-xl ${currentStep === idx ? 'bg-orange-500 text-white' : 'bg-white/5'}`}>
                                        {step.icon}
                                    </div>
                                    <div className="font-bold text-sm">{step.title}</div>
                                    {currentStep === idx && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                                </button>
                            ))}
                        </div>

                        {/* LIVE PREVIEW */}
                        {results && (
                            <div className="mt-auto p-5 rounded-2xl bg-gradient-to-br from-orange-900/20 to-transparent border border-white/5 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 text-orange-500/10 group-hover:text-orange-500/20 transition-colors">
                                    <Fan size={80} />
                                </div>
                                <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-1 relative z-10">Расчетный расход</div>
                                <div className="text-3xl font-black font-mono relative z-10">
                                    {(results.L_sm).toFixed(0)} <span className="text-sm text-slate-400">м³/ч</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-500 relative z-10">
                                    <Thermometer size={12}/> T дыма: <span className="text-orange-300">{results.T_smoke_corridor.toFixed(0)}°C</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                        <ArrowUpFromLine size={48} className="mb-4 text-slate-500"/>
                        <p className="text-sm font-bold">Модуль подпора воздуха<br/>находится в разработке</p>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-y-auto">
                <div className="w-full max-w-4xl animate-in slide-in-from-right-8 fade-in duration-500 key={currentStep}">
                    
                    {/* --- STEP 1: ROOM & FIRE --- */}
                    {data.systemType === 'Extraction' && currentStep === 0 && (
                        <div className="bg-[#0f1016] border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                            <SectionHeader icon={<Flame size={20} className="text-orange-500"/>} title="Параметры Очага Пожара" />
                            
                            <div className="grid grid-cols-2 gap-8 mt-6 relative z-10">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Что горит?</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {Object.keys(FIRE_LOADS).slice(0, 3).map((k) => (
                                                <button 
                                                    key={k} 
                                                    onClick={() => setData({...data, material: k as any})}
                                                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${data.material === k ? 'bg-orange-600 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}
                                                >
                                                    {FIRE_LOADS[k as keyof typeof FIRE_LOADS].name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <GlassSlider label="Масса нагрузки" icon={<Building2 size={14}/>} val={data.fireLoadMass} min={100} max={5000} step={50} onChange={(v:number) => setData({...data, fireLoadMass: v})} unit=" кг" color="temp"/>
                                </div>
                                
                                <div className="space-y-6">
                                    <GlassSlider label="Площадь помещения" icon={<Home size={14}/>} val={data.roomArea} min={10} max={200} step={1} onChange={(v:number) => setData({...data, roomArea: v})} unit=" м²"/>
                                    <GlassSlider label="Высота помещения" icon={<ArrowUpFromLine size={14}/>} val={data.roomHeight} min={2.5} max={10} step={0.1} onChange={(v:number) => setData({...data, roomHeight: v})} unit=" м"/>
                                    
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Удельная пож. нагрузка</span>
                                            <span className="font-mono font-bold text-white">{results?.fireLoadDensity.toFixed(1)} кг/м²</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Макс. Температура</span>
                                            <span className="font-mono font-black text-orange-500 text-lg">{results?.T_room_max.toFixed(0)} °C</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 2: CORRIDOR --- */}
                    {data.systemType === 'Extraction' && currentStep === 1 && (
                        <div className="bg-[#0f1016] border border-white/10 rounded-[32px] p-8 shadow-2xl">
                             <SectionHeader icon={<DoorOpen size={20} className="text-blue-400"/>} title="Геометрия Выхода" />
                             
                             <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8 mt-6">
                                <div className="space-y-8">
                                    <div className="bg-black/20 p-6 rounded-3xl border border-white/5 relative">
                                        <div className="absolute -top-3 left-4 bg-[#0f1016] px-2 text-[10px] font-bold text-slate-500 uppercase">Дверь из горящего помещения</div>
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <GlassSlider label="Ширина двери" icon={<ArrowUpFromLine className="rotate-90" size={14}/>} val={data.doorWidth} min={0.6} max={2.0} step={0.1} onChange={(v:number) => setData({...data, doorWidth: v})} unit=" м"/>
                                            </div>
                                            <div className="flex-1">
                                                <GlassSlider label="Высота двери" icon={<ArrowUpFromLine size={14}/>} val={data.doorHeight} min={1.8} max={3.0} step={0.1} onChange={(v:number) => setData({...data, doorHeight: v})} unit=" м"/>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <span className="text-xs font-bold text-slate-400">Конфигурация дверей</span>
                                        <div className="flex bg-black/40 rounded-lg p-1">
                                            <button onClick={() => setData({...data, isSingleDoor: true})} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${data.isSingleDoor ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Одинарная</button>
                                            <button onClick={() => setData({...data, isSingleDoor: false})} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${!data.isSingleDoor ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Двойная</button>
                                        </div>
                                    </div>

                                    <GlassSlider label="Количество этажей (шахта)" icon={<Building2 size={14}/>} val={data.floors} min={1} max={50} step={1} onChange={(v:number) => setData({...data, floors: v})} unit=" эт"/>
                                </div>

                                {/* Visual Representation */}
                                <div className="bg-black/40 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative p-4">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-4 absolute top-4">Схема проема</div>
                                    <div className="w-32 h-48 border-2 border-orange-500/50 bg-orange-500/10 relative">
                                        <div className="absolute inset-x-0 bottom-0 bg-orange-600/20 h-full animate-pulse"></div>
                                        <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-white font-mono text-xs">{data.doorHeight}м</div>
                                        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-white font-mono text-xs">{data.doorWidth}м</div>
                                    </div>
                                    <div className="mt-8 text-center">
                                        <div className="text-xs text-slate-500">Температура дыма<br/>в коридоре</div>
                                        <div className="text-2xl font-black text-orange-400 mt-1">{results?.T_smoke_corridor.toFixed(0)} °C</div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* --- STEP 3: RESULT --- */}
                    {data.systemType === 'Extraction' && currentStep === 2 && results && (
                         <div className="bg-[#0f1016] border border-white/10 rounded-[32px] p-8 shadow-2xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_20px_#f97316]"></div>
                            
                            <div className="inline-flex p-4 rounded-full bg-orange-500/20 text-orange-400 mb-6 shadow-[0_0_40px_rgba(249,115,22,0.3)]">
                                <Fan size={48} className="animate-spin-slow" style={{animationDuration: '3s'}}/>
                            </div>
                            
                            <h2 className="text-4xl font-black text-white mb-2">Расчет системы ДУ</h2>
                            <p className="text-slate-400 mb-8 max-w-lg mx-auto">Параметры для подбора вентилятора дымоудаления (с учетом подсосов воздуха)</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <ResultBox label="Массовый расход" val={results.G_sm.toFixed(2)} unit="кг/с" />
                                <ResultBox label="Объемный расход" val={results.L_sm.toFixed(0)} unit="м³/ч" highlight />
                                <ResultBox label="Температура смеси" val={results.T_smoke_corridor.toFixed(0)} unit="°C" color="text-orange-400"/>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-6 text-left border border-white/5 flex flex-col gap-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-amber-500 shrink-0"/>
                                    <div className="text-xs text-slate-300 leading-relaxed">
                                        <strong className="text-white block mb-1">Рекомендации по вентилятору:</strong>
                                        Выбирайте вентилятор исполнения <b>ДУ ({results.T_smoke_corridor > 400 ? '600°C' : '400°C'} / 2ч)</b>. 
                                        Рабочая точка вентилятора должна соответствовать расходу <b>{results.L_sm.toFixed(0)} м³/ч</b> при расчетной температуре <b>{results.T_smoke_corridor.toFixed(0)}°C</b>. Плотность дыма {results.rho_smoke.toFixed(2)} кг/м³.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONTROLS */}
                    {data.systemType === 'Extraction' && currentStep < 2 && (
                        <div className="mt-8 flex justify-end">
                             <GlassButton 
                                onClick={handleNext} 
                                label="Далее" 
                                icon={<ChevronRight size={18}/>} 
                                active={STEPS[currentStep].isValid}
                                disabled={!STEPS[currentStep].isValid}
                                customClass={STEPS[currentStep].isValid ? "bg-orange-600 text-white w-40" : "bg-white/5 text-slate-500 w-40 opacity-50"}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResultBox = ({label, val, unit, highlight, color}: any) => (
    <div className={`p-6 rounded-3xl border flex flex-col items-center justify-center ${highlight ? 'bg-orange-600/20 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.15)]' : 'bg-black/30 border-white/10'}`}>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</div>
        <div className={`text-4xl font-black ${color || 'text-white'}`}>{val}</div>
        <div className="text-xs font-bold text-slate-500 mt-1 uppercase">{unit}</div>
    </div>
);

export default SmokeCalculator;