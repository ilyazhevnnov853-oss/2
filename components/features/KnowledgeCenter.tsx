import React, { useState, useMemo } from 'react';
import { BookOpen, FileText, ScrollText, ArrowRightLeft, ArrowRight, ChevronLeft, Home, Activity, Wind } from 'lucide-react';
import { AppHeader } from '../ui/Shared';
import { ENGINEERING_WIKI, NORMS_DB } from '../../constants';

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

const KnowledgeCenter = ({ onBack, onHome, initialSection = 'wiki' }: any) => {
    const [activeSection, setActiveSection] = useState(initialSection); 
    const [readingItem, setReadingItem] = useState<any>(null);

    const goToNextArticle = () => {
        if (!readingItem) return;
        const idx = ENGINEERING_WIKI.findIndex(i => i.id === readingItem.id);
        if (idx < ENGINEERING_WIKI.length - 1) {
            setReadingItem(ENGINEERING_WIKI[idx + 1]);
        }
    };

    if (readingItem) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#050505] animate-in slide-in-from-bottom-10 fade-in duration-300 z-50">
                 <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0f172a]/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setReadingItem(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all font-bold text-xs uppercase tracking-widest border border-white/5">
                            <ChevronLeft size={16}/> Назад
                        </button>
                        <button onClick={onHome} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Домой">
                            <Home size={18} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-slate-500 hidden md:inline">{readingItem.category}</span>
                        <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                        <button 
                            onClick={goToNextArticle} 
                            disabled={ENGINEERING_WIKI.indexOf(readingItem) === ENGINEERING_WIKI.length - 1}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all font-bold text-xs uppercase tracking-widest"
                        >
                            Далее <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                    <div className="max-w-3xl mx-auto pb-20">
                        <h1 className="text-3xl font-black text-white mb-8">{readingItem.title}</h1>
                        <div className="prose prose-invert prose-lg max-w-none">
                            {readingItem.content_blocks.map((block: any, i: number) => {
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
            </div>
        );
    }

     return (
        <div className="flex w-full min-h-screen bg-[#050505] flex-col lg:flex-row">
            <AppHeader 
                title="Справочник" 
                subtitle="База знаний CCJX"
                icon={<BookOpen size={24} />}
                onBack={onBack}
                onHome={onHome}
            />
            <div className="px-6 pb-4 shrink-0">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto">
                    {[
                        {id: 'wiki', label: 'Теория и Формулы', icon: <FileText size={16}/>},
                        {id: 'norms', label: 'Нормы', icon: <ScrollText size={16}/>},
                        {id: 'converter', label: 'Конвертер', icon: <ArrowRightLeft size={16}/>}
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all min-w-[140px] ${activeSection === tab.id ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                 <div className="max-w-5xl mx-auto">
                    {activeSection === 'wiki' && <WikiTab onRead={setReadingItem} />}
                    {activeSection === 'norms' && <NormsTab />}
                    {activeSection === 'converter' && <ConverterTab />}
                 </div>
            </div>
        </div>
    );
};

export default KnowledgeCenter;