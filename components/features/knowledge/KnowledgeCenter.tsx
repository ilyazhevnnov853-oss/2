import React, { useState, useMemo } from 'react';
import { BookOpen, FileText, ScrollText, ArrowRightLeft, ArrowRight, ChevronLeft, Home, Activity, Wind, Menu, X } from 'lucide-react';
import { ENGINEERING_WIKI, NORMS_DB } from '../../../constants';

const WikiTab = ({ onRead }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-right-8 fade-in duration-500 pb-20">
        {ENGINEERING_WIKI.map((item, idx) => (
            <button 
                key={idx}
                onClick={() => onRead(item)}
                className="group glass-panel p-6 rounded-2xl border border-white/5 hover:bg-white/10 text-left transition-all active:scale-[0.99] relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FileText size={64}/>
                </div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                        {item.category}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">{item.title}</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                        Читать <ArrowRight size={14}/>
                    </div>
                </div>
            </button>
        ))}
    </div>
);

const NormsTab = () => (
    <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-right-8 fade-in pb-20">
        {NORMS_DB.map((doc, i) => (
            <div key={i} className="glass-panel p-5 rounded-xl border border-white/5 hover:bg-white/5 transition-all cursor-default">
                <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 uppercase tracking-wider">
                        {doc.status}
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">{doc.code}</span>
                </div>
                <h4 className="text-white font-bold text-sm mb-2">{doc.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2">{doc.desc}</p>
            </div>
        ))}
    </div>
);

const ConverterTab = () => {
    const categories: any = useMemo(() => ({
        pressure: { name: 'Давление', icon: <Activity/>, units: { 'Pa': 1, 'kPa': 1000, 'bar': 100000, 'psi': 6894.76, 'mmHg': 133.322 } },
        flow: { name: 'Расход', icon: <Wind/>, units: { 'm3/h': 1, 'l/s': 3.6, 'l/min': 0.06, 'cfm': 1.699 } }, 
        power: { name: 'Мощность', icon: <Activity/>, units: { 'kW': 1, 'W': 0.001, 'kcal/h': 0.001162, 'BTU/h': 0.000293 } },
        velocity: { name: 'Скорость', icon: <Wind/>, units: { 'm/s': 1, 'km/h': 0.27778, 'fpm': 0.00508 } },
    }), []);

    const [cat, setCat] = useState('flow');
    const [val1, setVal1] = useState(100);
    const [unit1, setUnit1] = useState('m3/h');
    const [unit2, setUnit2] = useState('l/s');

    const convert = (value: number, fromUnit: string, toUnit: string) => {
        if (!categories[cat] || !categories[cat].units[fromUnit] || !categories[cat].units[toUnit]) return 0;
        const inBase = value * categories[cat].units[fromUnit]; 
        return inBase / categories[cat].units[toUnit];
    };
    
    const res = convert(val1, unit1, unit2);

    return (
        <div className="max-w-2xl mx-auto animate-in slide-in-from-right-8 fade-in pb-20">
            <div className="grid grid-cols-4 gap-2 mb-8">
                {Object.entries(categories).map(([key, data]: any) => (
                    <button 
                        key={key}
                        onClick={() => setCat(key)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${cat === key ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        <div className="scale-75">{data.icon}</div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{data.name}</span>
                    </button>
                ))}
            </div>
            <div className="glass-panel p-8 rounded-[32px] border border-white/10 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 block">Входное значение</label>
                        <div className="bg-black/30 p-2 rounded-2xl border border-white/10 flex flex-col gap-2">
                            <input 
                                type="number" 
                                value={val1}
                                onChange={e => setVal1(Number(e.target.value))}
                                className="w-full bg-transparent text-3xl font-mono font-bold text-white outline-none px-2 py-1"
                            />
                            <div className="h-px bg-white/5 w-full"></div>
                            <select 
                                value={unit1}
                                onChange={e => setUnit1(e.target.value)}
                                className="w-full bg-transparent text-xs font-bold text-purple-400 uppercase outline-none cursor-pointer px-2 py-1"
                            >
                                {categories[cat] && Object.keys(categories[cat].units).map((u: string) => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-full text-slate-500 rotate-90 md:rotate-0">
                        <ArrowRightLeft size={20}/>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 block">Результат</label>
                        <div className="bg-purple-500/5 p-2 rounded-2xl border border-purple-500/20 flex flex-col gap-2 relative">
                            <div className="w-full bg-transparent text-3xl font-mono font-bold text-purple-400 px-2 py-1 overflow-hidden text-ellipsis">
                                {res.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </div>
                            <div className="h-px bg-white/5 w-full"></div>
                            <select 
                                value={unit2}
                                onChange={e => setUnit2(e.target.value)}
                                className="w-full bg-transparent text-xs font-bold text-purple-500 uppercase outline-none cursor-pointer px-2 py-1"
                            >
                                {categories[cat] && Object.keys(categories[cat].units).map((u: string) => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArticleView = ({ item, onBack }: any) => (
    <div className="animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all font-bold text-xs uppercase tracking-widest border border-white/5">
                <ChevronLeft size={16}/> Назад
            </button>
            <div className="h-px flex-1 bg-white/5"></div>
            <span className="text-[10px] font-bold uppercase text-slate-500">{item.category}</span>
        </div>

        <div className="max-w-3xl mx-auto pb-20">
            <h1 className="text-3xl font-black text-white mb-8">{item.title}</h1>
            <div className="prose prose-invert prose-lg max-w-none">
                {item.content_blocks.map((block: any, i: number) => {
                    if (block.type === 'text') return <p key={i} className="text-slate-300 mb-6 leading-relaxed">{block.content}</p>;
                    if (block.type === 'custom_formula') return (
                        <div key={i} className="my-8 p-6 bg-white/5 border border-white/10 rounded-2xl flex justify-center overflow-x-auto">
                            {block.render()}
                        </div>
                    );
                    if (block.type === 'variable_list') return (
                        <div key={i} className="grid grid-cols-1 gap-2 mb-8 bg-black/20 p-4 rounded-xl border border-white/5">
                            {block.items.map((item: any, j: number) => (
                                <div key={j} className="flex items-baseline justify-between text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                    <span className="font-serif italic font-bold text-slate-200">{item.symbol}</span>
                                    <span className="text-slate-400 text-right">{item.definition}</span>
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
    const [activeSection, setActiveSection] = useState(initialSection); 
    const [readingItem, setReadingItem] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSectionChange = (id: string) => {
        setActiveSection(id);
        setReadingItem(null);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="flex w-full min-h-screen bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-blue-500/30">
            {/* AMBIENT BACKGROUND */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none"></div>

            {/* LEFT PANEL (Navigation) */}
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
                            
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 shadow-lg shadow-amber-500/20 text-white">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white leading-none tracking-tight">Справочник</h2>
                                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">База знаний CCJX</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="p-5 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                         {[
                            {id: 'wiki', label: 'Теория и Формулы', icon: <FileText size={18}/>},
                            {id: 'norms', label: 'Нормы', icon: <ScrollText size={18}/>},
                            {id: 'converter', label: 'Конвертер', icon: <ArrowRightLeft size={18}/>}
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => handleSectionChange(tab.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border group relative overflow-hidden ${activeSection === tab.id ? 'bg-amber-600 text-white border-amber-500/50 shadow-[0_8px_20px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'}`}
                            >
                                <div className={`p-2 rounded-lg transition-colors ${activeSection === tab.id ? 'bg-white/20' : 'bg-black/20 group-hover:bg-white/10'}`}>
                                    {tab.icon}
                                </div>
                                <span className="font-bold text-xs uppercase tracking-widest flex-1 text-left">{tab.label}</span>
                                {activeSection === tab.id && <ChevronLeft className="rotate-180" size={16}/>}
                            </button>
                        ))}
                    </div>
                 </div>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden p-4 pl-0">
                <div className="flex-1 rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border border-white/5 ring-1 ring-white/5 group flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none"></div>
                    
                    {/* Mobile Menu Toggle */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden absolute top-4 left-4 z-30 p-3 rounded-full bg-blue-600 text-white shadow-lg">
                        <Menu size={20} />
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                        {readingItem ? (
                             <ArticleView item={readingItem} onBack={() => setReadingItem(null)} />
                        ) : (
                             <div className="max-w-5xl mx-auto pt-10">
                                {activeSection === 'wiki' && <WikiTab onRead={setReadingItem} />}
                                {activeSection === 'norms' && <NormsTab />}
                                {activeSection === 'converter' && <ConverterTab />}
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeCenter;