import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Download, Menu, ScanLine, Layers, GripHorizontal, Grid, Thermometer, Info, Box
} from 'lucide-react';

import { SPECS, DIFFUSER_CATALOG } from '../../../../constants';
import { useScientificSimulation, calculateVelocityField, analyzeCoverage, calculateWorkzoneVelocityAndCoverage, calculatePerformance } from '../../../../hooks/useSimulation';
import DiffuserCanvas from './DiffuserCanvas';
import { SimulatorLeftPanel } from './SimulatorLeftPanel';
import { SimulatorRightPanel } from './SimulatorRightPanel';
import { PlacedDiffuser, PerformanceResult } from '../../../../types';

const Simulator = ({ onBack, onHome }: any) => {
    // --- STATE ---
    const [viewSize, setViewSize] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPowerOn, setIsPowerOn] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [viewMode, setViewMode] = useState<'side' | 'top' | '3d'>('side');
    const [viewAxis, setViewAxis] = useState<'front' | 'side'>('front'); // 'front' = X-axis, 'side' = Y-axis
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false); 
    const [openSection, setOpenSection] = useState<string | null>('distributor');

    // Simulation Data
    const [placedDiffusers, setPlacedDiffusers] = useState<PlacedDiffuser[]>([]);
    const [selectedDiffuserId, setSelectedDiffuserId] = useState<string | null>(null);
    const [velocityField, setVelocityField] = useState<number[][]>([]);
    const [coverageAnalysis, setCoverageAnalysis] = useState({ totalCoverage: 0, avgVelocity: 0, comfortZones: 0, warningZones: 0, draftZones: 0, deadZones: 0 });
    
    // UI Interaction State
    const [isDragging, setIsDragging] = useState(false);

    // Params
    const [params, setParams] = useState({
        diameter: 100 as string | number, // Default: Min size for DPU-M
        volume: 80, // Default: Min volume for DPU-M/100
        temperature: 20, // Default: 20°C
        roomTemp: 20, // Default: 20°C
        modelId: 'dpu-m', // Default: Universal
        modeIdx: 0,
        roomHeight: 3.0, // Default: 3m
        roomWidth: 3.0, // Default: 3m
        roomLength: 3.0, // Default: 3m
        diffuserHeight: 3.0, // Default: Ceiling mounted at 3m
        isCeilingMounted: true,
        workZoneHeight: 1.5 // Default: 1.5m
    });
    const [sizeSelected, setSizeSelected] = useState(true);

    const currentDiffuser = DIFFUSER_CATALOG.find(d => d.id === params.modelId)!;
    const currentMode = currentDiffuser.modes[params.modeIdx] || currentDiffuser.modes[0];
    
    // Calculate physics for the "Active/New" settings in the panel
    const physics = useScientificSimulation(params.modelId, currentMode.flowType, params.diameter, params.volume, params.temperature, params.roomTemp, params.diffuserHeight, params.workZoneHeight);

    // --- EFFECTS ---
    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            window.requestAnimationFrame(() => {
                if (!Array.isArray(entries) || !entries.length) return;
                const { width, height } = entries[0].contentRect;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                setViewSize({ w: width * dpr, h: height * dpr }); 
            });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // Initial Diffuser Setup (Default in Center)
    useEffect(() => {
        const initDiffuser: PlacedDiffuser = {
            id: 'default-1',
            index: 1,
            x: params.roomWidth / 2,
            y: params.roomLength / 2,
            modelId: params.modelId,
            diameter: params.diameter,
            volume: params.volume,
            performance: physics
        };
        setPlacedDiffusers([initDiffuser]);
        setSelectedDiffuserId('default-1');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount
    
    useEffect(() => {
        if (viewMode !== 'top' || placedDiffusers.length === 0) { setVelocityField([]); return; }
        const step = isDragging ? 0.5 : 0.1;
        setVelocityField(calculateVelocityField(params.roomWidth, params.roomLength, placedDiffusers, params.diffuserHeight, params.workZoneHeight, step));
    }, [placedDiffusers, params.roomWidth, params.roomLength, params.diffuserHeight, params.workZoneHeight, viewMode, isDragging]);
    
    useEffect(() => { setCoverageAnalysis(analyzeCoverage(velocityField)); }, [velocityField]);
    
    // --- SYNC LOGIC ---

    // 1. When selecting a diffuser, load its params into the UI
    useEffect(() => {
        if (selectedDiffuserId) {
            const d = placedDiffusers.find(pd => pd.id === selectedDiffuserId);
            if (d) {
                setParams(prev => ({
                    ...prev,
                    modelId: d.modelId,
                    diameter: d.diameter,
                    volume: d.volume,
                    // We don't overwrite room params from a single diffuser, 
                    // but we might want to overwrite flow params if we store them per diffuser.
                }));
            }
        }
    }, [selectedDiffuserId]);

    // 2. When UI params change (Model, Vol, Size), update the SELECTED diffuser
    useEffect(() => {
        if (selectedDiffuserId) {
            setPlacedDiffusers(prev => prev.map(d => {
                if (d.id === selectedDiffuserId) {
                    // Recalculate performance with new params
                    const updatedDiffuser = { ...d, modelId: params.modelId, diameter: params.diameter, volume: params.volume };
                    return {
                        ...updatedDiffuser,
                        performance: calculatePlacedDiffuserPerformance(updatedDiffuser) // This function uses current room params (heights)
                    };
                }
                return d;
            }));
        }
    }, [params.modelId, params.diameter, params.volume]);

    // 3. When Global Environment params change (Room Dims, Heights, Temps), update ALL diffusers
    useEffect(() => {
        setPlacedDiffusers(prev => prev.map(d => ({
            ...d,
            performance: calculatePlacedDiffuserPerformance(d)
        })));
    }, [params.roomHeight, params.diffuserHeight, params.workZoneHeight, params.temperature, params.roomTemp]);


    // Stable handlers
    const removeDiffuser = useCallback((id: string) => { 
        setPlacedDiffusers(prev => prev.filter(d => d.id !== id)); 
        if (selectedDiffuserId === id) setSelectedDiffuserId(null); 
    }, [selectedDiffuserId]);

    const duplicateDiffuser = useCallback((id: string) => {
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
        setPlacedDiffusers(prev => [...prev, newDiffuser]);
        setSelectedDiffuserId(newDiffuser.id);
    }, [placedDiffusers, params.roomWidth, params.roomLength]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== 'top') return;
            if (e.key === 'Delete' && selectedDiffuserId) { e.preventDefault(); removeDiffuser(selectedDiffuserId); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedDiffuserId) { e.preventDefault(); duplicateDiffuser(selectedDiffuserId); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, selectedDiffuserId, removeDiffuser, duplicateDiffuser]);

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
        
        // Calculate basic perf based on volume/diameter
        const perf = calculatePerformance(pd.modelId, flowType, pd.diameter, pd.volume);
        
        if (!perf || !perf.spec) {
             const fallbackSpec = SPECS[pd.diameter] || { f0: 0, A: 0, B: 0, C: 0, D: 0, min: 0, max: 0 };
             return { v0:0, pressure:0, noise:0, throwDist:0, spec: fallbackSpec, workzoneVelocity:0, coverageRadius:0, Ar: 0 };
        }

        // Apply Archimedes (Buoyancy) Physics based on CURRENT Global Temps
        const g = 9.81;
        const T_ref = 273.15 + params.roomTemp; 
        const beta = 1 / T_ref;
        const dt = params.temperature - params.roomTemp; // Global Supply Temp - Global Room Temp
        const l0 = Math.sqrt(perf.spec.f0); 
        const v0 = perf.v0 || 0;

        const Ar = v0 > 0.1 ? (g * beta * dt * l0) / (v0 * v0) : 0;
        
        const VISUAL_GAIN = 15.0; 
        let k_archimedes = 1.0;
        if (Math.abs(Ar) > 0.00001) {
            k_archimedes = 1.0 - (VISUAL_GAIN * Ar); 
            k_archimedes = Math.max(0.1, Math.min(3.0, k_archimedes));
        }

        const finalThrow = Math.max(0, (perf.throwDist || 0) * k_archimedes);

        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, 
            perf.spec.A * 1000000, // convert m2 to mm2 for this specific legacy func if needed, or check types. 
            // Actually spec.f0 is m2. spec.A is mm dimension usually in older code? 
            // In types.ts Spec.A is int (e.g. 198), likely diameter or linear? 
            // Let's rely on f0 from spec for Area. 
            // Actually calculateWorkzoneVelocityAndCoverage expects A in mm^2? 
            // Let's use spec.f0 (m2) * 1e6
            params.diffuserHeight, 
            params.workZoneHeight,
            2.0,
            k_archimedes
        );

        return { 
            ...perf, 
            v0: v0, 
            pressure: perf.pressure || 0, 
            noise: perf.noise || 0, 
            throwDist: finalThrow, 
            workzoneVelocity, 
            coverageRadius, 
            spec: perf.spec,
            Ar: Ar
        };
    };

    const addDiffuserToPlan = () => {
        if (!sizeSelected || physics.error) return;
        const nextIndex = placedDiffusers.length > 0 ? Math.max(...placedDiffusers.map(d => d.index)) + 1 : 1;
        const newDiffuser: PlacedDiffuser = {
            id: `d-${Date.now()}`, index: nextIndex, x: params.roomWidth / 2, y: params.roomLength / 2,
            modelId: params.modelId, diameter: params.diameter, volume: params.volume, performance: physics 
        };
        // Ensure it's calculated fresh
        newDiffuser.performance = calculatePlacedDiffuserPerformance(newDiffuser);
        
        setPlacedDiffusers([...placedDiffusers, newDiffuser]);
        setSelectedDiffuserId(newDiffuser.id);
    };

    const updateDiffuserPosition = useCallback((id: string, x: number, y: number) => {
        setPlacedDiffusers(prev => prev.map(d => d.id === id ? { ...d, x, y } : d));
    }, []);

    const handleDragStart = useCallback(() => setIsDragging(true), []);
    const handleDragEnd = useCallback(() => setIsDragging(false), []);

    const handleExport = () => {
        const canvas = document.querySelector('canvas');
        if (canvas) { const link = document.createElement('a'); link.download = `Aeroflow-${Date.now()}.png`; link.href = canvas.toDataURL(); link.click(); }
    };

    return (
        <div className="flex w-full h-[100dvh] bg-[#F5F5F7] dark:bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-900 dark:text-slate-200 overflow-hidden transition-colors duration-500">
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
                onAddDiffuser={addDiffuserToPlan}
            />

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden p-0 lg:p-4 lg:pl-0">
                {/* CANVAS */}
                <div ref={containerRef} className="flex-1 lg:rounded-[48px] overflow-hidden relative shadow-2xl bg-white dark:bg-[#030304] border-b lg:border border-black/5 dark:border-white/5 ring-1 ring-black/5 dark:ring-white/5 group transition-colors duration-500">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 dark:from-blue-900/5 to-transparent pointer-events-none"></div>
                    
                    {/* Top Bar for Mobile */}
                    <div className="lg:hidden absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="pointer-events-auto p-3 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"><Menu size={20} /></button>
                        <button onClick={() => setIsMobileStatsOpen(true)} className="pointer-events-auto p-3 rounded-full bg-white/10 backdrop-blur-md text-slate-800 dark:text-white border border-white/10 active:scale-95 transition-transform"><Info size={20} /></button>
                    </div>
                    
                    <DiffuserCanvas 
                        width={viewSize.w} height={viewSize.h} physics={physics} 
                        isPowerOn={isPowerOn} isPlaying={isPlaying} 
                        temp={params.temperature} roomTemp={params.roomTemp} 
                        flowType={currentMode.flowType} modelId={params.modelId}
                        showGrid={showGrid} roomHeight={params.roomHeight} roomWidth={params.roomWidth} roomLength={params.roomLength}
                        diffuserHeight={params.diffuserHeight} workZoneHeight={params.workZoneHeight}
                        viewMode={viewMode} viewAxis={viewAxis}
                        placedDiffusers={placedDiffusers} 
                        onUpdateDiffuserPos={updateDiffuserPosition} onSelectDiffuser={setSelectedDiffuserId}
                        onRemoveDiffuser={removeDiffuser} onDuplicateDiffuser={duplicateDiffuser} selectedDiffuserId={selectedDiffuserId}
                        showHeatmap={showHeatmap} velocityField={velocityField} gridStep={isDragging ? 0.5 : 0.1}
                        snapToGrid={snapToGrid} gridSnapSize={0.5}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    />
                </div>
                
                 {/* FLOATING "ISLAND" BAR (Controls) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4 w-[90%] max-w-md pointer-events-none">
                    <div className="pointer-events-auto flex items-center p-1.5 rounded-full bg-white/80 dark:bg-[#0f1014]/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                         <button onClick={() => setViewMode('side')} className={`px-4 lg:px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'side' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}><Layers size={16}/><span>Срез</span></button>
                        
                        {viewMode === 'side' && (
                            <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 mx-1 gap-1 animate-in zoom-in-50 duration-300">
                                <button 
                                    onClick={() => setViewAxis('front')} 
                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-[10px] font-black ${viewAxis === 'front' ? 'bg-white dark:bg-white/20 text-black dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`} 
                                    title="Вид Спереди (X)"
                                >
                                    X
                                </button>
                                <button 
                                    onClick={() => setViewAxis('side')} 
                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-[10px] font-black ${viewAxis === 'side' ? 'bg-white dark:bg-white/20 text-black dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`} 
                                    title="Вид Справа (Y)"
                                >
                                    Y
                                </button>
                            </div>
                        )}

                        <button onClick={() => setViewMode('top')} className={`px-4 lg:px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'top' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}><ScanLine size={16}/><span>План</span></button>
                        <button onClick={() => setViewMode('3d')} className={`px-4 lg:px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === '3d' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}><Box size={16}/><span>3D</span></button>
                        
                        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1"></div>
                        <button onClick={() => setShowGrid(!showGrid)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showGrid ? 'bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`} title="Сетка"><Grid size={18} /></button>
                        
                        {viewMode === 'top' && (
                            <>
                                <button onClick={() => setSnapToGrid(!snapToGrid)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${snapToGrid ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`} title="Привязка"><GripHorizontal size={18} /></button>
                                <button onClick={() => setShowHeatmap(!showHeatmap)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showHeatmap ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`} title="Тепловая карта скоростей"><Thermometer size={18} /></button>
                            </>
                        )}
                         <button onClick={handleExport} disabled={!isPowerOn} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 ${!isPowerOn ? 'opacity-30' : ''}`} title="Экспорт"><Download size={18} /></button>
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