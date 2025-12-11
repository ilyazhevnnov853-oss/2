import React, { useState, useEffect } from 'react';
import { Wind, Calculator, BookOpen, ArrowRight, FileText, ScrollText, ArrowRightLeft, ChevronLeft } from 'lucide-react';
import Simulator from './components/features/Simulator';
import VelocityCalculator from './components/features/VelocityCalculator';
import KnowledgeCenter from './components/features/KnowledgeCenter';

const App = () => {
    const [appMode, setAppMode] = useState('launcher'); 
    const [launcherSection, setLauncherSection] = useState('main'); 

    useEffect(() => {
        // Ensure Tailwind script is present
        if (!document.getElementById('tailwind-script')) {
            const script = document.createElement('script');
            script.id = 'tailwind-script';
            script.src = "https://cdn.tailwindcss.com";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    const renderMainLauncher = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-in zoom-in-95 duration-500">
            <button 
                onClick={() => setLauncherSection('simulators')}
                className="group relative h-80 rounded-[32px] glass-panel p-8 flex flex-col items-center justify-center gap-8 hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20 hover:border-blue-500/30"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50">
                    <Wind size={48} strokeWidth={1.5} />
                </div>
                <div className="text-center relative z-10">
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">СИМУЛЯТОРЫ</h3>
                    <p className="text-sm text-slate-400 px-4 leading-relaxed">Визуализация физических процессов и моделирование потоков</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    Открыть раздел <ArrowRight size={14} />
                </div>
            </button>

            <button 
                onClick={() => setLauncherSection('calculations')}
                className="group relative h-80 rounded-[32px] glass-panel p-8 flex flex-col items-center justify-center gap-8 hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-emerald-500/30"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6 rounded-full bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-lg group-hover:shadow-emerald-500/50">
                    <Calculator size={48} strokeWidth={1.5} />
                </div>
                <div className="text-center relative z-10">
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">РАСЧЕТЫ</h3>
                    <p className="text-sm text-slate-400 px-4 leading-relaxed">Инженерные калькуляторы и быстрый подбор оборудования</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    Открыть раздел <ArrowRight size={14} />
                </div>
            </button>

            <button 
                onClick={() => setLauncherSection('reference')}
                className="group relative h-80 rounded-[32px] glass-panel p-8 flex flex-col items-center justify-center gap-8 hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20 hover:border-amber-500/30"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6 rounded-full bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-lg group-hover:shadow-amber-500/50">
                    <BookOpen size={48} strokeWidth={1.5} />
                </div>
                <div className="text-center relative z-10">
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">СПРАВОЧНИК</h3>
                    <p className="text-sm text-slate-400 px-4 leading-relaxed">База знаний, нормы, теория и конвертер единиц</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    Открыть раздел <ArrowRight size={14} />
                </div>
            </button>
        </div>
    );

    const renderSimulatorsSection = () => (
        <div className="w-full animate-in slide-in-from-right-8 fade-in duration-300">
             <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setLauncherSection('main')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24}/>
                </button>
                <h2 className="text-3xl font-black text-white tracking-tight">СИМУЛЯТОРЫ</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                    onClick={() => setAppMode('simulator')}
                    className="group relative h-64 rounded-[32px] glass-panel p-6 flex flex-col items-start justify-between hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/30"
                >
                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Wind size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Симулятор Потока</h3>
                        <p className="text-xs text-slate-400">Визуализация струй и дальнобойности</p>
                    </div>
                     <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                        <ArrowRight size={20}/>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderCalculationsSection = () => (
        <div className="w-full animate-in slide-in-from-right-8 fade-in duration-300">
             <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setLauncherSection('main')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24}/>
                </button>
                <h2 className="text-3xl font-black text-white tracking-tight">РАСЧЕТЫ</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <button 
                    onClick={() => setAppMode('calculator')}
                    className="group relative h-64 rounded-[32px] glass-panel p-6 flex flex-col items-start justify-between hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/30"
                >
                    <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Calculator size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Калькулятор Скорости</h3>
                        <p className="text-xs text-slate-400">Быстрый подбор сечений</p>
                    </div>
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400">
                        <ArrowRight size={20}/>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderReferenceSection = () => (
        <div className="w-full animate-in slide-in-from-right-8 fade-in duration-300">
             <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setLauncherSection('main')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24}/>
                </button>
                <h2 className="text-3xl font-black text-white tracking-tight">СПРАВОЧНИК</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <button 
                    onClick={() => setAppMode('reference-wiki')}
                    className="group relative h-60 rounded-[28px] glass-panel p-6 flex flex-col items-start justify-between hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/30"
                >
                    <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Теория и Формулы</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Инженерная база знаний</p>
                    </div>
                </button>

                 <button 
                    onClick={() => setAppMode('reference-norms')}
                    className="group relative h-60 rounded-[28px] glass-panel p-6 flex flex-col items-start justify-between hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/30"
                >
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <ScrollText size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Нормы</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">СП и ГОСТ</p>
                    </div>
                </button>

                 <button 
                    onClick={() => setAppMode('reference-converter')}
                    className="group relative h-60 rounded-[28px] glass-panel p-6 flex flex-col items-start justify-between hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/30"
                >
                    <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <ArrowRightLeft size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Конвертер</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Единиц</p>
                    </div>
                </button>
            </div>
        </div>
    );

    if (appMode === 'launcher') {
        return (
            <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden items-center justify-center relative">
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse" style={{animationDelay: '1s'}} />
                </div>

                <div className="z-10 flex flex-col items-center gap-12 w-full max-w-7xl p-8">
                    <div className={`text-center space-y-4 transition-all duration-500 ${launcherSection !== 'main' ? 'scale-75 opacity-50 absolute top-8' : ''}`}>
                        <div className="flex items-center justify-center gap-4 mb-2">
                            <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 p-4 rounded-2xl shadow-2xl shadow-blue-500/30">
                                <Wind className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-xl">
                            AeroFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Elite</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Инженерный комплекс</p>
                    </div>

                    <div className={`w-full transition-all duration-500 ${launcherSection !== 'main' ? 'mt-32' : ''}`}>
                        {launcherSection === 'main' && renderMainLauncher()}
                        {launcherSection === 'simulators' && renderSimulatorsSection()}
                        {launcherSection === 'calculations' && renderCalculationsSection()}
                        {launcherSection === 'reference' && renderReferenceSection()}
                    </div>
                    
                    <div className="fixed bottom-6 text-xs text-slate-600 font-mono">v4.1 • Updated Interface</div>
                </div>
            </div>
        );
    }

    const goBack = () => setAppMode('launcher');
    const goHome = () => { setAppMode('launcher'); setLauncherSection('main'); };

    if (appMode === 'simulator') return <Simulator onBack={goBack} onHome={goHome} />;
    if (appMode === 'calculator') return <VelocityCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'reference-wiki') return <KnowledgeCenter initialSection="wiki" onBack={goBack} onHome={goHome} />;
    if (appMode === 'reference-norms') return <KnowledgeCenter initialSection="norms" onBack={goBack} onHome={goHome} />;
    if (appMode === 'reference-converter') return <KnowledgeCenter initialSection="converter" onBack={goBack} onHome={goHome} />;

    return null;
};

export default App;