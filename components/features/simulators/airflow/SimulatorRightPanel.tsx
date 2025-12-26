
import React, { useState } from 'react';
import { Maximize, LayoutList, ScanLine, Ruler, Wind, X, Target, Trash2, AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../../../ui/Shared';
import { InfoRow, AccordionItem } from './SimulatorUI';
import { calculateProbeData } from '../../../../hooks/useSimulation';

export const SimulatorRightPanel = ({ 
    viewMode, physics, params, placedDiffusers, topViewStats, coverageAnalysis, 
    isMobileStatsOpen, setIsMobileStatsOpen,
    isHelpMode,
    probes, onRemoveProbe
}: any) => {

    const [sections, setSections] = useState({
        results: true,
        params: true,
        summary: true,
        probes: true,
        coverage: true
    });

    const toggle = (key: string) => setSections((prev: any) => ({ ...prev, [key]: !prev[key] }));

    // Safety Check for Cold Air Dumping
    // If Archimedes Number is significantly negative (Cooling) and Velocity is low
    // We infer risk.
    const isCooling = params.temperature < params.roomTemp;
    const isDumpingRisk = isCooling && physics.Ar < -0.05; // -0.05 is a threshold where drop is significant

    const Content = () => (
        <>
            {viewMode !== 'top' ? (
                <div className="space-y-4 animate-in slide-in-from-right-8 duration-500 relative z-10">
                    <AccordionItem 
                        title="Результаты" 
                        icon={<Maximize size={16}/>} 
                        isOpen={sections.results} 
                        onClick={() => toggle('results')}
                    >
                        <div className="mt-0 bg-gradient-to-br from-white/5 to-transparent rounded-[24px] p-6 border border-white/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px] group-hover:bg-blue-500/30 transition-colors"></div>
                            
                            <div className="text-center pb-6 mb-4 border-b border-white/5 relative z-10">
                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tighter">{physics.v0.toFixed(2)}</div>
                                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-2">Скорость V0 (м/с)</div>
                            </div>
                            <div className="space-y-1 relative z-10">
                                <InfoRow label="Дальнобойность" value={physics.throwDist.toFixed(1)} unit="м" highlight />
                                <InfoRow label="Шум (LwA)" value={physics.noise.toFixed(0)} unit="дБ" alert={physics.noise > 45} />
                                <InfoRow label="В Рабочей Зоне" value={physics.workzoneVelocity.toFixed(2)} unit="м/с" subValue="Максимальная" />
                            </div>
                        </div>
                        
                        {/* DUMPING WARNING */}
                        {isDumpingRisk && (
                            <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-[10px] font-bold text-amber-500 uppercase mb-1">Риск сваливания струи</div>
                                    <p className="text-[10px] text-amber-200/80 leading-snug">
                                        Холодный воздух падает в рабочую зону слишком быстро. Увеличьте скорость или температуру.
                                    </p>
                                </div>
                            </div>
                        )}
                    </AccordionItem>
                    
                    <AccordionItem 
                        title="Параметры" 
                        icon={<LayoutList size={16}/>} 
                        isOpen={sections.params} 
                        onClick={() => toggle('params')}
                    >
                        <div className="mt-0 bg-black/20 rounded-[24px] p-2 border border-white/5">
                            <InfoRow label="Т° Помещения" value={params.roomTemp} unit="°C" />
                            <InfoRow label="Т° Притока" value={params.temperature} unit="°C" highlight />
                            <InfoRow label="Объем Воздуха" value={params.volume} unit="м³/ч" />
                        </div>
                    </AccordionItem>
                </div>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-right-8 duration-500 relative z-10">
                    <AccordionItem 
                        title="Сводка по плану" 
                        icon={<ScanLine size={16}/>} 
                        isOpen={sections.summary} 
                        onClick={() => toggle('summary')}
                    >
                        <div className="mt-0 bg-[#13141c] rounded-[24px] p-6 border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px]"></div>
                            
                            <div className="flex flex-col items-end mb-6 relative z-10">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Всего устройств</span>
                                <span className="text-7xl font-black text-white leading-none tracking-tighter drop-shadow-xl">{placedDiffusers.length}</span>
                            </div>
                            
                            <div className="space-y-1 relative z-10 border-t border-white/5 pt-2">
                                <InfoRow label="Макс. Шум" value={topViewStats.maxNoise.toFixed(0)} unit="дБ" alert={topViewStats.maxNoise > 45} />
                                <InfoRow label="Т° Смешения" value={topViewStats.calcTemp.toFixed(1)} unit="°C" highlight />
                            </div>
                        </div>
                    </AccordionItem>

                    {/* PROBES LIST SECTION */}
                    {probes && probes.length > 0 && (
                        <AccordionItem 
                            title="Точки измерения" 
                            icon={<Target size={16}/>} 
                            isOpen={sections.probes} 
                            onClick={() => toggle('probes')}
                        >
                            <div className="mt-0 space-y-3">
                                {probes.map((probe: any, idx: number) => {
                                    // Calculate realtime data for list view
                                    const data = calculateProbeData(probe.x, probe.y, placedDiffusers, params.roomTemp, params.temperature, [], probe.z);
                                    const drColor = data.dr < 15 ? 'text-emerald-400' : data.dr < 25 ? 'text-amber-400' : 'text-red-400';
                                    
                                    return (
                                        <div key={probe.id} className="bg-black/20 rounded-xl p-3 border border-white/5 hover:bg-white/5 transition-colors group">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">H={probe.z.toFixed(1)}m</span>
                                                </div>
                                                <button onClick={() => onRemoveProbe(probe.id)} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="text-center bg-white/5 rounded-lg p-1.5">
                                                    <div className="text-[9px] text-slate-500 mb-0.5">V (м/с)</div>
                                                    <div className="font-mono font-bold text-xs text-white">{data.v.toFixed(2)}</div>
                                                </div>
                                                <div className="text-center bg-white/5 rounded-lg p-1.5">
                                                    <div className="text-[9px] text-slate-500 mb-0.5">T (°C)</div>
                                                    <div className="font-mono font-bold text-xs text-white">{data.t.toFixed(1)}</div>
                                                </div>
                                                <div className="text-center bg-white/5 rounded-lg p-1.5 border border-white/5">
                                                    <div className="text-[9px] text-slate-500 mb-0.5">DR (%)</div>
                                                    <div className={`font-mono font-bold text-xs ${drColor}`}>{data.dr.toFixed(0)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </AccordionItem>
                    )}

                    <AccordionItem 
                        title="Анализ покрытия" 
                        icon={<Ruler size={16}/>} 
                        isOpen={sections.coverage} 
                        onClick={() => toggle('coverage')}
                    >
                        <div className="mt-0 bg-black/20 rounded-[24px] p-2 border border-white/5">
                                <InfoRow 
                                label="Покрытие РЗ" 
                                value={coverageAnalysis.totalCoverage.toFixed(0)} unit="%" 
                                highlight
                            />
                            <InfoRow 
                                label="Ср. Скорость" 
                                value={coverageAnalysis.avgVelocity.toFixed(2)} unit="м/с" 
                            />
                        </div>
                    </AccordionItem>
                </div>
            )}
        </>
    );

    return (
        <>
            {/* Desktop Panel */}
            <div className={`
                hidden lg:flex flex-col w-[360px] h-screen shrink-0 relative p-4 pl-0 transition-all duration-300
                ${isHelpMode ? 'z-[210]' : 'z-20'}
            `}>
                <div className="flex-1 rounded-[32px] bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto custom-scrollbar relative">
                    <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"/>
                    <Content />
                </div>
            </div>

            {/* Mobile Bottom Sheet/Drawer */}
            <div className={`
                fixed inset-x-0 bottom-0 lg:hidden
                bg-[#0a0a0f] border-t border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]
                transform transition-transform duration-300 ease-out flex flex-col max-h-[85vh]
                ${isHelpMode ? 'z-[210]' : 'z-[80]'}
                ${isMobileStatsOpen ? 'translate-y-0' : 'translate-y-full'}
            `}>
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                     <div className="w-12 h-1 bg-white/10 rounded-full absolute top-3 left-1/2 -translate-x-1/2"></div>
                     <span className="font-bold text-white uppercase tracking-widest text-xs">Статистика</span>
                     <button onClick={() => setIsMobileStatsOpen(false)} className="p-2 bg-white/10 rounded-full text-slate-400 hover:text-white"><X size={16}/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar pb-10">
                    <Content />
                </div>
            </div>
            {/* Mobile Backdrop */}
            {isMobileStatsOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] lg:hidden backdrop-blur-sm" onClick={() => setIsMobileStatsOpen(false)} />
            )}
        </>
    );
};
