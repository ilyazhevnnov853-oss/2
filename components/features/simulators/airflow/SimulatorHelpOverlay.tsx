import React from 'react';
import { X, Settings2, BarChart3, AppWindow } from 'lucide-react';

interface SimulatorHelpOverlayProps {
    onClose: () => void;
    viewMode: 'side' | 'top' | '3d';
    isPowerOn: boolean;
}

const HelpHotspot = ({ title, description, className, icon, align = 'left' }: any) => (
    <div className={`absolute ${className} flex flex-col gap-3 max-w-[280px] animate-in fade-in zoom-in duration-500 z-[220]`}>
        <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
            <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                {icon}
            </div>
            <div className={`h-px w-12 bg-gradient-to-r from-cyan-500 to-transparent ${align === 'right' ? 'rotate-180' : ''}`}></div>
        </div>
        <div className={`
            p-5 rounded-3xl bg-[#0f1016]/90 backdrop-blur-xl border border-white/10 
            shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-200
            ${align === 'right' ? 'text-right' : 'text-left'}
        `}>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">{title}</h3>
            <p className="text-xs leading-relaxed text-slate-400 font-medium">
                {description}
            </p>
        </div>
    </div>
);

// Individual Button Pointer
const ButtonPointer = ({ title, description, xOffset, height = 80, delay = '0ms' }: any) => (
    <div 
        className="absolute bottom-16 flex flex-col items-center z-[220] pointer-events-none"
        style={{ left: `calc(50% + ${xOffset}px)`, transform: 'translateX(-50%)', animation: `fadeInUp 0.5s ${delay} forwards`, opacity: 0 }}
    >
        <div className="flex flex-col items-center">
            {/* Description Box */}
            <div className="mb-2 p-3 rounded-xl bg-[#0f1016]/95 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] w-40 text-center relative">
                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">{title}</h3>
                <p className="text-[9px] text-slate-300 leading-snug">{description}</p>
                {/* Connector Dot at bottom of box */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0f1016] rotate-45 border-b border-r border-white/10"></div>
            </div>
            
            {/* Vertical Line */}
            <div className="w-px bg-gradient-to-b from-cyan-500/50 to-cyan-500" style={{ height: `${height}px` }}></div>
            
            {/* Glow Dot at target */}
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse"></div>
        </div>
        <style>{`
            @keyframes fadeInUp {
                from { opacity: 0; transform: translate(-50%, 20px); }
                to { opacity: 1; transform: translate(-50%, 0); }
            }
        `}</style>
    </div>
);

const SimulatorHelpOverlay: React.FC<SimulatorHelpOverlayProps> = ({ onClose, viewMode, isPowerOn }) => {
    
    // --- Layout Calculation Estimates (px from center) ---
    // Assuming standard button width ~48px and gap ~4px
    
    // View Group is always centered around 0
    // [Side] [Top] [3D]
    // Side: -90, Top: 0, 3D: +90
    
    // Power Group (Left)
    // Sep: -140
    // If Power On (Play visible): Play (-170), Power (-220)
    // If Power Off: Power (-170)
    
    // Tools Group (Right)
    // Sep: +140
    
    // If Top View: Placement Group [Single][Multi] takes ~90px
    // Sep moves to +240? 
    // Let's refine based on "Top" adding Placement buttons.
    // Top View Layout: [Side][Top][3D] | [Single][Multi] | Tools...
    // Side(-90), Top(0), 3D(+90) -> Sep(+140)
    // Single(+170), Multi(+210)
    // Tools start after Multi -> +250 roughly
    
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-[#020205]/80 backdrop-blur-md transition-opacity duration-500"
                onClick={onClose}
            />

            {/* Blocker */}
            <div className="absolute inset-0 z-[215] cursor-default" onClick={onClose}></div>

            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-8 right-8 z-[230] group flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
            >
                <span className="text-xs font-bold text-white uppercase tracking-widest">Закрыть справку</span>
                <div className="p-1 rounded-full bg-white text-black group-hover:rotate-90 transition-transform duration-300">
                    <X size={16} />
                </div>
            </button>

            {/* Content Container */}
            <div className="relative z-[220] pointer-events-none w-full h-full max-w-[1920px] mx-auto">
                
                {/* --- PANELS --- */}
                <HelpHotspot 
                    className="top-32 left-4 lg:left-96"
                    icon={<Settings2 size={24} />}
                    title="Настройка"
                    description="Здесь вы выбираете модели диффузоров, задаете размеры помещения, температуры и расход воздуха. Добавление устройств происходит внизу этой панели."
                />

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700 delay-100 opacity-60">
                    <div className="w-64 h-64 rounded-full border border-dashed border-white/10 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                        <div className="w-48 h-48 rounded-full border border-dashed border-white/10" />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <AppWindow size={32} className="text-white/30 mb-4" />
                        <h2 className="text-2xl font-black text-white/50 tracking-tight">Рабочая область</h2>
                    </div>
                </div>

                <HelpHotspot 
                    className="top-32 right-4 lg:right-96"
                    align="right"
                    icon={<BarChart3 size={24} />}
                    title="Результаты"
                    description="Анализ эффективности в реальном времени. Здесь отображаются скорости в рабочей зоне (V0), уровень шума, дальнобойность струи и процент комфортного покрытия."
                />

                {/* --- BUTTON POINTERS (Specific & Staggered) --- */}
                
                {/* 1. POWER GROUP (Left) */}
                <ButtonPointer 
                    title="Питание" 
                    description="Запуск и остановка расчета физики."
                    xOffset={isPowerOn ? -220 : -180} 
                    height={120} 
                    delay="100ms" 
                />
                
                {isPowerOn && (
                    <ButtonPointer 
                        title="Пауза" 
                        description="Временная остановка анимации частиц."
                        xOffset={-170} 
                        height={80} 
                        delay="150ms" 
                    />
                )}

                {/* 2. VIEW GROUP (Center) */}
                <ButtonPointer 
                    title="Срез (Side)" 
                    description="Вид сбоку. Показывает профиль струи."
                    xOffset={-90} 
                    height={60} 
                    delay="200ms" 
                />
                <ButtonPointer 
                    title="План (Top)" 
                    description="Вид сверху. Редактирование расположения."
                    xOffset={0} 
                    height={90} 
                    delay="250ms" 
                />
                <ButtonPointer 
                    title="3D Вид" 
                    description="Изометрия. Визуализация в объеме."
                    xOffset={90} 
                    height={60} 
                    delay="300ms" 
                />

                {/* 3. PLACEMENT GROUP (If Top View) */}
                {viewMode === 'top' && (
                    <>
                        <ButtonPointer 
                            title="Одиночный" 
                            description="Один диффузор в центре."
                            xOffset={170} 
                            height={110} 
                            delay="350ms" 
                        />
                        <ButtonPointer 
                            title="Мульти" 
                            description="Несколько устройств."
                            xOffset={210} 
                            height={80} 
                            delay="400ms" 
                        />
                    </>
                )}

                {/* 4. TOOLS GROUP (Right) */}
                {/* Adjust offsets based on whether placement buttons are visible */}
                {isPowerOn && (
                    <>
                        <ButtonPointer 
                            title="Сетка" 
                            description="Линейки и направляющие."
                            xOffset={viewMode === 'top' ? 260 : 160} 
                            height={50} 
                            delay="450ms" 
                        />
                        {viewMode === 'top' && (
                            <>
                                <ButtonPointer 
                                    title="Привязка" 
                                    description="Магнитное выравнивание по сетке."
                                    xOffset={310} 
                                    height={100} 
                                    delay="500ms" 
                                />
                                <ButtonPointer 
                                    title="Теплокарта" 
                                    description="Зоны комфорта и сквозняков."
                                    xOffset={360} 
                                    height={140} 
                                    delay="550ms" 
                                />
                            </>
                        )}
                        <ButtonPointer 
                            title="Экспорт" 
                            description="Сохранить скриншот расчета."
                            xOffset={viewMode === 'top' ? 410 : 210} 
                            height={70} 
                            delay="600ms" 
                        />
                    </>
                )}

            </div>
        </div>
    );
};

export default SimulatorHelpOverlay;
