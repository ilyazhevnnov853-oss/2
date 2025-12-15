import React from 'react';
import { Maximize, LayoutList, ScanLine, Ruler, Wind, X } from 'lucide-react';
import { SectionHeader } from '../../../ui/Shared';
import { InfoRow } from './SimulatorUI';

export const SimulatorRightPanel = ({ 
    viewMode, physics, params, placedDiffusers, topViewStats, coverageAnalysis, 
    isMobileStatsOpen, setIsMobileStatsOpen 
}: any) => {

    const Content = () => (
        <>
            {viewMode === 'side' ? (
                <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 relative z-10">
                        <div>
                        <SectionHeader icon={<Maximize size={16}/>} title="Результаты" />
                        <div className="mt-4 bg-gradient-to-br from-white/5 to-transparent rounded-[24px] p-6 border border-white/5 shadow-inner relative overflow-hidden group">
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
                    </div>
                    
                    <div>
                        <SectionHeader icon={<LayoutList size={16}/>} title="Параметры" />
                        <div className="mt-4 bg-black/20 rounded-[24px] p-2 border border-white/5">
                            <InfoRow label="Т° Помещения" value={params.roomTemp} unit="°C" />
                            <InfoRow label="Т° Притока" value={params.temperature} unit="°C" highlight />
                            <InfoRow label="Объем Воздуха" value={params.volume} unit="м³/ч" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 relative z-10">
                    <div>
                        <SectionHeader icon={<ScanLine size={16}/>} title="Сводка по плану" />
                        <div className="mt-4 bg-[#13141c] rounded-[24px] p-6 border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative overflow-hidden">
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
                    </div>

                    <div>
                        <SectionHeader icon={<Ruler size={16}/>} title="Анализ покрытия" />
                        <div className="mt-4 bg-black/20 rounded-[24px] p-2 border border-white/5">
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
                        <div className="mt-4 bg-black/20 rounded-[24px] p-5 border border-white/5">
                                <div className="flex justify-between text-[9px] uppercase text-slate-500 font-bold mb-3 tracking-wider">
                                <span>Комфорт</span>
                                <span>Сквозняк</span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex shadow-inner ring-1 ring-white/5">
                                <div className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{width: `${(coverageAnalysis.comfortZones / (coverageAnalysis.totalCoverage || 1)) * 100}%`}}></div>
                                <div className="bg-amber-500 h-full transition-all duration-500" style={{width: `${(coverageAnalysis.warningZones / (coverageAnalysis.totalCoverage || 1)) * 100}%`}}></div>
                                <div className="bg-red-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{width: `${(coverageAnalysis.draftZones / (coverageAnalysis.totalCoverage || 1)) * 100}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <>
            {/* Desktop Panel */}
            <div className="hidden lg:flex flex-col w-[360px] h-screen shrink-0 relative z-20 p-4 pl-0">
                <div className="flex-1 rounded-[32px] bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto custom-scrollbar relative">
                    <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"/>
                    <Content />
                </div>
            </div>

            {/* Mobile Bottom Sheet/Drawer */}
            <div className={`
                fixed inset-x-0 bottom-0 z-[80] lg:hidden
                bg-[#0a0a0f] border-t border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]
                transform transition-transform duration-300 ease-out flex flex-col max-h-[85vh]
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