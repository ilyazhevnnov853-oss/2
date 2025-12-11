import React, { useState } from 'react';
import { Fan, ScanLine, Calculator, Wind, Thermometer, Home, ArrowUpToLine, Search, CheckCircle2, AlertTriangle, XCircle, Power, PlusCircle, Play, Pause, X, ChevronLeft } from 'lucide-react';
import { SPECS, DIFFUSER_CATALOG } from '../../../../constants'; // Путь скорректирован
import { calculatePerformance } from '../../../../hooks/useSimulation'; // Путь скорректирован
import { GlassButton, GlassSlider, SectionHeader } from '../../../ui/Shared'; // Путь скорректирован
import { AccordionItem } from './SimulatorUI';

export const SimulatorLeftPanel = ({ 
    activeTab, setActiveTab, 
    openSection, toggleSection, 
    params, setParams, 
    physics, currentMode,
    isPowerOn, togglePower, 
    viewMode, isPlaying, setIsPlaying, 
    sizeSelected, setSizeSelected,
    onHome, onBack, isMobileMenuOpen, setIsMobileMenuOpen,
    onAddDiffuser,
    calcVolume, setCalcVolume,
    limitVelocity, setLimitVelocity,
    limitNoise, setLimitNoise,
    calcResults, setCalcResults
}: any) => {

    const [calcFlowType, setCalcFlowType] = useState('vertical');

    const handleModelChange = (id: string) => {
        const validDiameter = Object.keys(SPECS).find(d => {
            const val = !isNaN(Number(d)) ? Number(d) : d;
            const model = DIFFUSER_CATALOG.find(m => m.id === id);
            if (!model) return false;
            return calculatePerformance(id, model.modes[0].flowType, val, 100) !== null;
        });
        const newDiameter = validDiameter ? (!isNaN(Number(validDiameter)) ? Number(validDiameter) : validDiameter) : '';
        
        let newVol = params.volume;
        if (newDiameter && SPECS[newDiameter]) {
             const { min, max } = SPECS[newDiameter];
             if (newVol < min) newVol = min;
             if (newVol > max) newVol = max;
        }
        setParams(p => ({ ...p, modelId: id, modeIdx: 0, diameter: newDiameter, volume: newVol }));
        setSizeSelected(!!newDiameter);
    };

    const handleSizeSelect = (d: string | number) => {
        let newVol = params.volume;
        if (d && SPECS[d]) {
             const { min, max } = SPECS[d];
             if (newVol < min) newVol = min;
             if (newVol > max) newVol = max;
        }
        setParams(p => ({ ...p, diameter: d, volume: newVol }));
        setSizeSelected(true);
    };

    const toggleCeilingMount = () => {
        setParams(p => ({
            ...p, isCeilingMounted: !p.isCeilingMounted,
            diffuserHeight: !p.isCeilingMounted ? p.roomHeight : p.diffuserHeight
        }));
    };

    const handleCalculate = () => {
        if (!calcVolume) return;
        const groupedResults: any[] = [];
        const allSizes = Object.keys(SPECS).sort((a,b) => parseInt(a) - parseInt(b));
        
        DIFFUSER_CATALOG.forEach(model => {
            const seriesResults: any[] = [];
            const targetModeIdx = 0; 
            if (model.modes[targetModeIdx]) {
                const mode = model.modes[targetModeIdx];
                allSizes.forEach(d => {
                    const safeD = !isNaN(Number(d)) ? Number(d) : d;
                    const perf = calculatePerformance(model.id, mode.flowType, safeD, Number(calcVolume));
                    if (perf) seriesResults.push({ diameter: safeD, ...perf });
                });
                if (seriesResults.length > 0) groupedResults.push({ model: model, modeIdx: targetModeIdx, results: seriesResults });
            }
        });
        setCalcResults(groupedResults);
    };

    const applyResult = (modelId: string, modeIdx: number, diameter: string | number) => {
        const safeDiameter = isNaN(Number(diameter)) ? diameter : Number(diameter);
        setParams(p => ({ ...p, modelId, modeIdx, diameter: safeDiameter, volume: Number(calcVolume) }));
        setSizeSelected(true);
        if (!isPowerOn) togglePower();
        setActiveTab('overview');
        setIsMobileMenuOpen(false);
    };

    return (
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
                             <button onClick={onHome} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group">
                                <Home size={18} />
                             </button>
                             {onBack && (
                                 <button onClick={onBack} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group">
                                    <ChevronLeft size={18} />
                                 </button>
                             )}
                        </div>

                        <div className="h-8 w-px bg-white/10"></div>

                        <div className="flex items-center gap-3">
                             <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20 text-white">
                                <Wind size={20} />
                             </div>
                             <div>
                                <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">Инженерный комплекс</p>
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-1 mt-2 p-1 bg-black/40 rounded-xl border border-white/5">
                        <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Обзор</button>
                        <button onClick={() => setActiveTab('selection')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'selection' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Подбор</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2">
                    {activeTab === 'overview' ? (
                        <>
                            <AccordionItem title="Воздухораспределитель" icon={<Fan size={18}/>} isOpen={openSection === 'distributor'} onClick={() => toggleSection('distributor')}>
                                <div className="mb-5">
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {DIFFUSER_CATALOG.map(d => (
                                            <button key={d.id} onClick={() => handleModelChange(d.id)} className={`p-3.5 rounded-2xl border text-left transition-all group relative overflow-hidden ${params.modelId === d.id ? 'bg-blue-600 border-blue-500/50 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
                                                <div className="text-xs font-bold relative z-10">{d.series}</div>
                                                <div className={`text-[10px] truncate relative z-10 mt-0.5 ${params.modelId === d.id ? 'text-blue-100' : 'opacity-50'}`}>{d.name}</div>
                                                {params.modelId === d.id && <div className="absolute right-0 top-0 p-2 opacity-20"><CheckCircle2 size={32}/></div>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-6 p-4 rounded-2xl bg-black/20 border border-white/5">
                                    <div className="flex justify-between items-baseline mb-3">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Типоразмер</label>
                                        {!sizeSelected && <span className="text-[9px] text-amber-500 font-bold animate-pulse flex items-center gap-1"><AlertTriangle size={10}/> Выберите размер</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(SPECS).map(d => {
                                            const val = !isNaN(Number(d)) ? Number(d) : d;
                                            if (calculatePerformance(params.modelId, currentMode.flowType, val, 100) === null) return null;
                                            return <button key={d} onClick={() => handleSizeSelect(val)} className={`px-3 py-2 rounded-xl text-[10px] font-bold font-mono transition-all border ${params.diameter === val ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10 hover:text-white'}`}>{d}</button>;
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <GlassSlider label="Расход воздуха" icon={<Wind size={14}/>} val={params.volume} min={physics.spec.min || 50} max={(physics.spec.max || 1000) * 1.5} step={10} unit=" м³/ч" onChange={(v: number) => setParams(p => ({...p, volume: v}))}/>
                                    <GlassSlider label="Т° Притока" icon={<Thermometer size={14}/>} val={params.temperature} min={15} max={35} step={1} unit="°C" onChange={(v: number) => setParams(p => ({...p, temperature: v}))} color="temp"/>
                                </div>
                            </AccordionItem>

                            <AccordionItem title="Помещение" icon={<ScanLine size={18}/>} isOpen={openSection === 'room'} onClick={() => toggleSection('room')}>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {['roomWidth', 'roomLength', 'roomHeight', 'workZoneHeight'].map(key => (
                                        <div key={key} className="bg-black/20 p-3 rounded-2xl border border-white/5 hover:border-white/20 transition-colors focus-within:border-blue-500/50 group">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5 group-focus-within:text-blue-400 transition-colors">
                                                {key === 'roomWidth' && 'Ширина'}
                                                {key === 'roomLength' && 'Длина'}
                                                {key === 'roomHeight' && 'Высота'}
                                                {key === 'workZoneHeight' && 'Раб. Зона'} (м)
                                            </label>
                                            <input type="number" step="0.5" value={(params as any)[key]} onChange={(e) => setParams(p => ({...p, [key]: Number(e.target.value)}))} className="bg-transparent w-full text-sm font-bold font-mono text-white outline-none" />
                                        </div>
                                    ))}
                                </div>
                                <GlassSlider label="Т° Помещения" icon={<Home size={14}/>} val={params.roomTemp} min={15} max={35} step={1} unit="°C" onChange={(v: number) => setParams(p => ({...p, roomTemp: v}))} color="temp"/>
                                <div className="mt-6 pt-5 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20"><ArrowUpToLine size={16}/></div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-slate-500">Тип монтажа</div>
                                                <div className="text-xs font-bold text-white tracking-wide">{params.isCeilingMounted ? 'Потолочный' : 'Свободный'}</div>
                                            </div>
                                        </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={params.isCeilingMounted} onChange={toggleCeilingMount} />
                                            <div className="w-12 h-7 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                        </label>
                                    </div>
                                    <div className={`transition-all duration-300 overflow-hidden ${!params.isCeilingMounted ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="bg-black/20 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Высота установки</span>
                                            <div className="flex items-center gap-2"><input type="number" step="0.1" value={params.diffuserHeight} onChange={(e) => setParams(p => ({...p, diffuserHeight: Number(e.target.value)}))} className="bg-transparent w-16 text-right text-sm font-bold font-mono text-white outline-none"/><span className="text-[10px] font-bold text-slate-600">м</span></div>
                                        </div>
                                    </div>
                                </div>
                            </AccordionItem>
                        </>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-left-4 fade-in">
                            <div className="space-y-4">
                                <SectionHeader icon={<Calculator size={14}/>} title="Подбор по параметрам" />
                                <div className="bg-black/20 p-1 rounded-xl border border-white/5 flex">
                                    <button onClick={() => setCalcFlowType('horizontal')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${calcFlowType === 'horizontal' ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-white'}`}>ГОРИЗОНТАЛЬНЫЙ</button>
                                    <button onClick={() => setCalcFlowType('vertical')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${calcFlowType === 'vertical' ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-white'}`}>ВЕРТИКАЛЬНЫЙ</button>
                                </div>
                                <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Требуемый расход</div>
                                    <div className="flex items-center gap-2"><input type="number" value={calcVolume} onChange={(e) => setCalcVolume(e.target.value)} className="bg-transparent w-full text-lg font-bold font-mono text-white outline-none" placeholder="0"/><span className="text-[10px] font-bold text-slate-500">М³/Ч</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5"><div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Макс. V0</div><input type="number" value={limitVelocity} onChange={(e) => setLimitVelocity(e.target.value)} className="bg-transparent w-full text-sm font-bold font-mono text-white outline-none" /></div>
                                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5"><div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Макс. Шум</div><input type="number" value={limitNoise} onChange={(e) => setLimitNoise(e.target.value)} className="bg-transparent w-full text-sm font-bold font-mono text-white outline-none" /></div>
                                </div>
                                <GlassButton onClick={handleCalculate} icon={<Search size={16}/>} label="Найти решения" active={true}/>
                            </div>
                            <div className="space-y-3 pb-20">
                                {calcResults.length > 0 ? (
                                    calcResults.map((group: any) => (
                                        <div key={group.model.id} className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                            <div className="px-3 py-2 bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.model.series}</div>
                                            {group.results.map((res: any) => {
                                                const isV0Bad = res.v0 > Number(limitVelocity);
                                                const isNoiseBad = res.noise > Number(limitNoise);
                                                return (
                                                    <button key={res.diameter} onClick={() => applyResult(group.model.id, group.modeIdx, res.diameter)} className="w-full grid grid-cols-4 gap-2 p-3 items-center text-xs border-b border-white/5 last:border-0 hover:bg-white/10 transition-colors group text-left">
                                                        <div className="font-bold font-mono text-white">Ø{res.diameter}</div>
                                                        <div className={`font-mono text-center ${isV0Bad ? 'text-amber-500' : 'text-slate-400'}`}>{res.v0.toFixed(1)} м/с</div>
                                                        <div className={`font-mono text-center ${isNoiseBad ? 'text-amber-500' : 'text-slate-400'}`}>{res.noise.toFixed(0)} дБ</div>
                                                        <div className="flex justify-end">{(!isV0Bad && !isNoiseBad) ? <CheckCircle2 size={14} className="text-emerald-500"/> : <AlertTriangle size={14} className="text-amber-500"/>}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))
                                ) : (<div className="text-center py-8 text-slate-600 text-xs">Нет результатов</div>)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-5 bg-[#050508]/60 border-t border-white/5 backdrop-blur-xl">
                        <div className="grid grid-cols-2 gap-3">
                        <GlassButton onClick={togglePower} active={isPowerOn} icon={<Power size={18} />} label={isPowerOn ? "Стоп" : "Старт"} customClass={`${isPowerOn ? "bg-red-500 text-white shadow-lg shadow-red-500/30 border border-red-400/50" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/50"}`}/>
                        {viewMode === 'top' && <GlassButton onClick={onAddDiffuser} icon={<PlusCircle size={18} />} label="Добавить" secondary={true} disabled={!sizeSelected || !!physics.error} />}
                            {viewMode === 'side' && <GlassButton onClick={() => setIsPlaying(!isPlaying)} icon={isPlaying ? <Pause size={18}/> : <Play size={18}/>} secondary={true} disabled={!isPowerOn} />}
                        </div>
                </div>
            </div>
        </div>
    );
};