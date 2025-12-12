import React, { useState, useEffect } from 'react';
import { Users, Box, Home, ChevronLeft, Menu, X, Wind, Ruler, Activity } from 'lucide-react';
import { SectionHeader, GlassSlider } from '../../../ui/Shared';

const AirExchangeCalculator = ({ onBack, onHome }: any) => {
    const [mode, setMode] = useState<'room' | 'people'>('room');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Room Parameters
    const [area, setArea] = useState(20);
    const [height, setHeight] = useState(3.0);
    const [multiplicity, setMultiplicity] = useState(1);

    // People Parameters
    const [peopleCount, setPeopleCount] = useState(5);
    const [normPerPerson, setNormPerPerson] = useState(60);

    const [resultFlow, setResultFlow] = useState(0);

    useEffect(() => {
        if (mode === 'room') {
            // L = S * h * n
            setResultFlow(area * height * multiplicity);
        } else {
            // L = N * Lnorm
            setResultFlow(peopleCount * normPerPerson);
        }
    }, [mode, area, height, multiplicity, peopleCount, normPerPerson]);

    // Theme Colors
    const themeColor = mode === 'room' ? 'blue' : 'emerald';
    const gradient = mode === 'room' ? 'from-blue-500 to-indigo-600' : 'from-emerald-400 to-teal-600';
    const textColor = mode === 'room' ? 'text-blue-400' : 'text-emerald-400';

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-blue-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse bg-${themeColor}-600/20`} style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
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
                                <div className={`p-2 rounded-xl bg-gradient-to-tr ${gradient} shadow-lg shadow-${themeColor}-500/20 text-white`}>
                                    <Wind size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">HVACLAB</h2>
                                    <p className={`text-[9px] font-bold ${textColor} uppercase tracking-widest mt-0.5`}>Калькулятор</p>
                                </div>
                            </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                            <button 
                                onClick={() => setMode('room')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'room' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Box size={14} /> По помещению
                            </button>
                            <button 
                                onClick={() => setMode('people')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'people' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Users size={14} /> По людям
                            </button>
                        </div>
                    </div>

                    {/* Controls Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                        {mode === 'room' ? (
                            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                                <SectionHeader icon={<Ruler size={14}/>} title="Параметры помещения" />
                                
                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                    {/* Area Input */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Площадь (S)</span>
                                            <div className="flex items-baseline gap-1">
                                                <input 
                                                    type="number" 
                                                    value={area} 
                                                    onChange={(e) => setArea(Math.max(0, Number(e.target.value)))} 
                                                    className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                                />
                                                <span className="text-[10px] font-bold text-slate-500">м²</span>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={area} min={0} max={200} step={1} 
                                            onChange={setArea} 
                                            gradient="from-blue-600 to-indigo-500"
                                            icon={<Box size={14}/>}
                                            label=""
                                        />
                                    </div>

                                    {/* Height Input */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Высота (H)</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-bold font-mono text-white">{height}</span>
                                                <span className="text-[10px] font-bold text-slate-500">м</span>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={height} min={2} max={10} step={0.1} 
                                            onChange={setHeight} 
                                            gradient="from-blue-600 to-cyan-500"
                                            icon={<Ruler size={14} className="rotate-90"/>}
                                            label=""
                                        />
                                    </div>

                                    {/* Multiplicity Input */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Кратность (n)</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-bold font-mono text-white">{multiplicity}</span>
                                                <span className="text-[10px] font-bold text-slate-500">раз/ч</span>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={multiplicity} min={0.5} max={20} step={0.5} 
                                            onChange={setMultiplicity} 
                                            gradient="from-indigo-500 to-purple-500"
                                            icon={<Activity size={14}/>}
                                            label=""
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <SectionHeader icon={<Users size={14}/>} title="Люди и нормы" />
                                
                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-6">
                                    {/* People Count Input */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Количество людей</span>
                                            <div className="flex items-baseline gap-1">
                                                <input 
                                                    type="number" 
                                                    value={peopleCount} 
                                                    onChange={(e) => setPeopleCount(Math.max(0, Number(e.target.value)))} 
                                                    className="bg-transparent text-right text-lg font-bold font-mono text-white outline-none w-24 border-b border-transparent focus:border-white/20 transition-colors"
                                                />
                                                <span className="text-[10px] font-bold text-slate-500">чел</span>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={peopleCount} min={1} max={100} step={1} 
                                            onChange={setPeopleCount} 
                                            gradient="from-emerald-600 to-teal-500"
                                            icon={<Users size={14}/>}
                                            label=""
                                        />
                                    </div>

                                    {/* Norm Input */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Норма на человека</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-bold font-mono text-white">{normPerPerson}</span>
                                                <span className="text-[10px] font-bold text-slate-500">м³/ч</span>
                                            </div>
                                        </div>
                                        <GlassSlider 
                                            val={normPerPerson} min={20} max={100} step={5} 
                                            onChange={setNormPerPerson} 
                                            gradient="from-teal-500 to-cyan-500"
                                            icon={<Wind size={14}/>}
                                            label=""
                                        />
                                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                                            {[20, 30, 40, 60, 80].map(n => (
                                                <button 
                                                    key={n}
                                                    onClick={() => setNormPerPerson(n)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${normPerPerson === n ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT (Visualization) */}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden p-4 pl-0">
                <div className="flex-1 rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border border-white/5 ring-1 ring-white/5 group flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className={`absolute inset-0 bg-gradient-to-b from-${themeColor}-900/10 to-transparent pointer-events-none transition-colors duration-700`}></div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className={`lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-${themeColor}-600 text-white shadow-lg`}>
                        <Menu size={20} />
                    </button>

                    {/* Main Display */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                        
                        {/* Glow Effect */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-${themeColor}-500/10 rounded-full blur-[100px] animate-pulse`}></div>

                        <div className="text-center space-y-2 mb-12">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Необходимый воздухообмен</span>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className={`text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b ${mode === 'room' ? 'from-white to-blue-200' : 'from-white to-emerald-200'} tracking-tighter drop-shadow-2xl`}>
                                    {resultFlow.toFixed(0)}
                                </span>
                                <span className={`text-2xl font-black ${textColor} uppercase`}>м³/ч</span>
                            </div>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                             {mode === 'room' ? (
                                 <>
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                                                <Box size={24}/>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Объем помещения</div>
                                                <div className="text-sm text-slate-400">{area} м² × {height} м</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white">{(area * height).toFixed(1)} <span className="text-sm text-slate-500">м³</span></div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                                                <Activity size={24}/>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Смен в час</div>
                                                <div className="text-sm text-slate-400">Кратность</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white">{multiplicity} <span className="text-sm text-slate-500">раз</span></div>
                                        </div>
                                    </div>
                                 </>
                             ) : (
                                 <>
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                                                <Users size={24}/>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Люди</div>
                                                <div className="text-sm text-slate-400">Посетители</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white">{peopleCount} <span className="text-sm text-slate-500">чел</span></div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400">
                                                <Wind size={24}/>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Норма</div>
                                                <div className="text-sm text-slate-400">Санитарная</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white">{normPerPerson} <span className="text-sm text-slate-500">м³/ч</span></div>
                                        </div>
                                    </div>
                                 </>
                             )}
                        </div>
                    </div>
                    
                    {/* Legend Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                         <div>Формула: {mode === 'room' ? 'L = S · H · n' : 'L = N · Lnorm'}</div>
                         <div>{mode === 'room' ? 'n - кратность воздухообмена' : 'Lnorm - норма воздуха на человека'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AirExchangeCalculator;