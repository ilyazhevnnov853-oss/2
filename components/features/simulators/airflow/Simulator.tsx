import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, Menu, ScanLine, Layers, GripHorizontal, Grid, Thermometer, Info
} from 'lucide-react';

import { SPECS, DIFFUSER_CATALOG } from '../../../../constants'; // Путь скорректирован
import { useScientificSimulation, calculateVelocityField, analyzeCoverage, calculateWorkzoneVelocityAndCoverage, calculatePerformance } from '../../../../hooks/useSimulation'; // Путь скорректирован
import DiffuserCanvas from './DiffuserCanvas';
import { SimulatorLeftPanel } from './SimulatorLeftPanel';
import { SimulatorRightPanel } from './SimulatorRightPanel';
import { PlacedDiffuser, PerformanceResult } from '../../../../types'; // Путь скорректирован

const Simulator = ({ onBack, onHome }: any) => {
    // --- STATE ---
    const [viewSize, setViewSize] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPowerOn, setIsPowerOn] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [viewMode, setViewMode] = useState<'side' | 'top'>('side');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false); // New state for mobile stats
    const [openSection, setOpenSection] = useState<string | null>('distributor');

    // Simulation Data
    const [placedDiffusers, setPlacedDiffusers] = useState<PlacedDiffuser[]>([]);
    const [selectedDiffuserId, setSelectedDiffuserId] = useState<string | null>(null);
    const [dragPreview, setDragPreview] = useState<{x: number, y: number, width: number, height: number} | null>(null);
    const [velocityField, setVelocityField] = useState<number[][]>([]);
    const [coverageAnalysis, setCoverageAnalysis] = useState({ totalCoverage: 0, avgVelocity: 0, comfortZones: 0, warningZones: 0, draftZones: 0, deadZones: 0 });
    
    // UI Interaction State
    const [isDragging, setIsDragging] = useState(false);

    // Params
    const [params, setParams] = useState({
        diameter: 160 as string | number, volume: 250, temperature: 20, roomTemp: 24, modelId: 'dpu-v', modeIdx: 0,
        roomHeight: 3.5, roomWidth: 6.0, roomLength: 6.0, diffuserHeight: 3.5, isCeilingMounted: true, workZoneHeight: 1.8
    });
    const [sizeSelected, setSizeSelected] = useState(true);

    const currentDiffuser = DIFFUSER_CATALOG.find(d => d.id === params.modelId)!;
    const currentMode = currentDiffuser.modes[params.modeIdx] || currentDiffuser.modes[0];
    
    const physics = useScientificSimulation(params.modelId, currentMode.flowType, params.diameter, params.volume, params.temperature, params.roomTemp, params.diffuserHeight, params.workZoneHeight);

    // --- EFFECTS ---
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
    
    useEffect(() => {
        if (viewMode !== 'top' || placedDiffusers.length === 0) { setVelocityField([]); return; }
        
        // Dynamic Resolution:
        // When dragging: Use coarse step (0.5m) -> Fast updates (144 points for 6x6m)
        // When static: Use fine step (0.1m) -> High precision (3600 points for 6x6m)
        const step = isDragging ? 0.5 : 0.1;
        
        setVelocityField(calculateVelocityField(params.roomWidth, params.roomLength, placedDiffusers, params.diffuserHeight, params.workZoneHeight, step));
    }, [placedDiffusers, params.roomWidth, params.roomLength, params.diffuserHeight, params.workZoneHeight, viewMode, isDragging]);
    
    useEffect(() => { setCoverageAnalysis(analyzeCoverage(velocityField)); }, [velocityField]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== 'top') return;
            if (e.key === 'Delete' && selectedDiffuserId) { e.preventDefault(); removeDiffuser(selectedDiffuserId); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedDiffuserId) { e.preventDefault(); duplicateDiffuser(selectedDiffuserId); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, selectedDiffuserId, placedDiffusers]);

    // --- LOGIC ---
    const toggleSection = (id: string) => setOpenSection(prev => prev === id ? null : id);
    const togglePower = () => { setIsPowerOn(!isPowerOn); setIsPlaying(true); };

    const topViewStats = useMemo(() => {
        if (placedDiffusers.length === 0) return { maxNoise: 0, calcTemp: params.roomTemp };
        const maxNoise = Math.max(...placedDiffusers.map(d => d.performance.noise));
        let totalSupplyVol = 0;
        let weightedSupplyTempSum = 0;
        placedDiffusers.forEach(d => { totalSupplyVol += d.volume; weightedSupplyTempSum += d.volume * params.temperature; });
        const avgSupplyTemp = totalSupplyVol > 0 ? weightedSupplyTempSum / totalSupplyVol : params.temperature;
        const influenceFactor = Math.min(1, coverageAnalysis.totalCoverage / 100); 
        const resultTemp = params.roomTemp - (params.roomTemp - avgSupplyTemp) * influenceFactor;
        return { maxNoise, calcTemp: resultTemp };
    }, [placedDiffusers, coverageAnalysis.totalCoverage, params.roomTemp, params.temperature]);

    const calculatePlacedDiffuserPerformance = (pd: PlacedDiffuser): PerformanceResult => {
        const model = DIFFUSER_CATALOG.find(m => m.id === pd.modelId);
        const flowType = model ? model.modes[0].flowType : 'vertical';
        const perf = calculatePerformance(pd.modelId, flowType, pd.diameter, pd.volume);
        if (!perf || !perf.spec) {
             const fallbackSpec = SPECS[pd.diameter] || { f0: 0, A: 0, B: 0, C: 0, D: 0, min: 0, max: 0 };
             return { v0:0, pressure:0, noise:0, throwDist:0, spec: fallbackSpec, workzoneVelocity:0, coverageRadius:0 };
        }
        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(perf.v0 || 0, perf.throwDist || 0, perf.spec.A, params.diffuserHeight, params.workZoneHeight);
        return { ...perf, v0: perf.v0 || 0, pressure: perf.pressure || 0, noise: perf.noise || 0, throwDist: perf.throwDist || 0, workzoneVelocity, coverageRadius, spec: perf.spec };
    };

    // Update diffusers when room params change
    useEffect(() => {
        setPlacedDiffusers(prev => prev.map(d => ({ ...d, performance: calculatePlacedDiffuserPerformance(d) })));
    }, [params.diffuserHeight, params.workZoneHeight, params.roomHeight]);

    const addDiffuserToPlan = (xPos?: number, yPos?: number) => {
        if (!sizeSelected || physics.error) return;
        const nextIndex = placedDiffusers.length > 0 ? Math.max(...placedDiffusers.map(d => d.index)) + 1 : 1;
        const newDiffuser: PlacedDiffuser = {
            id: `d-${Date.now()}`, index: nextIndex, x: xPos !== undefined ? xPos : params.roomWidth / 2, y: yPos !== undefined ? yPos : params.roomLength / 2,
            modelId: params.modelId, diameter: params.diameter, volume: params.volume, performance: physics 
        };
        newDiffuser.performance = calculatePlacedDiffuserPerformance(newDiffuser);
        setPlacedDiffusers([...placedDiffusers, newDiffuser]);
        setSelectedDiffuserId(newDiffuser.id);
    };

    const duplicateDiffuser = (id: string) => {
        const original = placedDiffusers.find(d => d.id === id);
        if (!original) return;
        const nextIndex = placedDiffusers.length > 0 ? Math.max(...placedDiffusers.map(d => d.index)) + 1 : 1;
        
        let newX = Math.min(params.roomWidth - 0.5, Math.max(0, original.x + 0.5));
        let newY = Math.min(params.roomLength - 0.5, Math.max(0, original.y + 0.5));
        
        const newDiffuser: PlacedDiffuser = { 
            ...original, 
            id: `d-${Date.now()}`, 
            index: nextIndex, 
            x: newX, 
            y: newY 
        };
        setPlacedDiffusers([...placedDiffusers, newDiffuser]);
        setSelectedDiffuserId(newDiffuser.id);
    };

    const updateDiffuserPosition = (id: string, x: number, y: number) => setPlacedDiffusers(prev => prev.map(d => d.id === id ? { ...d, x, y } : d));
    const removeDiffuser = (id: string) => { setPlacedDiffusers(prev => prev.filter(d => d.id !== id)); if (selectedDiffuserId === id) setSelectedDiffuserId(null); };

    // Drag Drop
    const handleDragStart = (e: React.DragEvent, modelId?: string) => { e.dataTransfer.setData('modelId', modelId || params.modelId); e.dataTransfer.effectAllowed = 'copy'; };
    const handleGlobalDragEnd = () => setDragPreview(null);
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
        if (viewMode !== 'top' || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = viewSize.w / rect.width; const scaleY = viewSize.h / rect.height;
        const ppm = Math.min((viewSize.w - 120) / params.roomWidth, (viewSize.h - 120) / params.roomLength);
        const originX = (viewSize.w - params.roomWidth * ppm) / 2;
        const originY = (viewSize.h - params.roomLength * ppm) / 2;
        let xMeter = Math.max(0, Math.min(params.roomWidth, ((e.clientX - rect.left) * scaleX - originX) / ppm));
        let yMeter = Math.max(0, Math.min(params.roomLength, ((e.clientY - rect.top) * scaleY - originY) / ppm));
        
        let width = 0.3; let height = 0.3;
        const spec = SPECS[params.diameter];
        if (spec) { width = spec.A / 1000; height = (spec.B || spec.A) / 1000; }
        setDragPreview({ x: xMeter, y: yMeter, width, height });
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (viewMode !== 'top' || !containerRef.current) return;
        const droppedModelId = e.dataTransfer.getData('modelId');
        if (droppedModelId && dragPreview) addDiffuserToPlan(dragPreview.x, dragPreview.y);
        setDragPreview(null);
    };
    const handleDragLeave = () => setDragPreview(null);

    const handleExport = () => {
        const canvas = document.querySelector('canvas');
        if (canvas) { const link = document.createElement('a'); link.download = `Aeroflow-${Date.now()}.png`; link.href = canvas.toDataURL(); link.click(); }
    };

    return (
        <div className="flex w-full h-[100dvh] bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-200 overflow-hidden selection:bg-blue-500/30">
             {/* AMBIENT BACKGROUND */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '8s'}} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none opacity-40 animate-pulse" style={{animationDuration: '10s'}} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none"></div>

            <SimulatorLeftPanel 
                openSection={openSection} toggleSection={toggleSection}
                params={params} setParams={setParams}
                physics={physics} currentMode={currentMode}
                isPowerOn={isPowerOn} togglePower={togglePower}
                viewMode={viewMode} isPlaying={isPlaying} setIsPlaying={setIsPlaying}
                sizeSelected={sizeSelected} setSizeSelected={setSizeSelected}
                onHome={onHome} 
                onBack={onBack}
                isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}
                onAddDiffuser={() => addDiffuserToPlan()}
            />

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden p-0 lg:p-4 lg:pl-0">
                {/* CANVAS */}
                <div ref={containerRef} onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={handleDragLeave} className="flex-1 lg:rounded-[48px] overflow-hidden relative shadow-2xl bg-[#030304] border-b lg:border border-white/5 ring-1 ring-white/5 group">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none"></div>
                    
                    {/* Top Bar for Mobile */}
                    <div className="lg:hidden absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="pointer-events-auto p-3 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"><Menu size={20} /></button>
                        <button onClick={() => setIsMobileStatsOpen(true)} className="pointer-events-auto p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 active:scale-95 transition-transform"><Info size={20} /></button>
                    </div>
                    
                    <DiffuserCanvas 
                        width={viewSize.w} height={viewSize.h} physics={physics} 
                        isPowerOn={isPowerOn} isPlaying={isPlaying} 
                        temp={params.temperature} roomTemp={params.roomTemp} 
                        flowType={currentMode.flowType} modelId={params.modelId}
                        showGrid={showGrid} roomHeight={params.roomHeight} roomWidth={params.roomWidth} roomLength={params.roomLength}
                        diffuserHeight={params.diffuserHeight} workZoneHeight={params.workZoneHeight}
                        viewMode={viewMode} placedDiffusers={placedDiffusers} 
                        onUpdateDiffuserPos={updateDiffuserPosition} onSelectDiffuser={setSelectedDiffuserId}
                        onRemoveDiffuser={removeDiffuser} onDuplicateDiffuser={duplicateDiffuser} selectedDiffuserId={selectedDiffuserId}
                        showHeatmap={showHeatmap} velocityField={velocityField} gridStep={isDragging ? 0.5 : 0.1} dragPreview={dragPreview}
                        snapToGrid={snapToGrid} gridSnapSize={0.5}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
                    />
                </div>
                
                 {/* FLOATING "ISLAND" BAR (Mobile Optimized) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4 w-[90%] max-w-md pointer-events-none">
                    <div className="pointer-events-auto flex items-center p-1.5 rounded-full bg-[#0f1014]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                         <button onClick={() => setViewMode('side')} className={`px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'side' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Layers size={16}/><span>Срез</span></button>
                        <button onClick={() => setViewMode('top')} className={`px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'top' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><ScanLine size={16}/><span>План</span></button>
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        <button onClick={() => setShowGrid(!showGrid)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showGrid ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} title="Сетка"><Grid size={18} /></button>
                        {viewMode === 'top' && (
                            <>
                                <button onClick={() => setSnapToGrid(!snapToGrid)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${snapToGrid ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} title="Привязка"><GripHorizontal size={18} /></button>
                                <button onClick={() => setShowHeatmap(!showHeatmap)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showHeatmap ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} title="Тепловая карта скоростей"><Thermometer size={18} /></button>
                            </>
                        )}
                         <button onClick={handleExport} disabled={!isPowerOn} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all text-slate-500 hover:text-white hover:bg-white/5 ${!isPowerOn ? 'opacity-30' : ''}`} title="Экспорт"><Download size={18} /></button>
                    </div>
                </div>
            </div>

            <SimulatorRightPanel 
                viewMode={viewMode}
                physics={physics}
                params={params}
                placedDiffusers={placedDiffusers}
                topViewStats={topViewStats}
                coverageAnalysis={coverageAnalysis}
                isMobileStatsOpen={isMobileStatsOpen}
                setIsMobileStatsOpen={setIsMobileStatsOpen}
            />
        </div>
    );
};

export default Simulator;