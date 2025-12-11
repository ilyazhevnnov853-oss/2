import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Power, Wind, CircleDot, Fan, Thermometer, 
  Download, AlertTriangle, LayoutList, RotateCcw, Search, SlidersHorizontal,
  Menu, ArrowUpToLine, ScanLine, Calculator, CheckCircle2, XCircle, X, Home, ChevronLeft,
  Layers, PlusCircle, Trash2, GripHorizontal, Copy
} from 'lucide-react';

import { SPECS, DIFFUSER_CATALOG } from '../../constants';
import { calculatePerformance, useScientificSimulation, calculateWorkzoneVelocityAndCoverage, calculateVelocityField, analyzeCoverage } from '../../hooks/useSimulation';
import DiffuserCanvas from './DiffuserCanvas';
import { SectionHeader, GlassMetric, GlassButton, GlassSlider } from '../ui/Shared';
import { PlacedDiffuser, PerformanceResult } from '../../types';

const Simulator = ({ onBack, onHome }: any) => {
    const [viewSize, setViewSize] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPowerOn, setIsPowerOn] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<'side' | 'top'>('side');
    const [placedDiffusers, setPlacedDiffusers] = useState<PlacedDiffuser[]>([]);
    const [selectedDiffuserId, setSelectedDiffuserId] = useState<string | null>(null);
    const [dragPreview, setDragPreview] = useState<{x: number, y: number, width: number, height: number} | null>(null);
    const [velocityField, setVelocityField] = useState<number[][]>([]);
    const [coverageAnalysis, setCoverageAnalysis] = useState({
        totalCoverage: 0,
        avgVelocity: 0,
        comfortZones: 0,
        warningZones: 0,
        draftZones: 0,
        deadZones: 0
    });

    // Selection Tab States
    const [calcVolume, setCalcVolume] = useState<number | string>(300);
    const [calcFlowType, setCalcFlowType] = useState('vertical');
    const [calcResults, setCalcResults] = useState<any[]>([]);
    
    // Limits
    const [limitVelocity, setLimitVelocity] = useState<number | string>(5.0);
    const [limitNoise, setLimitNoise] = useState<number | string>(35);

    // Params
    const [params, setParams] = useState({
        diameter: 160 as string | number, volume: 250,
        temperature: 20, roomTemp: 24,
        modelId: 'dpu-v', modeIdx: 0,
        roomHeight: 3.5,
        roomWidth: 6.0,
        roomLength: 6.0,
        diffuserHeight: 3.5,
        isCeilingMounted: true,
        workZoneHeight: 1.8
    });

    const [sizeSelected, setSizeSelected] = useState(true);

    const currentDiffuser = DIFFUSER_CATALOG.find(d => d.id === params.modelId)!;
    const currentMode = currentDiffuser.modes[params.modeIdx] || currentDiffuser.modes[0];
    
    // Main Physics for Side View (Active Selection)
    const physics = useScientificSimulation(
        params.modelId, currentMode.flowType, 
        params.diameter, params.volume, params.temperature, params.roomTemp,
        params.diffuserHeight, 
        params.workZoneHeight
    );

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            window.requestAnimationFrame(() => {
                if (!Array.isArray(entries) || !entries.length) return;
                const { width, height } = entries[0].contentRect;
                setViewSize({ w: width * 2, h: height * 2 }); 
            });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);
    
    // Расчет поля скоростей при изменении диффузоров
    useEffect(() => {
        if (viewMode !== 'top' || placedDiffusers.length === 0) {
            setVelocityField([]);
            return;
        }
        
        console.log('[VelocityField] Calculating for', placedDiffusers.length, 'diffusers');
        const field = calculateVelocityField(
            params.roomWidth,
            params.roomLength,
            placedDiffusers,
            params.diffuserHeight,
            params.workZoneHeight,
            0.5 // gridStep
        );
        console.log('[VelocityField] Result:', field.length, 'rows,', field[0]?.length, 'cols');
        
        setVelocityField(field);
    }, [placedDiffusers, params.roomWidth, params.roomLength, params.diffuserHeight, params.workZoneHeight, viewMode]);
    
    // Анализ покрытия при изменении поля скоростей
    useEffect(() => {
        const analysis = analyzeCoverage(velocityField);
        setCoverageAnalysis(analysis);
    }, [velocityField]);
    
    // Обработка клавиатуры (Delete, Ctrl+D)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== 'top') return;
            
            // Delete - удаление выбранного диффузора
            if (e.key === 'Delete' && selectedDiffuserId) {
                e.preventDefault();
                removeDiffuser(selectedDiffuserId);
            }
            
            // Ctrl+D - дублирование выбранного диффузора
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedDiffuserId) {
                e.preventDefault();
                duplicateDiffuser(selectedDiffuserId);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, selectedDiffuserId, placedDiffusers]);

    const togglePower = () => {
        setIsPowerOn(!isPowerOn);
        setIsPlaying(true);
    };

    const handleReset = () => {
        if (activeTab === 'overview') {
            setParams({
                diameter: 100, 
                volume: 30,    
                temperature: 20, 
                roomTemp: 24,
                modelId: 'dpu-v', 
                modeIdx: 0,
                roomHeight: 3.5,
                roomWidth: 6.0,
                roomLength: 6.0,
                diffuserHeight: 3.5,
                isCeilingMounted: true,
                workZoneHeight: 1.8
            });
            setSizeSelected(true);
            setPlacedDiffusers([]);
            if (!isPowerOn) setIsPowerOn(true);
            setIsPlaying(true);
        } else {
            setCalcVolume('');
            setLimitVelocity('');
            setLimitNoise('');
            setCalcResults([]);
        }
    };

    const handleModelChange = (id: string) => {
        const validDiameter = Object.keys(SPECS).find(d => {
            const val = !isNaN(Number(d)) ? Number(d) : d;
            const model = DIFFUSER_CATALOG.find(m => m.id === id);
            if (!model) return false;
            return calculatePerformance(id, model.modes[0].flowType, val, 100) !== null;
        });

        const newDiameter = validDiameter ? (!isNaN(Number(validDiameter)) ? Number(validDiameter) : validDiameter) : '';
        
        let newVol = params.volume;
        if (newDiameter && SPECS[newDiameter]) {
             const { min, max } = SPECS[newDiameter];
             if (newVol < min) newVol = min;
             if (newVol > max) newVol = max;
        }

        setParams(p => ({
            ...p, 
            modelId: id, 
            modeIdx: 0, 
            diameter: newDiameter,
            volume: newVol
        }));
        setSizeSelected(!!newDiameter);
    };

    const handleSizeSelect = (d: string | number) => {
        let newVol = params.volume;
        if (d && SPECS[d]) {
             const { min, max } = SPECS[d];
             if (newVol < min) newVol = min;
             if (newVol > max) newVol = max;
        }
        setParams(p => ({ ...p, diameter: d, volume: newVol }));
        setSizeSelected(true);
    };

    const handleRoomHeightChange = (val: number) => {
        const rh = Math.max(1, Math.min(20, val));
        setParams(p => {
            let dh = p.diffuserHeight;
            if (p.isCeilingMounted) {
                dh = rh;
            } else if (dh > rh) {
                dh = rh;
            }
            return { ...p, roomHeight: rh, diffuserHeight: dh };
        });
    };

    const handleDiffuserHeightChange = (val: number) => {
        const dh = Math.max(0, Math.min(params.roomHeight, val));
        setParams(p => ({ ...p, diffuserHeight: dh, isCeilingMounted: dh === p.roomHeight }));
    };

    const toggleCeilingMount = () => {
        setParams(p => ({
            ...p,
            isCeilingMounted: !p.isCeilingMounted,
            diffuserHeight: !p.isCeilingMounted ? p.roomHeight : p.diffuserHeight
        }));
    };

    const handleCalculate = () => {
        if (!calcVolume) return;

        const groupedResults: any[] = [];
        const allSizes = Object.keys(SPECS).sort((a,b) => {
             const nA = parseInt(a); const nB = parseInt(b);
             if (isNaN(nA)) return 1; if (isNaN(nB)) return -1;
             return nA - nB;
        });
        
        DIFFUSER_CATALOG.forEach(model => {
            const seriesResults: any[] = [];
            // Assuming 0 mode for simplicity in this version
            const targetModeIdx = 0; 

            if (model.modes[targetModeIdx]) {
                const mode = model.modes[targetModeIdx];
                allSizes.forEach(d => {
                    const safeD = !isNaN(Number(d)) ? Number(d) : d;
                    const perf = calculatePerformance(model.id, mode.flowType, safeD, Number(calcVolume));
                    if (perf) {
                        seriesResults.push({ diameter: safeD, ...perf });
                    }
                });
                if (seriesResults.length > 0) {
                    groupedResults.push({ model: model, modeIdx: targetModeIdx, results: seriesResults });
                }
            }
        });
        setCalcResults(groupedResults);
    };

    const applyResult = (modelId: string, modeIdx: number, diameter: string | number) => {
        const safeDiameter = isNaN(Number(diameter)) ? diameter : Number(diameter);
        setParams(p => ({ 
            ...p, 
            modelId, 
            modeIdx, 
            diameter: safeDiameter, 
            volume: Number(calcVolume) 
        }));
        setSizeSelected(true);
        if (!isPowerOn) setIsPowerOn(true);
    };

    // --- Top View Logic ---
    const calculatePlacedDiffuserPerformance = (pd: PlacedDiffuser): PerformanceResult => {
        const model = DIFFUSER_CATALOG.find(m => m.id === pd.modelId);
        const flowType = model ? model.modes[0].flowType : 'vertical';
        
        const perf = calculatePerformance(pd.modelId, flowType, pd.diameter, pd.volume);
        
        if (!perf || !perf.spec) {
             const fallbackSpec = SPECS[pd.diameter] || { f0: 0, A: 0, B: 0, C: 0, D: 0, min: 0, max: 0 };
             return { v0:0, pressure:0, noise:0, throwDist:0, spec: fallbackSpec, workzoneVelocity:0, coverageRadius:0 };
        }

        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            perf.v0 || 0,
            perf.spec.A,
            params.diffuserHeight, 
            params.workZoneHeight,
            flowType
        );

        return {
            ...perf,
            v0: perf.v0 || 0,
            pressure: perf.pressure || 0,
            noise: perf.noise || 0,
            throwDist: perf.throwDist || 0,
            workzoneVelocity,
            coverageRadius,
            spec: perf.spec
        };
    };

    const addDiffuserToPlan = (xPos?: number, yPos?: number) => {
        if (!sizeSelected || physics.error) return;
        
        // Auto increment index
        const nextIndex = placedDiffusers.length > 0 
            ? Math.max(...placedDiffusers.map(d => d.index)) + 1 
            : 1;

        const newDiffuser: PlacedDiffuser = {
            id: `d-${Date.now()}`,
            index: nextIndex,
            x: xPos !== undefined ? xPos : params.roomWidth / 2,
            y: yPos !== undefined ? yPos : params.roomLength / 2,
            modelId: params.modelId,
            diameter: params.diameter,
            volume: params.volume,
            performance: physics
        };
        
        newDiffuser.performance = calculatePlacedDiffuserPerformance(newDiffuser);
        
        setPlacedDiffusers([...placedDiffusers, newDiffuser]);
        setSelectedDiffuserId(newDiffuser.id);
    };

    const duplicateDiffuser = (id: string) => {
        const original = placedDiffusers.find(d => d.id === id);
        if (!original) return;
        
        const nextIndex = placedDiffusers.length > 0 
            ? Math.max(...placedDiffusers.map(d => d.index)) + 1 
            : 1;

        // Offset new position slightly (0.5m)
        let newX = original.x + 0.5;
        let newY = original.y + 0.5;
        
        // Check bounds and bounce back if outside
        if (newX > params.roomWidth - 0.2) newX = Math.max(0, original.x - 0.5);
        if (newY > params.roomLength - 0.2) newY = Math.max(0, original.y - 0.5);

        const newDiffuser: PlacedDiffuser = {
            ...original,
            id: `d-${Date.now()}`,
            index: nextIndex,
            x: newX,
            y: newY,
        };
        
        setPlacedDiffusers([...placedDiffusers, newDiffuser]);
        setSelectedDiffuserId(newDiffuser.id);
    };

    const updateDiffuserPosition = (id: string, x: number, y: number) => {
        setPlacedDiffusers(prev => prev.map(d => 
            d.id === id ? { ...d, x, y } : d
        ));
    };

    const removeDiffuser = (id: string) => {
        setPlacedDiffusers(prev => prev.filter(d => d.id !== id));
        if (selectedDiffuserId === id) setSelectedDiffuserId(null);
    };

    // Update all diffusers when room params change
    useEffect(() => {
        setPlacedDiffusers(prev => prev.map(d => {
            const updatedPerf = calculatePlacedDiffuserPerformance(d);
            return { ...d, performance: updatedPerf };
        }));
    }, [params.diffuserHeight, params.workZoneHeight, params.roomHeight]);


    const handleExport = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const dpr = 2;
        const padding = 40;
        const headerH = 100;
        const footerH = 60;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        
        const exCanvas = document.createElement('canvas');
        exCanvas.width = (width + padding * 2) * dpr;
        exCanvas.height = (headerH + height + footerH + padding * 2) * dpr;
        const ctx = exCanvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#050505'; ctx.fillRect(0,0, exCanvas.width, exCanvas.height);
        const grad = ctx.createLinearGradient(0,0, exCanvas.width, exCanvas.height);
        grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad; ctx.fillRect(0,0, exCanvas.width, exCanvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText(`AeroFlow Elite Report`, padding, padding + 30);
        ctx.fillStyle = '#94a3b8'; ctx.font = '14px Inter, sans-serif';
        ctx.fillText(`${currentDiffuser.series} - ${currentDiffuser.name} (${currentMode.name})`, padding, padding + 55);

        const metrics = [
            { l: 'СКОРОСТЬ', v: `${physics.v0.toFixed(2)} м/с` },
            { l: 'ДАЛЬНОБОЙНОСТЬ', v: `${physics.throwDist.toFixed(1)} м` },
            { l: 'ШУМ', v: `${physics.noise.toFixed(0)} дБ` },
            { l: 'ДАВЛЕНИЕ', v: `${physics.pressure.toFixed(0)} Па` }
        ];
        
        metrics.forEach((m, i) => {
            const x = padding + 300 + (i * 120);
            ctx.fillStyle = '#64748b'; ctx.font = '10px Inter'; ctx.fillText(m.l, x, padding + 20);
            ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 16px monospace'; ctx.fillText(m.v, x, padding + 45);
        });

        ctx.drawImage(canvas, padding * dpr, padding * dpr, canvas.width, canvas.height, padding, headerH + padding, width, height);
        ctx.strokeStyle = '#334155'; ctx.strokeRect(padding, headerH + padding, width, height);

        ctx.fillStyle = '#64748b'; ctx.font = '12px Inter';
        ctx.fillText(`Generated by AeroFlow Elite • ${new Date().toLocaleDateString()}`, padding, headerH + height + padding + 40);

        const link = document.createElement('a');
        link.download = `Aeroflow-${Date.now()}.png`;
        link.href = exCanvas.toDataURL();
        link.click();
    };

    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, modelId?: string) => {
        // We set the modelId to transfer. 
        // If we drag the generic "Add" button, we use the CURRENT modelId from params.
        const idToTransfer = modelId || params.modelId;
        e.dataTransfer.setData('modelId', idToTransfer);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleGlobalDragEnd = () => {
        setDragPreview(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        
        if (viewMode !== 'top') return;
        
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Use correct scale logic if possible, or just rect based if consistent.
        // DiffuserCanvas logic: const scaleX = width / rect.width;
        // In Simulator, viewSize is used for canvas width/height props.
        const scaleX = viewSize.w / rect.width;
        const scaleY = viewSize.h / rect.height;

        const padding = 60;
        const ppm = Math.min(
            (viewSize.w - padding * 2) / params.roomWidth, 
            (viewSize.h - padding * 2) / params.roomLength
        );
        
        const roomPixW = params.roomWidth * ppm;
        const roomPixL = params.roomLength * ppm;
        const originX = (viewSize.w - roomPixW) / 2;
        const originY = (viewSize.h - roomPixL) / 2;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        let xMeter = (mouseX - originX) / ppm;
        let yMeter = (mouseY - originY) / ppm;
        
        xMeter = Math.max(0, Math.min(params.roomWidth, xMeter));
        yMeter = Math.max(0, Math.min(params.roomLength, yMeter));
        
        // Determine size for preview
        let width = 0.3;
        let height = 0.3;
        
        const spec = SPECS[params.diameter];
        if (spec) {
            width = spec.A / 1000;
            height = (spec.B || spec.A) / 1000; 
        }

        setDragPreview({ x: xMeter, y: yMeter, width, height });
    };
    
    const handleDragLeave = () => {
        setDragPreview(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (viewMode !== 'top') return;

        const droppedModelId = e.dataTransfer.getData('modelId');
        if (!droppedModelId) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Correct scaling
        const scaleX = viewSize.w / rect.width;
        const scaleY = viewSize.h / rect.height;

        const padding = 60;
        const ppm = Math.min((viewSize.w - padding * 2) / params.roomWidth, (viewSize.h - padding * 2) / params.roomLength);
        
        const roomPixW = params.roomWidth * ppm;
        const roomPixL = params.roomLength * ppm;
        const originX = (viewSize.w - roomPixW) / 2;
        const originY = (viewSize.h - roomPixL) / 2;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let xMeter = (mouseX - originX) / ppm;
        let yMeter = (mouseY - originY) / ppm;

        xMeter = Math.max(0, Math.min(params.roomWidth, xMeter));
        yMeter = Math.max(0, Math.min(params.roomLength, yMeter));

        if (droppedModelId !== params.modelId) {
            handleModelChange(droppedModelId);
        }

        addDiffuserToPlan(xMeter, yMeter);
        setDragPreview(null);
        // setDraggingModelId(null); // Assuming this is handled or removed if not needed by local state
    };

    return (
        <div className="flex w-full min-h-screen bg-[#050505] flex-col lg:flex-row relative">
            {/* Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] transition-opacity duration-1000 ${isPowerOn ? 'opacity-100' : 'opacity-20'}`} />
                <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px] transition-opacity duration-1000 ${isPowerOn ? 'opacity-100' : 'opacity-20'}`} />
            </div>

            {/* SIDEBAR - RESPONSIVE */}
            <div className={`
                fixed inset-0 z-50 bg-black/95 backdrop-blur-xl lg:static lg:bg-[#0f172a]/80 lg:backdrop-blur-xl
                flex flex-col lg:w-[380px] lg:border-r lg:border-white/5 lg:h-screen lg:shrink-0 transition-transform duration-300
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-4 border-b border-white/5 flex flex-col gap-4 shrink-0">
                     <div className="flex justify-between items-center lg:hidden mb-2">
                        <h2 className="text-lg font-bold text-white">Настройки</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-lg text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onHome} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all uppercase tracking-wide flex justify-center items-center gap-2">
                            <Home size={14} /> Домой
                        </button>
                        <button onClick={onBack} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all uppercase tracking-wide flex justify-center items-center gap-2">
                            <ChevronLeft size={14} /> Назад
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400 px-1">
                        <Wind size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">СИМУЛЯТОР ПОТОКА</span>
                    </div>
                </div>

                <div className="px-4 py-4 shrink-0">
                    <div className="flex bg-white/5 p-1 rounded-2xl">
                        <button onClick={() => setActiveTab('overview')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all ${activeTab === 'overview' ? 'tab-active text-white' : 'tab-inactive text-slate-400'}`}>Обзор</button>
                        <button onClick={() => setActiveTab('selection')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all ${activeTab === 'selection' ? 'tab-active text-white' : 'tab-inactive text-slate-400'}`}>Подбор</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                    {activeTab === 'overview' ? (
                        <div className={`${isPowerOn ? 'opacity-100 pointer-events-auto' : 'opacity-100'} space-y-6`}>
                            {/* 1. MODEL SELECTOR */}
                            <div>
                                <SectionHeader icon={<LayoutList size={14} />} title="Серия" />
                                <div className="grid grid-cols-2 gap-2">
                                    {DIFFUSER_CATALOG.map(d => (
                                        <button 
                                            key={d.id}
                                            onClick={() => handleModelChange(d.id)}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, d.id)}
                                            onDragEnd={handleGlobalDragEnd}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-grab active:cursor-grabbing ${params.modelId === d.id ? 'bg-blue-500/20 border-blue-500 text-blue-100' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <div className="text-xs font-bold">{d.series}</div>
                                            <div className="text-[10px] opacity-60">{d.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. GEOMETRY */}
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-4">
                                <SectionHeader icon={<ScanLine size={14} />} title="Геометрия помещения" />
                                
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Ширина</label>
                                        <input 
                                            type="number" step="0.5" min="2" max="30"
                                            value={params.roomWidth}
                                            onChange={(e) => setParams(p => ({...p, roomWidth: Number(e.target.value)}))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Длина</label>
                                        <input 
                                            type="number" step="0.5" min="2" max="30"
                                            value={params.roomLength}
                                            onChange={(e) => setParams(p => ({...p, roomLength: Number(e.target.value)}))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Высота</label>
                                        <input 
                                            type="number" step="0.1" min="2" max="15"
                                            value={params.roomHeight}
                                            onChange={(e) => handleRoomHeightChange(Number(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-mono"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Высота рабочей зоны (м)</label>
                                    <input 
                                        type="number" step="0.1"
                                        value={params.workZoneHeight}
                                        onChange={(e) => setParams(p => ({...p, workZoneHeight: Number(e.target.value)}))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-mono"
                                    />
                                </div>

                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Размещение диффузора</label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <span className="text-[9px] text-blue-400 font-bold uppercase">Под потолок</span>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${params.isCeilingMounted ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                                {params.isCeilingMounted && <CheckCircle2 size={10} className="text-white"/>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={params.isCeilingMounted} onChange={toggleCeilingMount}/>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ArrowUpToLine size={14} className="text-slate-500"/>
                                        <input 
                                            type="number" step="0.1"
                                            value={params.diffuserHeight}
                                            disabled={params.isCeilingMounted}
                                            onChange={(e) => handleDiffuserHeightChange(Number(e.target.value))}
                                            className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-mono ${params.isCeilingMounted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        <span className="text-xs font-bold text-slate-500">м</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. DIAMETER */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <SectionHeader icon={<CircleDot size={14} />} title="Размер" />
                                    <div className="flex gap-1">
                                        <button onClick={() => setShowGrid(!showGrid)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${showGrid ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'border-white/10 text-slate-500'}`}>СЕТКА</button>
                                        {viewMode === 'top' && (
                                            <>
                                                <button onClick={() => setSnapToGrid(!snapToGrid)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${snapToGrid ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'border-white/10 text-slate-500'}`}>🧲</button>
                                                <button onClick={() => setShowHeatmap(!showHeatmap)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${showHeatmap ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'border-white/10 text-slate-500'}`}>🗺️</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {!sizeSelected ? (
                                    <div className="bg-amber-500/20 border border-amber-500/50 p-4 rounded-xl flex flex-col items-center animate-pulse">
                                        <AlertTriangle size={24} className="text-amber-500 mb-2"/>
                                        <span className="text-xs font-black text-amber-200 uppercase tracking-widest">Выберите типоразмер</span>
                                    </div>
                                ) : null}

                                <div className={`flex flex-wrap gap-2 bg-black/20 p-2 rounded-xl border border-white/5 mt-2 ${!sizeSelected ? 'opacity-50' : 'opacity-100'}`}>
                                    {Object.keys(SPECS).map(d => {
                                        const isNum = !isNaN(Number(d));
                                        const val = isNum ? Number(d) : d;
                                        const isValid = calculatePerformance(params.modelId, currentMode.flowType, val, 100) !== null;
                                        
                                        if (!isValid) return null;

                                        return (
                                            <button 
                                                key={d} 
                                                onClick={() => handleSizeSelect(val)} 
                                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all border ${params.diameter === val ? 'bg-white text-black border-white scale-110 shadow-lg' : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10'}`}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 4. CLIMATE PARAMS */}
                            <div className="space-y-4">
                                <SectionHeader icon={<SlidersHorizontal size={14} />} title="Микроклимат" />
                                <GlassSlider 
                                    label="Расход (L0)" icon={<Fan size={14}/>}
                                    val={params.volume} min={physics.spec.min || 50} max={(physics.spec.max || 1000) * 1.5} step={10} unit=" м³/ч"
                                    onChange={(v: number) => setParams(p => ({...p, volume: v}))}
                                    gradient="from-blue-500 to-cyan-400"
                                />
                                <div className="h-px bg-white/10 my-2"></div>
                                <GlassSlider 
                                    label="T° Притока" icon={<Thermometer size={14}/>}
                                    val={params.temperature} min={15} max={35} step={1} unit="°C"
                                    onChange={(v: number) => setParams(p => ({...p, temperature: v}))}
                                    color="temp"
                                />
                                <div className="h-px bg-white/10 my-2"></div>
                                <GlassSlider 
                                    label="T° Помещения" icon={<Home size={14}/>}
                                    val={params.roomTemp} min={15} max={35} step={1} unit="°C"
                                    onChange={(v: number) => setParams(p => ({...p, roomTemp: v}))}
                                    color="temp"
                                />
                            </div>

                            {/* ADD TO PLAN BUTTON (Top View Only) */}
                            {viewMode === 'top' && (
                                <div className="pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2">
                                     <button 
                                        draggable
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleGlobalDragEnd}
                                        onClick={() => addDiffuserToPlan()}
                                        disabled={!sizeSelected || !!physics.error}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
                                    >
                                        <GripHorizontal size={16} /> ПЕРЕТАЩИТЬ НА ПЛАН
                                    </button>
                                    <div className="text-center mt-2 text-[10px] text-slate-500">
                                        Нажмите или перетащите кнопку на схему
                                    </div>
                                </div>
                            )}

                             {/* SELECTED DIFFUSER INFO (Top View) */}
                            {viewMode === 'top' && selectedDiffuserId && (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl animate-in fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-blue-300">ВЫБРАННЫЙ ЭЛЕМЕНТ</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => duplicateDiffuser(selectedDiffuserId)} className="text-blue-400 hover:text-blue-300 p-1" title="Дублировать (Ctrl+D)">
                                                <Copy size={14}/>
                                            </button>
                                            <button onClick={() => removeDiffuser(selectedDiffuserId)} className="text-red-400 hover:text-red-300 p-1" title="Удалить (Delete)">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                    {placedDiffusers.find(d => d.id === selectedDiffuserId) && (
                                        <div className="space-y-1 text-xs text-slate-300 font-mono">
                                            <div className="flex justify-between">
                                                <span>Тип:</span>
                                                <span className="text-white">{placedDiffusers.find(d => d.id === selectedDiffuserId)?.modelId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Размер:</span>
                                                <span className="text-white">{placedDiffusers.find(d => d.id === selectedDiffuserId)?.diameter}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Скорость в РЗ:</span>
                                                <span className="font-bold text-emerald-400">{placedDiffusers.find(d => d.id === selectedDiffuserId)?.performance.workzoneVelocity.toFixed(2)} м/с</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-left-4 fade-in">
                            {/* SELECTION TAB */}
                            <div className="space-y-4">
                                <SectionHeader icon={<Calculator size={14}/>} title="Вводные данные" />
                                
                                <div className="bg-black/20 p-1 rounded-xl border border-white/5 flex">
                                    <button onClick={() => setCalcFlowType('horizontal')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${calcFlowType === 'horizontal' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>ГОРИЗОНТАЛЬНЫЙ</button>
                                    <button onClick={() => setCalcFlowType('vertical')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${calcFlowType === 'vertical' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>ВЕРТИКАЛЬНЫЙ</button>
                                </div>

                                <div>
                                    <div className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase">Расход воздуха</div>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={calcVolume} 
                                            onChange={(e) => setCalcVolume(e.target.value)} 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder="Расход..."
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">М³/Ч</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase">Макс. V0 (м/с)</div>
                                        <input 
                                            type="number" 
                                            value={limitVelocity}
                                            onChange={(e) => setLimitVelocity(e.target.value)} 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase">Макс. Шум (дБ)</div>
                                        <input 
                                            type="number" 
                                            value={limitNoise}
                                            onChange={(e) => setLimitNoise(e.target.value)} 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <button onClick={handleCalculate} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                    <Search size={14} /> НАЙТИ РЕШЕНИЯ
                                </button>
                            </div>

                            <div className="space-y-4 pb-20">
                                {calcResults.length > 0 ? (
                                    calcResults.map((group) => (
                                        <div key={group.model.id} className="space-y-2">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{group.model.series}</div>
                                            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                                                <div className="grid grid-cols-4 gap-2 p-2 border-b border-white/5 bg-white/5 text-[9px] font-bold text-slate-500 uppercase">
                                                    <div>Размер</div>
                                                    <div className="text-center">V0 м/с</div>
                                                    <div className="text-center">Шум</div>
                                                    <div className="text-right">Статус</div>
                                                </div>
                                                <div>
                                                    {group.results.map((res: any) => {
                                                        const limitV = limitVelocity ? Number(limitVelocity) : 5.0;
                                                        const limitN = limitNoise ? Number(limitNoise) : 35;
                                                        
                                                        const isV0Bad = res.v0 > limitV;
                                                        const isNoiseBad = res.noise > limitN;

                                                        const v0Color = isV0Bad ? 'text-amber-500' : 'text-slate-400';
                                                        const noiseColor = isNoiseBad ? 'text-amber-500' : 'text-slate-400';

                                                        let statusIcon = <CheckCircle2 size={14} className="text-emerald-500"/>;
                                                        if (isV0Bad && isNoiseBad) {
                                                            statusIcon = <XCircle size={14} className="text-red-500"/>;
                                                        } else if (isV0Bad || isNoiseBad) {
                                                            statusIcon = <AlertTriangle size={14} className="text-amber-500"/>;
                                                        }

                                                        return (
                                                            <button 
                                                                key={res.diameter}
                                                                onClick={() => {
                                                                    applyResult(group.model.id, group.modeIdx, res.diameter);
                                                                    setIsMobileMenuOpen(false);
                                                                }}
                                                                className="w-full grid grid-cols-4 gap-2 p-2.5 items-center text-xs border-b border-white/5 last:border-0 hover:bg-white/10 transition-colors group"
                                                            >
                                                                <div className="font-bold font-mono text-left group-hover:text-white text-slate-300">{res.diameter}</div>
                                                                <div className={`font-mono text-center ${v0Color}`}>{res.v0.toFixed(1)}</div>
                                                                <div className={`font-mono text-center ${noiseColor}`}>{res.noise.toFixed(0)}</div>
                                                                <div className="flex justify-end">
                                                                    {statusIcon}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center text-slate-600 border border-dashed border-white/5 rounded-xl">
                                        <Calculator size={24} className="mb-2 opacity-50"/>
                                        <span className="text-[10px] font-medium">Введите расход и нажмите поиск</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md shrink-0">
                    <div className="grid grid-cols-4 gap-2">
                        <GlassButton 
                            onClick={togglePower}
                            active={isPowerOn}
                            icon={<Power size={18} />}
                            label={isPowerOn ? "СТОП" : "СТАРТ"}
                            customClass={`col-span-2 ${isPowerOn ? "bg-red-500/20 text-red-100 border-red-500/50 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-100 border-emerald-500/50 hover:bg-emerald-500/30"}`}
                        />
                        <GlassButton 
                            active={isPlaying && isPowerOn} 
                            disabled={!isPowerOn}
                            onClick={() => setIsPlaying(!isPlaying)}
                            icon={isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                            secondary={true}
                            customClass="col-span-1"
                        />
                        <GlassButton 
                            onClick={handleReset}
                            icon={<RotateCcw size={18} />}
                            secondary={true}
                            customClass="col-span-1"
                            label=""
                        />
                    </div>
                </div>
            </div>
            
            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative z-10 overflow-hidden lg:h-screen w-full">
                 <header className="flex-none flex items-center justify-between p-3 lg:px-8 lg:py-4 lg:mx-6 lg:mt-6 rounded-3xl lg:glass-panel z-20 bg-[#0f172a]/80 backdrop-blur-md lg:bg-transparent">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2 lg:gap-4">
                            <div className={`hidden lg:block bg-gradient-to-tr from-blue-600 to-cyan-500 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all duration-500 ${isPowerOn ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                <Wind className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm lg:text-lg font-bold tracking-tight text-white">AeroFlow <span className="text-blue-400">Elite</span></h1>
                                <div className="text-[9px] lg:text-[10px] text-slate-400 uppercase tracking-widest font-bold">Engineering Simulator</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* VIEW MODE TOGGLE */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mr-4">
                            <button 
                                onClick={() => setViewMode('side')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'side' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Layers size={14}/> Вид сбоку
                            </button>
                            <button 
                                onClick={() => setViewMode('top')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'top' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <ScanLine size={14}/> Вид сверху
                            </button>
                        </div>

                        <div className={`hidden xl:flex items-center gap-6 transition-all duration-700 ${isPowerOn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                            {viewMode === 'side' ? (
                                <>
                                    <GlassMetric label="V0 СКОРОСТЬ" value={`${physics.v0.toFixed(2)}`} unit="м/с" color="text-emerald-400" />
                                    <div className="w-px h-8 bg-white/10"></div>
                                    <GlassMetric label="ДАЛЬНОБОЙНОСТЬ" value={`${physics.throwDist.toFixed(1)}`} unit="м" color="text-blue-400" />
                                    <div className="w-px h-8 bg-white/10"></div>
                                    <GlassMetric label="СКОРОСТЬ В РЗ" value={`${physics.workzoneVelocity.toFixed(1)}`} unit="м/с" color={physics.workzoneVelocity > 0.5 ? "text-emerald-400" : "text-amber-400"} />
                                    <div className="w-px h-8 bg-white/10"></div>
                                    <GlassMetric label="РАДИУС ОХВАТА" value={`${physics.coverageRadius.toFixed(1)}`} unit="м" color="text-blue-400" />
                                    <div className="w-px h-8 bg-white/10"></div>
                                    <GlassMetric label="ШУМ" value={`${physics.noise.toFixed(0)}`} unit="дБ" color={physics.noise > 45 ? 'text-red-400' : 'text-slate-300'} />
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center min-w-[80px]">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">ДИФФУЗОРОВ</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-mono text-xl font-bold text-white drop-shadow-sm">{placedDiffusers.length}</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-8 bg-white/10"></div>
                                    <GlassMetric label="РАЗМЕРЫ ПОМ." value={`${params.roomWidth}x${params.roomLength}`} unit="м" color="text-white" />
                                </>
                            )}
                        </div>

                        <button 
                            onClick={handleExport} 
                            disabled={!isPowerOn}
                            className={`hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-95 ml-4 ${!isPowerOn ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                            <Download size={18} /> Экспорт
                        </button>
                    </div>
                </header>

                  <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 lg:p-6 min-h-0 relative">
		                    <div 
                                ref={containerRef} 
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onDragLeave={handleDragLeave}
                                className="flex-1 relative rounded-2xl lg:rounded-[32px] overflow-hidden glass-panel bg-black/40 shadow-2xl shadow-black/50 w-full h-full"
                            >
		                        {/* Mobile Metrics Bar */}
		                        <div className={`lg:hidden absolute top-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-md z-10 transition-opacity duration-500 border-b border-white/5 ${isPowerOn ? 'opacity-100' : 'opacity-0'}`}>
		                             {viewMode === 'side' ? (
                                        <div className="flex justify-between items-center text-[10px] font-mono text-white/90 px-2">
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-400">V0</span>
                                                <span className="font-bold text-emerald-400">{physics.v0.toFixed(1)}</span>
                                            </div>
                                            <div className="w-px h-4 bg-white/10"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-400">L</span>
                                                <span className="font-bold text-blue-400">{physics.throwDist.toFixed(1)}</span>
                                            </div>
                                            <div className="w-px h-4 bg-white/10"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-400">V_РЗ</span>
                                                <span className="font-bold text-amber-400">{physics.workzoneVelocity.toFixed(1)}</span>
                                            </div>
                                            <div className="w-px h-4 bg-white/10"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-400">Шум</span>
                                                <span className="font-bold text-white">{physics.noise.toFixed(0)}</span>
                                            </div>
                                        </div>
                                     ) : (
                                         <div className="flex justify-center items-center text-[10px] font-mono text-white/90 px-2 gap-4">
                                            <span>Размещено: {placedDiffusers.length}</span>
                                            <span>{params.roomWidth}x{params.roomLength}м</span>
                                         </div>
                                     )}
		                        </div>

                                {/* INFO TABLE OVERLAY */}
                                {viewMode === 'top' && placedDiffusers.length > 0 && (
                                    <div className="absolute top-4 left-4 z-30 w-64 max-h-[50%] overflow-y-auto custom-scrollbar bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 sticky top-0 bg-black/80 pb-2 border-b border-white/10">Спецификация</h3>
                                        <table className="w-full text-[10px] text-left">
                                            <thead className="text-slate-500 uppercase">
                                                <tr>
                                                    <th className="pb-2">#</th>
                                                    <th className="pb-2">Тип</th>
                                                    <th className="pb-2">Ø</th>
                                                    <th className="pb-2 text-right">L(м)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-300 font-mono">
                                                {placedDiffusers.map(d => (
                                                    <tr key={d.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                                        <td className="py-1 font-bold text-white">{d.index}</td>
                                                        <td className="py-1">{d.modelId.toUpperCase()}</td>
                                                        <td className="py-1">{d.diameter}</td>
                                                        <td className="py-1 text-right">{d.volume}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="mt-2 pt-2 border-t border-white/10 text-[9px] text-slate-500 italic">
                                            ПКМ для удаления
                                        </div>
                                    </div>
                                )}
		                        
	                            <DiffuserCanvas 
	                                width={viewSize.w} height={viewSize.h} 
	                                physics={physics} 
	                                isPowerOn={isPowerOn} isPlaying={isPlaying} 
	                                temp={params.temperature} 
	                                roomTemp={params.roomTemp} 
	                                flowType={currentMode.flowType} 
	                                modelId={params.modelId}
	                                showGrid={showGrid}
	                                roomHeight={params.roomHeight}
                                    roomWidth={params.roomWidth}
                                    roomLength={params.roomLength}
	                                diffuserHeight={params.diffuserHeight}
	                                workZoneHeight={params.workZoneHeight}
                                    viewMode={viewMode}
                                    placedDiffusers={placedDiffusers}
                                    onUpdateDiffuserPos={updateDiffuserPosition}
                                    onSelectDiffuser={setSelectedDiffuserId}
                                    onRemoveDiffuser={removeDiffuser}
                                    selectedDiffuserId={selectedDiffuserId}
                                    showHeatmap={showHeatmap}
                                    velocityField={velocityField}
                                    gridStep={0.5}
                                    dragPreview={dragPreview}
                                    snapToGrid={snapToGrid}
                                    gridSnapSize={0.5}
	                            />
	                        
	                         <div className="absolute bottom-4 left-4 lg:bottom-6 lg:left-6 text-[9px] lg:text-[10px] font-mono text-slate-400 pointer-events-none bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5">
	                            H: {params.roomHeight}M | POS: {params.diffuserHeight}M | {params.diameter ? `Ø${params.diameter}` : 'NO SIZE'}
	                        </div>
	                    </div>
	                    
	                    {/* Панель статистики покрытия */}
	                    {viewMode === 'top' && placedDiffusers.length > 0 && (
	                        <div className="w-full lg:w-auto mt-4 lg:mt-0 p-4 rounded-xl bg-black/40 border border-white/10">
	                            <div className="text-xs font-bold text-white/70 uppercase tracking-wider mb-3">Анализ покрытия</div>
	                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
	                                <div>
	                                    <div className="text-slate-500 uppercase text-[10px] mb-1">Покрытие</div>
	                                    <div className="text-2xl font-bold text-white">
	                                        {coverageAnalysis.totalCoverage.toFixed(0)}%
	                                    </div>
	                                </div>
	                                <div>
	                                    <div className="text-slate-500 uppercase text-[10px] mb-1">Ср. скорость</div>
	                                    <div className="text-2xl font-bold text-emerald-400">
	                                        {coverageAnalysis.avgVelocity.toFixed(2)} m/s
	                                    </div>
	                                </div>
	                                <div>
	                                    <div className="text-slate-500 uppercase text-[10px] mb-1">Комфорт</div>
	                                    <div className="text-2xl font-bold text-green-400">
	                                        {coverageAnalysis.comfortZones}
	                                    </div>
	                                </div>
	                                <div>
	                                    <div className="text-slate-500 uppercase text-[10px] mb-1">Сквозняки</div>
	                                    <div className="text-2xl font-bold text-red-400">
	                                        {coverageAnalysis.draftZones}
	                                    </div>
	                                </div>
	                            </div>
	                        </div>
	                    )}
                </main>
            </div>
        </div>
    );
};

export default Simulator;