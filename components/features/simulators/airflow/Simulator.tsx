
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Download, Menu, ScanLine, Layers, GripHorizontal, Grid, Thermometer, Info, Box, Square, LayoutGrid, Power, Play, Pause, Lock, CircleHelp, Target,
  MousePointer2, Ruler, BrickWall, Pipette, Activity
} from 'lucide-react';

import { SPECS, DIFFUSER_CATALOG } from '../../../../constants';
import { useScientificSimulation, calculateSimulationField, analyzeField, calculateWorkzoneVelocityAndCoverage, calculatePerformance } from '../../../../hooks/useSimulation';
import DiffuserCanvas from './DiffuserCanvas';
import { SimulatorLeftPanel } from './SimulatorLeftPanel';
import { SimulatorRightPanel } from './SimulatorRightPanel';
import SimulatorHelpOverlay from './SimulatorHelpOverlay';
import { PlacedDiffuser, PerformanceResult, Probe, ToolMode, Obstacle, GridPoint, VisualizationMode } from '../../../../types';

const Simulator = ({ onBack, onHome }: any) => {
    // --- STATE ---
    const [viewSize, setViewSize] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPowerOn, setIsPowerOn] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    
    // Help Mode State
    const [isHelpMode, setIsHelpMode] = useState(false);
    const [wasPlayingBeforeHelp, setWasPlayingBeforeHelp] = useState(false);

    // Default view is now 'top'
    const [viewMode, setViewMode] = useState<'side' | 'top' | '3d'>('top');
    const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('velocity');
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false); 
    const [openSection, setOpenSection] = useState<string | null>('distributor');
    
    // Placement Mode (For Add Button behavior)
    const [placementMode, setPlacementMode] = useState<'single' | 'multi'>('single');

    // Tool Mode (For Interaction)
    const [activeTool, setActiveTool] = useState<ToolMode>('select');

    // Simulation Data
    const [placedDiffusers, setPlacedDiffusers] = useState<PlacedDiffuser[]>([]);
    const [selectedDiffuserId, setSelectedDiffuserId] = useState<string | null>(null);
    
    // Updated Field State
    const [simulationField, setSimulationField] = useState<GridPoint[][]>([]);
    
    const [coverageAnalysis, setCoverageAnalysis] = useState({ totalCoverage: 0, avgVelocity: 0, comfortZones: 0, warningZones: 0, draftZones: 0, deadZones: 0, adpi: 0 });
    
    // --- PROBE STATE ---
    const [probes, setProbes] = useState<Probe[]>([]);

    // --- OBSTACLE STATE ---
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);

    // --- HEATMAP SLICE ---
    const [heatmapZ, setHeatmapZ] = useState(1.1); // Default workzone height

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
                // Optimization: Use Device Pixel Ratio but limit to 2x to save GPU load on mobile/Retina
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                setViewSize({ w: width * dpr, h: height * dpr }); 
            });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);
    
    useEffect(() => {
        // Do not calculate if power is OFF. This ensures "no flow" until start.
        if (viewMode !== 'top' || placedDiffusers.length === 0 || !isPowerOn) { 
            setSimulationField([]); 
            return; 
        }
        
        const step = isDragging ? 0.5 : 0.1;
        
        // Use updated field calculation
        setSimulationField(calculateSimulationField(
            params.roomWidth, params.roomLength, placedDiffusers, 
            params.diffuserHeight, params.workZoneHeight, step, 
            obstacles, heatmapZ,
            params.temperature, params.roomTemp
        ));
    }, [placedDiffusers, params.roomWidth, params.roomLength, params.diffuserHeight, params.workZoneHeight, viewMode, isDragging, isPowerOn, obstacles, heatmapZ, params.temperature, params.roomTemp]);
    
    useEffect(() => { setCoverageAnalysis(analyzeField(simulationField)); }, [simulationField]);
    
    // Stable handlers for DiffuserCanvas
    const removeDiffuser = useCallback((id: string) => { 
        setPlacedDiffusers(prev => prev.filter(d => d.id !== id)); 
        if (selectedDiffuserId === id) setSelectedDiffuserId(null); 
    }, [selectedDiffuserId]);

    const duplicateDiffuser = useCallback((id: string) => {
        if (placementMode === 'single' && placedDiffusers.length >= 1) {
            alert("В режиме 'Одиночный' можно добавить только одно устройство. Переключитесь в 'Мульти'.");
            return;
        }
        
        const original = placedDiffusers.find(d => d.id === id);
        if (!original) return;
        
        // Smart duplicate placement logic
        const tryOffsets = [
            {dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1},
            {dx: 1, dy: 1}, {dx: 1, dy: -1}, {dx: -1, dy: 1}, {dx: -1, dy: -1}
        ];

        let newX = original.x + 0.5;
        let newY = original.y + 0.5;
        let found = false;

        for (const offset of tryOffsets) {
            const tx = Math.min(params.roomWidth - 0.5, Math.max(0.5, original.x + offset.dx));
            const ty = Math.min(params.roomLength - 0.5, Math.max(0.5, original.y + offset.dy));
            
            const hasCollision = placedDiffusers.some(d => {
                const dist = Math.sqrt(Math.pow(d.x - tx, 2) + Math.pow(d.y - ty, 2));
                return dist < 0.8;
            });

            if (!hasCollision) {
                newX = tx; newY = ty; found = true;
                break;
            }
        }
        
        if (!found) {
             newX = Math.min(params.roomWidth - 0.5, Math.max(0.5, original.x + 0.2));
             newY = Math.min(params.roomLength - 0.5, Math.max(0.5, original.y + 0.2));
        }

        const nextIndex = placedDiffusers.length > 0 ? Math.max(...placedDiffusers.map(d => d.index)) + 1 : 1;
        
        const newDiffuser: PlacedDiffuser = { 
            ...original, 
            id: `d-${Date.now()}`, 
            index: nextIndex, 
            x: newX, 
            y: newY 
        };
        setPlacedDiffusers(prev => [...prev, newDiffuser]);
        setSelectedDiffuserId(newDiffuser.id);
        setActiveTool('select');
    }, [placedDiffusers, params.roomWidth, params.roomLength, placementMode]);

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
    
    const togglePower = () => { 
        const newState = !isPowerOn;
        setIsPowerOn(newState); 
        setIsPlaying(true); 
    };

    const toggleHelp = () => {
        if (!isHelpMode) {
            setWasPlayingBeforeHelp(isPlaying);
            setIsPlaying(false);
            setIsHelpMode(true);
        } else {
            setIsHelpMode(false);
            if (wasPlayingBeforeHelp && isPowerOn) {
                setIsPlaying(true);
            }
        }
    };

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
        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(perf.v0 || 0, perf.spec.A, params.diffuserHeight, params.workZoneHeight);
        return { ...perf, v0: perf.v0 || 0, pressure: perf.pressure || 0, noise: perf.noise || 0, throwDist: perf.throwDist || 0, workzoneVelocity, coverageRadius, spec: perf.spec };
    };

    // Update diffusers when room params change
    useEffect(() => {
        setPlacedDiffusers(prev => prev.map(d => ({ ...d, performance: calculatePlacedDiffuserPerformance(d) })));
    }, [params.diffuserHeight, params.workZoneHeight, params.roomHeight]);

    // --- PROBE HANDLERS ---
    const addProbe = (x: number, y: number) => {
        // Initialize z at heatmapZ or workZoneHeight
        const newProbe: Probe = { id: `p-${Date.now()}`, x, y, z: heatmapZ };
        setProbes(prev => [...prev, newProbe]);
    };

    const removeProbe = (id: string) => {
        setProbes(prev => prev.filter(p => p.id !== id));
    };

    const updateProbePos = useCallback((id: string, pos: {x?: number, y?: number, z?: number}) => {
        setProbes(prev => prev.map(p => p.id === id ? { ...p, ...pos } : p));
    }, []);

    // --- OBSTACLE HANDLERS ---
    const addObstacle = (x: number, y: number, w: number = 1.0, length: number = 1.0, type: 'furniture' | 'wall_block' = 'furniture') => {
        // Floating obstacle defaults: Elevation 1.0m, Height 0.5m
        const newObs: Obstacle = { 
            id: `o-${Date.now()}`, 
            x, y, 
            width: w, length: length, 
            type, 
            z: type === 'wall_block' ? 0 : 1.0, 
            height: type === 'wall_block' ? params.roomHeight : 0.5,
            rotation: 0
        };
        setObstacles(prev => [...prev, newObs]);
    };

    const removeObstacle = (id: string) => {
        setObstacles(prev => prev.filter(o => o.id !== id));
    };

    const updateObstacle = useCallback((id: string, updates: Partial<Obstacle>) => {
        setObstacles(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    }, []);

    // --- PLACEMENT HELPERS ---
    const isColliding = (x: number, y: number, diffusers: PlacedDiffuser[], minDist: number) => {
        return diffusers.some(d => {
            const dist = Math.sqrt(Math.pow(d.x - x, 2) + Math.pow(d.y - y, 2));
            return dist < minDist;
        });
    };

    const findFreePosition = (diffusers: PlacedDiffuser[], roomW: number, roomL: number, spacing: number) => {
        const cx = roomW / 2;
        const cy = roomL / 2;
        
        if (!isColliding(cx, cy, diffusers, spacing)) return { x: cx, y: cy };

        const maxLayers = Math.ceil(Math.max(roomW, roomL) / spacing);
        
        for (let layer = 1; layer <= maxLayers; layer++) {
            const start = -layer;
            const end = layer;
            const candidates = [];
            for (let i = start; i <= end; i++) {
                candidates.push({ x: i, y: -layer });
                candidates.push({ x: i, y: layer });
                if (Math.abs(i) !== layer) candidates.push({ x: -layer, y: i });
                if (Math.abs(i) !== layer) candidates.push({ x: layer, y: i });
            }
            
            candidates.sort((a, b) => (a.x*a.x + a.y*a.y) - (b.x*b.x + b.y*b.y));

            for (const cand of candidates) {
                const px = cx + cand.x * spacing;
                const py = cy + cand.y * spacing;
                
                if (px >= 0.5 && px <= roomW - 0.5 && py >= 0.5 && py <= roomL - 0.5) {
                    if (!isColliding(px, py, diffusers, spacing)) return { x: px, y: py };
                }
            }
        }
        return null;
    };

    const addDiffuserToPlan = () => {
        if (!sizeSelected || physics.error) return;

        if (placementMode === 'single' && placedDiffusers.length > 0) {
            if(confirm("В режиме 'Одиночный' можно установить только один диффузор. Заменить текущий?")) {
                 // Will be replaced below
            } else {
                return;
            }
        }

        const nextIndex = placedDiffusers.length > 0 ? Math.max(...placedDiffusers.map(d => d.index)) + 1 : 1;
        let newX = params.roomWidth / 2;
        let newY = params.roomLength / 2;

        if (placementMode === 'multi' && placedDiffusers.length > 0) {
            const minSpacing = 1.0;
            const pos = findFreePosition(placedDiffusers, params.roomWidth, params.roomLength, minSpacing);
            if (pos) {
                newX = pos.x;
                newY = pos.y;
            } else {
                alert("Нет свободного места в центре. Освободите пространство.");
                return;
            }
        }

        const newDiffuser: PlacedDiffuser = {
            id: `d-${Date.now()}`, index: nextIndex, x: newX, y: newY,
            modelId: params.modelId, diameter: params.diameter, volume: params.volume, performance: physics 
        };
        newDiffuser.performance = calculatePlacedDiffuserPerformance(newDiffuser);
        
        if (placementMode === 'single') {
            setPlacedDiffusers([newDiffuser]);
        } else {
            setPlacedDiffusers(prev => [...prev, newDiffuser]);
        }
        
        setSelectedDiffuserId(newDiffuser.id);
        setActiveTool('select');
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

    const areSimulationViewsLocked = !isPowerOn || placedDiffusers.length === 0;

    const ToolButton = ({ active, icon, onClick, title }: any) => (
        <button 
            onClick={onClick}
            title={title}
            aria-label={title}
            className={`
                w-9 h-9 flex items-center justify-center rounded-full transition-all
                ${active 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                }
            `}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex w-full h-[100dvh] bg-[#F5F5F7] dark:bg-[#020205] flex-col lg:flex-row relative font-sans text-slate-900 dark:text-slate-200 overflow-hidden transition-colors duration-500">
             
             {isHelpMode && <SimulatorHelpOverlay onClose={toggleHelp} viewMode={viewMode} isPowerOn={isPowerOn} />}

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
                isHelpMode={isHelpMode}
                // Obstacles
                setObstacles={setObstacles}
                // Placement
                placementMode={placementMode}
                setPlacementMode={setPlacementMode}
                // Heatmap Z
                heatmapZ={heatmapZ}
                setHeatmapZ={setHeatmapZ}
            />

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden p-0 lg:p-4 lg:pl-0">
                
                {/* ADPI BADGE */}
                {viewMode === 'top' && isPowerOn && simulationField.length > 0 && (
                    <div className="absolute top-4 right-4 z-30 pointer-events-none hidden lg:block">
                        <div className={`
                            flex items-center gap-3 p-3 rounded-2xl bg-[#0f1016]/90 backdrop-blur-xl border border-white/10 shadow-2xl
                            ${coverageAnalysis.adpi > 80 ? 'border-emerald-500/30' : coverageAnalysis.adpi < 70 ? 'border-red-500/30' : 'border-amber-500/30'}
                        `}>
                            <div className={`p-2 rounded-xl text-white ${coverageAnalysis.adpi > 80 ? 'bg-emerald-500' : coverageAnalysis.adpi < 70 ? 'bg-red-500' : 'bg-amber-500'}`}>
                                <Activity size={18} />
                            </div>
                            <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ADPI Score</div>
                                <div className={`text-xl font-black ${coverageAnalysis.adpi > 80 ? 'text-emerald-400' : coverageAnalysis.adpi < 70 ? 'text-red-400' : 'text-amber-400'}`}>
                                    {coverageAnalysis.adpi.toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CANVAS */}
                <div ref={containerRef} className="flex-1 lg:rounded-[48px] overflow-hidden relative shadow-2xl bg-white dark:bg-[#030304] border-b lg:border border-black/5 dark:border-white/5 ring-1 ring-black/5 dark:ring-white/5 group transition-colors duration-500">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 dark:from-blue-900/5 to-transparent pointer-events-none"></div>
                    
                    {/* Top Bar for Mobile */}
                    <div className="lg:hidden absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="pointer-events-auto p-3 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform" aria-label="Меню"><Menu size={20} /></button>
                        <button onClick={() => setIsMobileStatsOpen(true)} className="pointer-events-auto p-3 rounded-full bg-white/10 backdrop-blur-md text-slate-800 dark:text-white border border-white/10 active:scale-95 transition-transform" aria-label="Информация"><Info size={20} /></button>
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
                        showHeatmap={showHeatmap} simulationField={simulationField} gridStep={isDragging ? 0.5 : 0.1}
                        snapToGrid={snapToGrid} gridSnapSize={0.5}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        // Tool State
                        activeTool={activeTool}
                        setActiveTool={setActiveTool}
                        // Probe props
                        probes={probes}
                        onAddProbe={addProbe}
                        onRemoveProbe={removeProbe}
                        onUpdateProbePos={updateProbePos}
                        // Obstacle Props
                        obstacles={obstacles}
                        onAddObstacle={addObstacle}
                        onRemoveObstacle={removeObstacle}
                        onUpdateObstacle={updateObstacle}
                        // ADPI Viz
                        visualizationMode={visualizationMode}
                    />
                </div>
                
                 {/* FLOATING "ISLAND" BAR (Controls) */}
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-[95%] max-w-2xl pointer-events-none transition-all duration-300 ${isHelpMode ? 'z-[210]' : 'z-40'}`}>
                    <div className="pointer-events-auto flex items-center p-1.5 rounded-full bg-white/80 dark:bg-[#0f1014]/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                        
                        <button 
                            onClick={togglePower} 
                            disabled={placedDiffusers.length === 0}
                            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all mr-1 ${isPowerOn ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'} ${placedDiffusers.length === 0 ? 'opacity-50 cursor-not-allowed saturate-0' : ''}`}
                            title={isPowerOn ? "Стоп" : "Старт"}
                            aria-label={isPowerOn ? "Стоп" : "Старт"}
                        >
                            <Power size={18} />
                        </button>

                        {isPowerOn && (
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)} 
                                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all mr-1 ${isPlaying ? 'bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'}`}
                                title={isPlaying ? "Пауза" : "Продолжить"}
                                aria-label={isPlaying ? "Пауза" : "Продолжить"}
                            >
                                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                        )}

                        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1"></div>

                        <button 
                            onClick={() => !areSimulationViewsLocked && setViewMode('side')} 
                            disabled={areSimulationViewsLocked}
                            className={`px-4 lg:px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 
                                ${viewMode === 'side' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
                                ${areSimulationViewsLocked ? 'opacity-30 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : ''}
                            `}
                            aria-label="Срез"
                        >
                            {areSimulationViewsLocked ? <Lock size={14}/> : <Layers size={16}/>}
                            <span className="hidden sm:inline">Срез</span>
                        </button>
                        
                        <button 
                            onClick={() => setViewMode('top')} 
                            className={`px-4 lg:px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'top' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                            aria-label="План"
                        >
                            <ScanLine size={16}/><span>План</span>
                        </button>
                        
                        <button 
                            onClick={() => !areSimulationViewsLocked && setViewMode('3d')} 
                            disabled={areSimulationViewsLocked}
                            className={`px-4 lg:px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 
                                ${viewMode === '3d' ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
                                ${areSimulationViewsLocked ? 'opacity-30 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : ''}
                            `}
                            aria-label="3D"
                        >
                            {areSimulationViewsLocked ? <Lock size={14}/> : <Box size={16}/>}
                            <span className="hidden sm:inline">3D</span>
                        </button>
                        
                        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1"></div>
                        
                        {/* --- TOOLBAR --- */}
                        {viewMode === 'top' && (
                            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5 mr-1">
                                <ToolButton active={activeTool === 'select'} onClick={() => setActiveTool('select')} icon={<MousePointer2 size={16} />} title="Выбор и перемещение" />
                                <ToolButton active={activeTool === 'probe'} onClick={() => setActiveTool('probe')} icon={<Target size={16} />} title="Точка измерения" />
                                <ToolButton active={activeTool === 'measure'} onClick={() => setActiveTool('measure')} icon={<Ruler size={16} />} title="Линейка" />
                                <ToolButton active={activeTool === 'obstacle'} onClick={() => setActiveTool('obstacle')} icon={<BrickWall size={16} />} title="Препятствие" />
                                <ToolButton active={activeTool === 'pipette'} onClick={() => setActiveTool('pipette')} icon={<Pipette size={16} />} title="Копировать свойства" />
                            </div>
                        )}

                        {isPowerOn ? (
                            <>
                                <button onClick={() => setShowGrid(!showGrid)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showGrid ? 'bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`} title="Сетка" aria-label="Сетка"><Grid size={18} /></button>
                                {viewMode === 'top' && (
                                    <>
                                        <button onClick={() => setSnapToGrid(!snapToGrid)} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${snapToGrid ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`} title="Привязка" aria-label="Привязка"><GripHorizontal size={18} /></button>
                                        
                                        {/* Heatmap Toggle & Mode Switcher */}
                                        <button 
                                            onClick={() => {
                                                if (!showHeatmap) {
                                                    setShowHeatmap(true);
                                                } else {
                                                    // Toggle Mode if already showing
                                                    setVisualizationMode(prev => prev === 'velocity' ? 'adpi' : 'velocity');
                                                }
                                            }} 
                                            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showHeatmap ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`} 
                                            title="Тепловая карта / ADPI"
                                            aria-label="Тепловая карта / ADPI"
                                        >
                                            {visualizationMode === 'adpi' && showHeatmap ? <Activity size={18}/> : <Thermometer size={18} />}
                                        </button>
                                    </>
                                )}
                                 <button onClick={handleExport} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5`} title="Экспорт" aria-label="Экспорт"><Download size={18} /></button>
                            </>
                        ) : null}

                        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1"></div>
                        <button 
                            onClick={toggleHelp} 
                            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${isHelpMode ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`} 
                            title="Справка"
                            aria-label="Справка"
                        >
                            <CircleHelp size={18} />
                        </button>

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
                isHelpMode={isHelpMode}
                // Probes
                probes={probes}
                onRemoveProbe={removeProbe}
                // Obstacles could be passed here if needed in Right Panel (e.g. list view)
            />
        </div>
    );
};

export default Simulator;
