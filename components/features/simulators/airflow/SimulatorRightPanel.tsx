import React from 'react';
import { Maximize, LayoutList, ScanLine, Ruler, Wind } from 'lucide-react';
import { SectionHeader } from '../../../ui/Shared';
import { InfoRow } from './SimulatorUI';

export const SimulatorRightPanel = ({ viewMode, physics, params, placedDiffusers, topViewStats, coverageAnalysis }: any) => {
    return (
        <div className="hidden lg:flex flex-col w-[360px] h-screen shrink-0 relative z-20 p-4 pl-0">
            <div className="flex-1 rounded-[32px] bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto custom-scrollbar relative">
                <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"/>
                
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
                            <div className="mt-4 bg-gradient-to-br from-white/5 to-transparent rounded-[24px] p-6 border border-white/5 shadow-inner relative overflow-hidden">
                                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px]"></div>
                                <div className="flex justify-between items-end mb-6 relative z-10">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Всего устройств</span>
                                    <span className="text-5xl font-black text-white leading-none tracking-tighter">{placedDiffusers.length}</span>
                                </div>
                                
                                <div className="space-y-2 relative z-10">
                                    <div className="bg-black/30 rounded-2xl p-4 flex justify-between items-center border border-white/5 backdrop-blur-md">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Макс. Шум</span>
                                        <span className={`font-mono font-black text-sm ${topViewStats.maxNoise > 45 ? 'text-red-400' : 'text-white'}`}>{topViewStats.maxNoise.toFixed(0)} дБ</span>
                                    </div>
                                    <div className="bg-black/30 rounded-2xl p-4 flex justify-between items-center border border-white/5 backdrop-blur-md">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Т° Смешения</span>
                                        <span className="font-mono font-black text-sm text-emerald-400">{topViewStats.calcTemp.toFixed(1)} °C</span>
                                    </div>
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
            </div>
        </div>
    );
};