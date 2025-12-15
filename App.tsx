import React, { useState, useEffect } from 'react';
import { Wind, Calculator, BookOpen, ArrowRight, ChevronLeft, Zap, Users, Gauge, Volume2, GitMerge, CloudRain, Thermometer, Flame } from 'lucide-react';
import Simulator from './components/features/simulators/airflow/Simulator';
import VelocityCalculator from './components/features/calculators/velocity/VelocityCalculator';
import HeaterCalculator from './components/features/calculators/heater/HeaterCalculator';
import AirExchangeCalculator from './components/features/calculators/exchange/AirExchangeCalculator';
import PressureLossCalculator from './components/features/calculators/pressure/PressureLossCalculator';
import AcousticCalculator from './components/features/calculators/acoustic/AcousticCalculator';
import MixingCalculator from './components/features/calculators/mixing/MixingCalculator';
import PsychrometryCalculator from './components/features/calculators/psychrometry/PsychrometryCalculator';
import CoolingCalculator from './components/features/calculators/cooling/CoolingCalculator';
import KnowledgeCenter from './components/features/knowledge/KnowledgeCenter';
import SmokeCalculator from './components/features/calculators/smoke/SmokeCalculator';

const App = () => {
    const [appMode, setAppMode] = useState('launcher'); 
    const [launcherSection, setLauncherSection] = useState('main'); 

    useEffect(() => {
        // Init logic if needed
    }, []);

    const LauncherCard = ({ onClick, icon, title, desc, color }: any) => (
        <button 
            onClick={onClick}
            className={`group relative h-64 md:h-80 rounded-[32px] md:rounded-[40px] liquid-glass p-6 md:p-8 flex flex-col items-center justify-center gap-6 md:gap-8 transition-all duration-500 hover:scale-[1.02] border border-white/5 hover:border-${color}-500/30 overflow-hidden active:scale-95`}
        >
            {/* Background Gradient Blob */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-${color}-500/20 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
            
            <div className={`relative z-10 p-5 md:p-6 rounded-3xl bg-${color}-500/10 text-${color}-400 group-hover:bg-${color}-500 group-hover:text-white transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.2)] group-hover:shadow-[0_0_50px_rgba(${color === 'blue' ? '59,130,246' : color === 'emerald' ? '16,185,129' : '245,158,11'},0.6)]`}>
                {icon}
            </div>
            
            <div className="text-center relative z-10 space-y-2">
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{title}</h3>
                <p className="text-xs md:text-sm text-slate-400 font-medium px-4 leading-relaxed">{desc}</p>
            </div>

            <div className={`mt-auto flex items-center gap-2 text-[10px] font-bold text-${color}-400 uppercase tracking-[0.2em] md:opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500`}>
                Открыть <ArrowRight size={14} />
            </div>
        </button>
    );

    const CalcCard = ({ onClick, icon, title, desc, color }: any) => {
        const colorMap: Record<string, string> = {
            emerald: 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white border-emerald-500/30',
            orange: 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white border-orange-500/30',
            blue: 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white border-blue-500/30',
            purple: 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white border-purple-500/30',
            rose: 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white border-rose-500/30',
            cyan: 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white border-cyan-500/30',
            sky: 'bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-white border-sky-500/30',
            red: 'bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white border-red-500/30',
        };

        return (
            <button onClick={onClick} className={`group min-h-[140px] md:h-64 rounded-[24px] md:rounded-[32px] liquid-glass p-5 md:p-8 flex flex-col justify-between text-left hover:scale-[1.02] transition-transform border border-white/5 hover:${colorMap[color].split(' ').pop()}`}>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-colors shadow-lg ${colorMap[color].split(' ').slice(0, 4).join(' ')}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2 leading-tight">{title}</h3>
                    <p className="text-xs md:text-sm text-slate-400 font-medium line-clamp-2 md:line-clamp-none">{desc}</p>
                </div>
            </button>
        );
    };

    const renderMainLauncher = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-7xl animate-in zoom-in-95 duration-700 pb-20 md:pb-0">
            <LauncherCard 
                onClick={() => setLauncherSection('simulators')}
                icon={<Wind className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                title="СИМУЛЯТОР"
                desc="Визуализация физики потоков"
                color="blue"
            />
            <LauncherCard 
                onClick={() => setLauncherSection('calculations')}
                icon={<Calculator className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                title="РАСЧЕТЫ"
                desc="Инженерные калькуляторы"
                color="emerald"
            />
            <LauncherCard 
                onClick={() => setLauncherSection('reference')}
                icon={<BookOpen className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />}
                title="ЗНАНИЯ"
                desc="Нормы, формулы и теория"
                color="amber"
            />
        </div>
    );

    const renderSimulatorsSection = () => (
        <div className="w-full max-w-5xl animate-in slide-in-from-right-8 fade-in duration-500">
             <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10">
                <button onClick={() => setLauncherSection('main')} className="p-3 md:p-4 rounded-2xl liquid-glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24}/>
                </button>
                <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 tracking-tight">СИМУЛЯТОРЫ</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20">
                <CalcCard 
                    onClick={() => setAppMode('simulator')}
                    icon={<Wind size={24} />}
                    title="HVACLAB"
                    desc="Моделирование распределения воздуха в помещении"
                    color="blue"
                />
            </div>
        </div>
    );

    const renderCalculationsSection = () => (
        <div className="w-full max-w-5xl animate-in slide-in-from-right-8 fade-in duration-500 pb-20">
             <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10">
                <button onClick={() => setLauncherSection('main')} className="p-3 md:p-4 rounded-2xl liquid-glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24}/>
                </button>
                <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 tracking-tight">РАСЧЕТЫ</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                <CalcCard onClick={() => setAppMode('calculator')} icon={<Calculator size={24}/>} title="Скорость воздуха" desc="Подбор сечения воздуховода по скорости" color="emerald"/>
                <CalcCard onClick={() => setAppMode('heater-calculator')} icon={<Zap size={24}/>} title="Мощность калорифера" desc="Расчет нагрева и охлаждения воздуха" color="orange"/>
                <CalcCard onClick={() => setAppMode('exchange-calculator')} icon={<Users size={24}/>} title="Расчет воздухообмена" desc="По кратности и количеству людей" color="blue"/>
                <CalcCard onClick={() => setAppMode('pressure-calculator')} icon={<Gauge size={24}/>} title="Потери давления" desc="Аэродинамический расчет на трение и КМС" color="purple"/>
                <CalcCard onClick={() => setAppMode('acoustic-calculator')} icon={<Volume2 size={24}/>} title="Суммирование шума" desc="Расчет общего уровня звукового давления" color="rose"/>
                <CalcCard onClick={() => setAppMode('mixing-calculator')} icon={<GitMerge size={24}/>} title="Смешение воздуха" desc="Расчет температуры смеси двух потоков" color="cyan"/>
                <CalcCard onClick={() => setAppMode('psychrometry-calculator')} icon={<CloudRain size={24}/>} title="Влажный воздух" desc="Психрометрия: ID-диаграмма, энтальпия, точка росы" color="sky"/>
                <CalcCard onClick={() => setAppMode('calc-cooling')} icon={<Thermometer size={24}/>} title="Кондиционирование" desc="Расчет теплопритоков" color="cyan"/>
                <CalcCard onClick={() => setAppMode('smoke-calculator')} icon={<Flame size={24}/>} title="Противодымная защита" desc="Расчет ДУ и подпора воздуха" color="red"/>
            </div>
        </div>
    );

    const renderReferenceSection = () => (
        <div className="w-full max-w-5xl animate-in slide-in-from-right-8 fade-in duration-500">
             <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10">
                <button onClick={() => setLauncherSection('main')} className="p-3 md:p-4 rounded-2xl liquid-glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24}/>
                </button>
                <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 tracking-tight">ЗНАНИЯ</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <CalcCard 
                    onClick={() => setAppMode('reference-wiki')}
                    icon={<BookOpen size={24} />}
                    title="Справочник"
                    desc="Теория, формулы и нормативная документация"
                    color="orange"
                />
            </div>
        </div>
    );

    if (appMode === 'launcher') {
        return (
            <div className="flex min-h-screen bg-[#020205] text-white font-sans overflow-x-hidden items-center justify-center relative">
                {/* AMBIENT BACKGROUND */}
                <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob"></div>
                <div className="absolute top-0 -right-40 w-[600px] h-[600px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-40 left-20 w-[600px] h-[600px] bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

                <div className="z-10 flex flex-col items-center gap-10 md:gap-16 w-full p-4 md:p-8 h-full pt-12 md:pt-8">
                    <div className={`text-center space-y-2 md:space-y-6 transition-all duration-700 ${launcherSection !== 'main' ? 'scale-75 opacity-0 absolute -top-20' : ''}`}>
                         <h1 className="text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-2xl">
                            HVAC<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">LAB</span>
                        </h1>
                        <p className="text-blue-200/60 text-[10px] md:text-sm font-bold tracking-[0.3em] uppercase">Инженерный комплекс</p>
                    </div>

                    <div className="w-full flex justify-center flex-1">
                        {launcherSection === 'main' && renderMainLauncher()}
                        {launcherSection === 'simulators' && renderSimulatorsSection()}
                        {launcherSection === 'calculations' && renderCalculationsSection()}
                        {launcherSection === 'reference' && renderReferenceSection()}
                    </div>
                </div>
            </div>
        );
    }

    const goBack = () => setAppMode('launcher');
    const goHome = () => { setAppMode('launcher'); setLauncherSection('main'); };

    if (appMode === 'simulator') return <Simulator onBack={goBack} onHome={goHome} />;
    if (appMode === 'calculator') return <VelocityCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'heater-calculator') return <HeaterCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'exchange-calculator') return <AirExchangeCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'pressure-calculator') return <PressureLossCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'acoustic-calculator') return <AcousticCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'mixing-calculator') return <MixingCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'psychrometry-calculator') return <PsychrometryCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'calc-cooling') return <CoolingCalculator onBack={goBack} onHome={goHome} />;
    if (appMode === 'reference-wiki') return <KnowledgeCenter initialSection="wiki" onBack={goBack} onHome={goHome} />;
    if (appMode === 'smoke-calculator') return <SmokeCalculator onBack={goBack} onHome={goHome} />;

    return null;
};

export default App;