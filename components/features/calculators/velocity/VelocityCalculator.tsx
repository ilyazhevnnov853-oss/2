import React, { useState } from 'react';
import { Calculator, CircleDot, Grid } from 'lucide-react';
import { AppHeader } from '../../../ui/Shared';

const VelocityCalculator = ({ onBack, onHome }: any) => {
    const [volume, setVolume] = useState<number | string>(1000);
    const [minSpeed, setMinSpeed] = useState<number | string>(2);
    const [maxSpeed, setMaxSpeed] = useState<number | string>(5);

    const circularSizes = [100, 125, 160, 200, 250, 315, 355, 400, 450, 500, 630, 710, 800, 1000, 1250];
    const rectSizes = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000];

    const handleInputChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setter('');
        } else {
            setter(Number(val));
        }
    };

    const calculateSpeed = (area: number) => {
        if (!area || area === 0) return 0;
        const volNum = Number(volume);
        if (!volNum) return 0;
        return volNum / (3600 * area);
    };

    const getStatusColor = (speed: number) => {
        if (speed === 0) return "text-slate-600";
        const min = Number(minSpeed) || 0;
        const max = Number(maxSpeed) || 1000; 
        
        if (speed >= min && speed <= max) return "text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20";
        return "text-slate-500 border-transparent opacity-60";
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#050505] p-6 overflow-hidden">
            <AppHeader 
                title="Калькулятор Скорости" 
                subtitle="Быстрый подбор сечений"
                icon={<Calculator size={24} />}
                onBack={onBack}
                onHome={onHome}
            />

            <div className="flex gap-6 items-center mb-6 glass-panel p-4 rounded-xl">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Расход (м³/ч)</span>
                    <input 
                        type="number" 
                        value={volume} 
                        onChange={handleInputChange(setVolume)} 
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white font-mono w-32 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Мин. скорость</span>
                    <input 
                        type="number" 
                        value={minSpeed} 
                        onChange={handleInputChange(setMinSpeed)} 
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white font-mono w-24 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Макс. скорость</span>
                    <input 
                        type="number" 
                        value={maxSpeed} 
                        onChange={handleInputChange(setMaxSpeed)} 
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white font-mono w-24 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                
                {/* Circular Ducts */}
                <div className="glass-panel rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CircleDot size={16}/> Круглые воздуховоды</h2>
                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                        <div className="flex gap-1 min-w-max">
                            <div className="w-24 shrink-0 flex flex-col gap-1">
                                <div className="h-10 flex items-center px-3 text-[10px] font-bold text-slate-500 bg-white/5 rounded-l-lg border-y border-l border-white/5">Диаметр (мм)</div>
                                <div className="h-10 flex items-center px-3 text-[10px] font-bold text-slate-500 bg-white/5 rounded-l-lg border-y border-l border-white/5">Скорость (м/с)</div>
                            </div>
                            {circularSizes.map(d => {
                                const area = Math.PI * Math.pow(d / 1000, 2) / 4;
                                const speed = calculateSpeed(area);
                                return (
                                    <div key={d} className="w-20 shrink-0 flex flex-col gap-1">
                                        <div className="h-10 flex items-center justify-center text-xs font-mono text-slate-300 bg-black/20 border-y border-r border-white/5">Ø{d}</div>
                                        <div className={`h-10 flex items-center justify-center text-sm font-mono border-y border-r border-white/5 transition-all duration-300 ${getStatusColor(speed)}`}>
                                            {speed.toFixed(1)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Rectangular Ducts */}
                <div className="glass-panel rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Grid size={16}/> Прямоугольные воздуховоды (мм x мм)</h2>
                    <div className="overflow-auto max-h-[600px] custom-scrollbar rounded-xl border border-white/5 bg-black/20">
                        <table className="w-full text-center border-collapse">
                            <thead className="sticky top-0 bg-[#0f172a] z-30 shadow-lg shadow-black/50">
                                <tr>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase border-b border-white/10 min-w-[80px] bg-[#0f172a] sticky left-0 z-40 border-r border-white/10">A x B</th>
                                    {rectSizes.map(w => (
                                        <th key={w} className="p-3 text-xs font-mono text-slate-300 border-b border-white/10 min-w-[60px]">{w}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rectSizes.map(h => (
                                    <tr key={h} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-3 text-xs font-mono text-slate-300 border-r border-white/10 bg-[#0f172a] sticky left-0 z-20 font-bold group-hover:bg-[#1e293b] transition-colors">{h}</td>
                                        {rectSizes.map(w => {
                                            const area = (w / 1000) * (h / 1000);
                                            const speed = calculateSpeed(area);
                                            const statusClass = getStatusColor(speed);
                                            return (
                                                <td key={`${h}x${w}`} className={`p-2 border border-white/5 text-xs font-mono ${statusClass.includes('emerald') ? 'bg-emerald-500/5' : ''}`}>
                                                    <span className={statusClass.includes('emerald') ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                                                        {speed.toFixed(1)}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VelocityCalculator;