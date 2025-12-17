import React from 'react';
import { 
    Wind, Ruler, Volume2, ArrowDownToLine, Thermometer, 
    Activity, Box, ScanLine, X, Calculator
} from 'lucide-react';
import { SectionHeader } from '../../../ui/Shared';

const ResultCard = ({ label, value, unit, icon: Icon, color = "text-slate-200", subtext, warning }: any) => (
    <div className={`relative overflow-hidden group p-4 rounded-2xl border transition-all duration-300 ${warning ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
        {warning && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-xl ${warning ? 'bg-red-500/20 text-red-400' : 'bg-black/20 text-slate-400 group-hover:text-white transition-colors'}`}>
                <Icon size={16} />
            </div>
            {subtext && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-black/20 px-2 py-1 rounded-lg">{subtext}</span>}
        </div>
        <div className="mt-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
            <div className={`text-2xl font-black ${warning ? 'text-red-400' : color} tracking-tight`}>
                {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value} <span className="text-xs font-bold text-slate-500 ml-0.5">{unit}</span>
            </div>
        </div>
    </div>
);

const MiniStat = ({ label, value }: any) => (
    <div className="flex flex-col">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-slate-200 font-mono">{value}</span>
    </div>
);

export const SimulatorRightPanel = ({ 
    viewMode, physics, params, placedDiffusers, topViewStats, coverageAnalysis, 
    isMobileStatsOpen, setIsMobileStatsOpen 
}: any) => {

    // --- CALCULATIONS ---
    const isHeating = params.temperature > params.roomTemp;
    const isCooling = params.temperature < params.roomTemp;
    const dt = params.temperature - params.roomTemp;
    
    // Archimedes Number
    const Ar = physics.Ar || 0;
    const arLabel = Math.abs(Ar) < 0.001 ? "Изотермическая" : Ar > 0 ? "Всплывающая" : "Настилающаяся";
    const arColor = Math.abs(Ar) < 0.001 ? "text-slate-400" : Ar > 0 ? "text-orange-400" : "text-cyan-400";

    // System Totals
    const totalVolume = placedDiffusers.length > 0 
        ? placedDiffusers.reduce((acc: number, d: any) => acc + d.volume, 0)
        : params.volume; // Fallback to current if none placed

    // Logarithmic Noise Summation: L_sum = 10 * log10( sum( 10^(0.1 * Li) ) )
    const calculateTotalNoise = () => {
        const sources = placedDiffusers.length > 0 ? placedDiffusers : [{ performance: physics }];
        const sumPower = sources.reduce((acc: number, d: any) => {
            const noise = d.performance.noise || 0;
            return acc + Math.pow(10, 0.1 * noise);
        }, 0);
        return sumPower > 0 ? 10 * Math.log10(sumPower) : 0;
    };
    const totalNoise = calculateTotalNoise();

    const Content = () => (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 relative z-10">
            
            {/* 1. ROOM PARAMETERS (Параметры помещения) */}
            <div>
                <SectionHeader icon={<Box size={16}/>} title="Параметры помещения" />
                <div className="mt-4 bg-[#13141c] rounded-[24px] p-5 border border-white/5 space-y-4 shadow-lg">
                    {/* Dimensions Grid */}
                    <div className="grid grid-cols-3 gap-2 pb-4 border-b border-white/5">
                        <MiniStat label="Длина" value={`${params.roomLength} м`} />
                        <MiniStat label="Ширина" value={`${params.roomWidth} м`} />
                        <MiniStat label="Высота" value={`${params.roomHeight} м`} />
                    </div>
                    {/* Conditions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                                <ArrowDownToLine size={18} />
                            </div>
                            <div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Рабочая зона</div>
                                <div className="text-lg font-black text-white">{params.workZoneHeight} <span className="text-xs text-slate-500">м</span></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                <Thermometer size={18} />
                            </div>
                            <div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Т пом.</div>
                                <div className="text-lg font-black text-white">{params.roomTemp} <span className="text-xs text-slate-500">°C</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. SYSTEM SUMMARY (Параметры воздуха) */}
            <div>
                <SectionHeader icon={<Wind size={16}/>} title="Система вентиляции" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                    {/* Total Flow */}
                    <div className="col-span-2 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 p-5 rounded-[24px] border border-blue-500/20 relative overflow-hidden flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Общий расход воздуха</div>
                            <div className="text-4xl font-black text-white tracking-tighter">
                                {totalVolume.toFixed(0)} <span className="text-lg text-slate-500 font-bold uppercase">м³/ч</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 font-medium">
                                {placedDiffusers.length > 0 ? `Всего диффузоров: ${placedDiffusers.length} шт` : 'Проект не создан'}
                            </div>
                        </div>
                        <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                            <Wind size={24} />
                        </div>
                    </div>

                    {/* Total Noise */}
                    <ResultCard 
                        label="Общий шум (LwA)" 
                        value={totalNoise} 
                        unit="дБ" 
                        icon={Volume2} 
                        color={totalNoise > 45 ? "text-red-400" : "text-white"}
                        warning={totalNoise > 55}
                        subtext="Суммарный"
                    />

                    {/* Pressure (Active Device) */}
                    <ResultCard 
                        label="Потери давления" 
                        value={physics.pressure} 
                        unit="Па" 
                        icon={Activity} 
                        color="text-slate-300"
                        subtext="На устройство"
                    />
                </div>
            </div>

            {/* 3. ACTIVE JET PHYSICS (Аэродинамика струи) */}
            <div>
                <SectionHeader icon={<ScanLine size={16}/>} title="Активная струя" />
                <div className="mt-4 bg-black/20 rounded-[24px] p-5 border border-white/5 relative overflow-hidden">
                    {/* Background Visual */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none"></div>

                    <div className="grid grid-cols-2 gap-y-6 relative z-10">
                        {/* V0 */}
                        <div className="border-r border-white/5 pr-4">
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Скорость V0</div>
                            <div className="text-2xl font-black text-white">{physics.v0.toFixed(2)} <span className="text-xs text-slate-500">м/с</span></div>
                        </div>
                        {/* Vx */}
                        <div className="pl-4">
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Скорость в РЗ</div>
                            <div className={`text-2xl font-black ${physics.workzoneVelocity > 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {physics.workzoneVelocity.toFixed(2)} <span className="text-xs text-slate-500">м/с</span>
                            </div>
                        </div>
                        
                        {/* Throw */}
                        <div className="col-span-2 pt-4 border-t border-white/5 flex justify-between items-center">
                            <div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Дальнобойность</div>
                                <div className="text-xl font-black text-white">{physics.throwDist.toFixed(1)} <span className="text-xs text-slate-500">м</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Архимед (Ar)</div>
                                <div className={`font-mono font-bold text-sm ${arColor}`}>{arLabel}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Delta T Indicator */}
                <div className="mt-3 flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Перепад температур (ΔT)</span>
                    <span className={`text-sm font-black ${Math.abs(dt) > 0.1 ? (isHeating ? 'text-orange-400' : 'text-cyan-400') : 'text-slate-400'}`}>
                        {dt > 0 ? '+' : ''}{dt.toFixed(1)} °C
                    </span>
                </div>
            </div>

        </div>
    );

    return (
        <>
            {/* Desktop Panel */}
            <div className="hidden lg:flex flex-col w-[360px] h-screen shrink-0 relative z-20 p-4 pl-0">
                <div className="flex-1 rounded-[32px] bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto custom-scrollbar relative">
                    <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none"/>
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
                <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20">
                     <div className="w-12 h-1 bg-white/10 rounded-full absolute top-3 left-1/2 -translate-x-1/2"></div>
                     <span className="font-bold text-white uppercase tracking-widest text-xs">Результаты расчета</span>
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
