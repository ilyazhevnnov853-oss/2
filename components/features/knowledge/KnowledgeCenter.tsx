import React, { useState, useMemo } from 'react';
import { BookOpen, FileText, ScrollText, ArrowRightLeft, ArrowRight, ChevronLeft, Home, Activity, Wind, Menu, X, Zap, Gauge, ChevronDown, Shapes, Info, Ruler, Scale, Droplets, Box, Thermometer } from 'lucide-react';
import { ENGINEERING_WIKI, NORMS_DB, AVOK_SYMBOLS } from '../../../constants';

const WikiTab = ({ onRead }: any) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 animate-in slide-in-from-right-8 fade-in duration-500 pb-32 md:pb-20">
        {ENGINEERING_WIKI.map((item, idx) => (
            <button 
                key={idx}
                onClick={() => onRead(item)}
                className="group relative bg-[#0b0c10] hover:bg-[#13141a] rounded-2xl md:rounded-[20px] p-4 md:p-5 text-left transition-all duration-300 border border-white/5 hover:border-white/10 flex flex-col min-h-[160px] md:h-48 active:scale-[0.98]"
            >
                <div className="flex justify-between items-start mb-auto w-full">
                    <div className="px-2 py-1 rounded-md bg-[#1c1e26] border border-white/5">
                        <span className="text-[8px] md:text-[9px] font-bold text-blue-400 uppercase tracking-wider">{item.category}</span>
                    </div>
                    <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                        <FileText size={16} className="md:w-[18px] md:h-[18px]" />
                    </div>
                </div>

                <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6 group-hover:text-blue-100 transition-colors leading-snug pr-2">
                    {item.title}
                </h3>
                
                <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-amber-500 transition-colors mt-auto">
                    <span>Читать статью</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </button>
        ))}
    </div>
);

const NormsTab = () => (
    <div className="w-full h-full flex flex-col items-center animate-in slide-in-from-right-8 fade-in duration-500 pb-20">
        <div className="w-full max-w-4xl space-y-3 md:space-y-4">
            {NORMS_DB.map((doc, i) => (
                <div key={i} className="group relative bg-[#0b0c10] rounded-2xl md:rounded-[24px] p-1 border border-white/5 hover:border-emerald-500/30 transition-all duration-300">
                    <div className="bg-[#0b0c10] rounded-xl md:rounded-[20px] p-4 md:p-6 relative z-10 flex flex-col gap-3 md:gap-4">
                        <div className="flex justify-between items-start">
                             <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">{doc.status}</span>
                             </div>
                             <span className="font-mono text-[10px] md:text-xs font-bold text-slate-500 bg-white/5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-white/5 group-hover:text-slate-300 transition-colors">{doc.code}</span>
                        </div>
                        
                        <div>
                             <h3 className="text-lg md:text-xl font-black text-white mb-1 md:mb-2 group-hover:text-emerald-200 transition-colors tracking-tight">{doc.title}</h3>
                             <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">{doc.desc}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SymbolsTab = () => {
    const [filter, setFilter] = useState('All');
    const categories = ['All', ...Array.from(new Set(AVOK_SYMBOLS.map(s => s.category)))];

    const filtered = filter === 'All' ? AVOK_SYMBOLS : AVOK_SYMBOLS.filter(s => s.category === filter);

    return (
        <div className="w-full h-full animate-in slide-in-from-right-8 fade-in duration-500 pb-20">
             {/* Filter Pills */}
             <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
                {categories.map(c => (
                    <button 
                        key={c} 
                        onClick={() => setFilter(c)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest border transition-all ${filter === c ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                    >
                        {c === 'All' ? 'Все' : c}
                    </button>
                ))}
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filtered.map(item => (
                    <div key={item.id} className="group relative bg-[#0b0c10] rounded-2xl md:rounded-[20px] p-3 md:p-4 border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-1">
                        <div className="aspect-square rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-3 md:mb-4 text-slate-300 group-hover:text-blue-400 transition-colors shadow-inner">
                            <div className="scale-75 md:scale-100">{item.draw()}</div>
                        </div>
                        <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{item.category}</div>
                        <h4 className="text-xs md:text-sm font-bold text-white mb-1 md:mb-2 leading-tight">{item.title}</h4>
                        <p className="text-[9px] md:text-[10px] text-slate-500 leading-relaxed line-clamp-2">{item.desc}</p>
                    </div>
                ))}
             </div>
        </div>
    );
};

const ConverterTab = () => {
    const categories: any = useMemo(() => ({
        pressure: { 
            name: 'Давление', icon: <Activity size={20} />, 
            units: { 'Pa': 1, 'kPa': 1000, 'bar': 100000, 'psi': 6894.76, 'mmHg': 133.322, 'atm': 101325 } 
        },
        flow: { 
            name: 'Расход', icon: <Wind size={20} />, 
            units: { 'm³/h': 1, 'l/s': 3.6, 'l/min': 0.06, 'cfm': 1.699, 'm³/s': 3600 } 
        }, 
        power: { 
            name: 'Мощность', icon: <Zap size={20} />, 
            units: { 'kW': 1, 'W': 0.001, 'kcal/h': 0.001162, 'BTU/h': 0.000293, 'hp': 0.7457 } 
        },
        velocity: { 
            name: 'Скорость', icon: <Gauge size={20} />, 
            units: { 'm/s': 1, 'km/h': 0.27778, 'mph': 0.44704, 'kn': 0.51444, 'ft/min': 0.00508 } 
        },
        temperature: {
            name: 'Температура', icon: <Thermometer size={20} />,
            type: 'temp',
            units: { '°C': 'C', '°F': 'F', 'K': 'K' }
        },
        length: {
            name: 'Длина', icon: <Ruler size={20} />,
            units: { 'm': 1, 'cm': 0.01, 'mm': 0.001, 'ft': 0.3048, 'in': 0.0254, 'yd': 0.9144 }
        },
        area: {
            name: 'Площадь', icon: <Box size={20} />,
            units: { 'm²': 1, 'cm²': 0.0001, 'ft²': 0.092903, 'in²': 0.00064516, 'ha': 10000 }
        },
        mass: {
            name: 'Масса', icon: <Scale size={20} />,
            units: { 'kg': 1, 'g': 0.001, 'lb': 0.453592, 'oz': 0.0283495, 'ton': 1000 }
        },
        volume: {
            name: 'Объем', icon: <Droplets size={20} />,
            units: { 'm³': 1, 'l': 0.001, 'gal': 0.00378541, 'ft³': 0.0283168 }
        }
    }), []);

    const [cat, setCat] = useState('flow');
    const [val1, setVal1] = useState<string>('100'); 
    const [unit1, setUnit1] = useState('m³/h');
    const [unit2, setUnit2] = useState('l/s');

    // Reset units when category changes
    React.useEffect(() => {
        if (categories[cat]) {
            const units = Object.keys(categories[cat].units);
            setUnit1(units[0]);
            setUnit2(units[1] || units[0]);
        }
    }, [cat, categories]);

    const convert = (value: number, fromUnit: string, toUnit: string) => {
        if (!categories[cat]) return 0;

        // Special handling for Temperature
        if (categories[cat].type === 'temp') {
            let celsius = value;
            if (fromUnit === '°F') celsius = (value - 32) * 5/9;
            if (fromUnit === 'K') celsius = value - 273.15;

            if (toUnit === '°C') return celsius;
            if (toUnit === '°F') return celsius * 9/5 + 32;
            if (toUnit === 'K') return celsius + 273.15;
            return celsius;
        }

        // Standard multiplicative conversion
        if (!categories[cat].units[fromUnit] || !categories[cat].units[toUnit]) return 0;
        const inBase = value * categories[cat].units[fromUnit]; 
        return inBase / categories[cat].units[toUnit];
    };
    
    const numVal = parseFloat(val1) || 0;
    const res = convert(numVal, unit1, unit2);

    return (
        <div className="w-full h-full flex flex-col items-center animate-in slide-in-from-right-8 fade-in duration-500">
            {/* Category Tabs */}
            <div className="flex overflow-x-auto w-full pb-4 mb-4 md:mb-8 gap-2 md:gap-3 no-scrollbar px-1">
                {Object.entries(categories).map(([key, data]: any) => (
                    <button 
                        key={key}
                        onClick={() => setCat(key)}
                        className={`
                            relative group flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-300 min-w-[90px] overflow-hidden shrink-0
                            ${cat === key 
                                ? 'bg-[#8b5cf6] border-[#7c3aed] text-white shadow-[0_8px_25px_rgba(139,92,246,0.3)] z-10' 
                                : 'bg-[#121216] border-white/5 text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/10'
                            }
                        `}
                    >
                        <div className={`transition-transform duration-300 ${cat === key ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {data.icon}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest">{data.name}</span>
                    </button>
                ))}
            </div>

            {/* Converter Inputs */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center pt-4">
                {/* Input Card */}
                <div className="bg-[#0b0c10] rounded-[32px] p-1.5 border border-white/5 shadow-2xl relative group focus-within:border-blue-500/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-[32px] pointer-events-none"></div>
                    <div className="bg-[#0b0c10] rounded-[28px] p-6 relative z-10 h-48 flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Входное значение</label>
                             <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                         </div>

                         <input 
                            type="number" 
                            value={val1}
                            onChange={e => setVal1(e.target.value)}
                            className="w-full bg-transparent text-5xl md:text-6xl font-black font-mono text-white outline-none placeholder-slate-700 tracking-tight"
                            placeholder="0"
                         />

                        <div className="relative">
                             <select 
                                value={unit1}
                                onChange={e => setUnit1(e.target.value)}
                                className="w-full appearance-none bg-[#1a1b26] text-blue-400 text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-xl outline-none cursor-pointer hover:bg-[#202230] transition-colors border border-white/5"
                            >
                                {categories[cat] && Object.keys(categories[cat].units).map((u: string) => <option key={u} value={u} className="bg-[#0a0a0f] text-slate-300">{u}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Swap Indicator */}
                <div className="flex justify-center md:rotate-0 rotate-90">
                    <button 
                        onClick={() => {
                            const v1 = val1; const u1 = unit1;
                            setVal1(res.toString()); setUnit1(unit2); setUnit2(u1);
                        }}
                        className="p-3 rounded-full bg-[#1a1b26] border border-white/10 text-slate-500 hover:text-white hover:bg-[#252630] hover:scale-110 active:scale-95 transition-all shadow-xl"
                    >
                        <ArrowRightLeft size={20} />
                    </button>
                </div>

                {/* Output Card */}
                 <div className="bg-[#0b0c10] rounded-[32px] p-1.5 border border-white/5 shadow-2xl relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-[32px] pointer-events-none"></div>
                    <div className="bg-[#0b0c10] rounded-[28px] p-6 relative z-10 h-48 flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Результат</label>
                             <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                         </div>

                         <div className="w-full bg-transparent text-5xl md:text-6xl font-black font-mono text-purple-400 overflow-hidden text-ellipsis whitespace-nowrap tracking-tight">
                             {numVal === 0 ? '0' : Math.abs(res) < 0.001 || Math.abs(res) > 999999 ? res.toExponential(4) : res.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                         </div>

                         <div className="relative">
                             <select 
                                value={unit2}
                                onChange={e => setUnit2(e.target.value)}
                                className="w-full appearance-none bg-[#1a1b26] text-purple-400 text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-xl outline-none cursor-pointer hover:bg-[#202230] transition-colors border border-white/5"
                            >
                                {categories[cat] && Object.keys(categories[cat].units).map((u: string) => <option key={u} value={u} className="bg-[#0a0a0f] text-slate-300">{u}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArticleView = ({ item, onBack }: any) => (
    <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 w-full h-full flex flex-col">
        {/* Sticky Header for Article */}
        <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-white/5 sticky top-0 bg-black/95 backdrop-blur-md z-30 pt-4 px-2">
            <button onClick={onBack} className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all font-bold text-[10px] md:text-xs uppercase tracking-widest border border-white/5 hover:border-white/20 active:scale-95">
                <ChevronLeft size={16}/> <span className="hidden sm:inline">Назад</span>
            </button>
            <div className="flex flex-col">
                <div className="inline-flex items-center gap-2 mb-0.5 md:mb-1">
                     <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">{item.category}</span>
                </div>
                <h1 className="text-lg md:text-2xl lg:text-3xl font-black text-white tracking-tight leading-none">{item.title}</h1>
            </div>
        </div>

        <div className="max-w-4xl mx-auto w-full pb-32 px-2">
            <div className="prose prose-invert prose-lg max-w-none">
                {item.content_blocks.map((block: any, i: number) => {
                    if (block.type === 'text') return <p key={i} className="text-slate-300 mb-6 md:mb-8 leading-relaxed text-base md:text-lg font-light">{block.content}</p>;
                    if (block.type === 'custom_formula') return (
                        <div key={i} className="my-8 md:my-10 relative group">
                            <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
                            <div className="relative bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto">
                                <div className="absolute top-0 left-0 p-3 opacity-20">
                                    <Shapes size={24} className="text-blue-400" />
                                </div>
                                {block.render()}
                            </div>
                        </div>
                    );
                    if (block.type === 'variable_list') return (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 md:mb-10">
                            {block.items.map((item: any, j: number) => (
                                <div key={j} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="min-w-[3rem] h-12 md:h-14 px-3 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 shadow-inner">
                                        {item.symbol}
                                    </div>
                                    <span className="text-xs md:text-sm text-slate-300 font-medium">{item.definition}</span>
                                </div>
                            ))}
                        </div>
                    );
                    return null;
                })}
            </div>
        </div>
    </div>
);

const KnowledgeCenter = ({ onBack, onHome, initialSection = 'wiki' }: any) => {
    const [readingItem, setReadingItem] = useState<any>(null);

    const titles: Record<string, { title: string, icon: any }> = {
        wiki: { title: 'Теория и формулы', icon: <BookOpen size={20} /> },
        norms: { title: 'Нормативы', icon: <ScrollText size={20} /> },
        symbols: { title: 'Обозначения АВОК', icon: <Shapes size={20} /> },
        converter: { title: 'Конвертер', icon: <ArrowRightLeft size={20} /> }
    };

    const currentSection = titles[initialSection] || titles.wiki;

    return (
        <div className="flex w-full min-h-screen bg-[#020205] relative font-sans text-slate-200 overflow-hidden selection:bg-amber-500/30">
            {/* BACKGROUND */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '8s'}} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none"></div>

            {/* FULL CONTENT AREA (No Sidebar) */}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden bg-black/0">
                
                {/* Global Header for Knowledge Section */}
                {!readingItem && (
                    <div className="p-6 pt-safe-top pb-0 z-30 relative shrink-0">
                        <div className="flex items-center justify-between p-4 bg-[#0a0a0f]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <button onClick={onHome} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group">
                                        <Home size={18} />
                                    </button>
                                    <button onClick={onBack} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white group">
                                        <ChevronLeft size={18} />
                                    </button>
                                </div>
                                <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                                        {currentSection.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white leading-none tracking-tight">{currentSection.title}</h2>
                                        <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mt-0.5">Справочник</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-4 relative">
                    {readingItem ? (
                            <ArticleView item={readingItem} onBack={() => setReadingItem(null)} />
                    ) : (
                            <div className="max-w-7xl mx-auto h-full flex flex-col">
                                {initialSection === 'wiki' && <WikiTab onRead={setReadingItem} />}
                                {initialSection === 'norms' && <NormsTab />}
                                {initialSection === 'symbols' && <SymbolsTab />}
                                {initialSection === 'converter' && <ConverterTab />}
                            </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeCenter;