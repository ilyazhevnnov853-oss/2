import React from 'react';
import { Fan, ScanLine, Wind, Thermometer, Home, ArrowUpToLine, CheckCircle2, AlertTriangle, Power, PlusCircle, Play, Pause, X, ChevronLeft } from 'lucide-react';
import { SPECS, DIFFUSER_CATALOG } from '../../../../constants'; // Путь скорректирован
import { calculatePerformance } from '../../../../hooks/useSimulation'; // Путь скорректирован
import { GlassButton, GlassSlider } from '../../../ui/Shared'; // Путь скорректирован
import { AccordionItem } from './SimulatorUI';

export const SimulatorLeftPanel = ({ 
    openSection, toggleSection, 
    params, setParams, 
    physics, currentMode,
    isPowerOn, togglePower, 
    viewMode, isPlaying, setIsPlaying, 
    sizeSelected, setSizeSelected,
    onHome, onBack, isMobileMenuOpen, setIsMobileMenuOpen,
    onAddDiffuser, onDragStart
}: any) => {

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

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 z-[60] lg:hidden backdrop-blur-sm transition-opacity" 
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            
            <div className={`
                fixed inset-y-0 left-0 z-[70] bg-[#0a0a0f] lg:bg-transparent lg:static w-[85vw] md:w-[420px] lg:w-[420px] h-[100dvh] lg:h-screen shrink-0 transition-transform duration-300 ease-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                p-0 lg:p-4 lg:pl-4 border-r border-white/10 lg:border-none shadow-2xl lg:shadow-none
            `}>
                <div className="flex-1 flex flex-col h-full lg:rounded-[32px] bg-[#0a0a0f] lg:bg-[#0a0a0f]/80 backdrop-blur-2xl lg:border border-white/5 overflow-hidden ring-1 ring-white/5">
                    {/* Header */}
                    <div className="p-5 lg:p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative pt-safe-top">
                        <div className="flex justify-between items-center lg:hidden mb-4">
                            <h2 className="text-lg font-bold text-white">Настройки</h2>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-lg text-white"><X size={20} /></button>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex gap-2">
                                 <button onClick={onHome} className="p-3 lg:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group">
                                    <Home size={18} />
                                 </button>
                                 {onBack && (
                                     <button onClick={onBack} className="p-3 lg:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group">
                                        <ChevronLeft size={18} />
                                     </button>
                                 )}
                            </div>

                            <div className="h-8 w-px bg-white/10 hidden lg:block"></div>

                            <div className="hidden lg:flex items-center gap-3">
                                 <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20 text-white">
                                    <Wind size={20} />
                                 </div>
                                 <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">Инженерный комплекс</p>
                                 </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-5 space-y-2 pb-24 lg:pb-5">
                        <AccordionItem title="Воздухораспределитель" icon={<Fan size={18}/>} isOpen={openSection === 'distributor'} onClick={() => toggleSection('distributor')}>
                            <div className="mb-5">
                                <div className="grid grid-cols-2 gap-2.5">
                                    {DIFFUSER_CATALOG.map(d => (
                                        <button 
                                            key={d.id} 
                                            draggable={true}
                                            onDragStart={(e) => onDragStart && onDragStart(e, d.id)}
                                            onClick={() => handleModelChange(d.id)} 
                                            className={`p-3.5 rounded-2xl border text-left transition-all group relative overflow-hidden cursor-grab active:cursor-grabbing ${params.modelId === d.id ? 'bg-blue-600 border-blue-500/50 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                        >
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
                                        return <button key={d} onClick={() => handleSizeSelect(val)} className={`px-4 py-2.5 rounded-xl text-[10px] font-bold font-mono transition-all border ${params.diameter === val ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10 hover:text-white'}`}>{d}</button>;
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
                    </div>

                    {/* Footer Controls (Fixed on mobile inside drawer, relative on desktop) */}
                    <div className="p-5 bg-[#050508]/60 border-t border-white/5 backdrop-blur-xl absolute bottom-0 left-0 right-0 lg:relative">
                            <div className="grid grid-cols-2 gap-3">
                            <GlassButton onClick={togglePower} active={isPowerOn} icon={<Power size={18} />} label={isPowerOn ? "Стоп" : "Старт"} customClass={`${isPowerOn ? "bg-red-500 text-white shadow-lg shadow-red-500/30 border border-red-400/50" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/50"}`}/>
                            {viewMode === 'top' && <GlassButton onClick={() => { onAddDiffuser(); setIsMobileMenuOpen(false); }} icon={<PlusCircle size={18} />} label="Добавить" secondary={true} disabled={!sizeSelected || !!physics.error} />}
                                {viewMode === 'side' && <GlassButton onClick={() => setIsPlaying(!isPlaying)} icon={isPlaying ? <Pause size={18}/> : <Play size={18}/>} secondary={true} disabled={!isPowerOn} />}
                            </div>
                    </div>
                </div>
            </div>
        </>
    );
};