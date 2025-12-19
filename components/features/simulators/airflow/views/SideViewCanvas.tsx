import React, { useRef, useEffect, useCallback } from 'react';
import { PerformanceResult, PlacedDiffuser } from '../../../../../types';
import { DIFFUSER_CATALOG } from '../../../../../constants';

const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 3500,
  GRID_CELL_SIZE: 30, // Resolution for fluid pressure grid
  REPULSION_FORCE: 15.0, // Strength of stream-stream repulsion
};

interface Particle {
    active: boolean;
    x: number; 
    y: number; 
    vx: number; 
    vy: number; 
    buoyancy: number; 
    drag: number; 
    age: number; 
    life: number; 
    lastHistoryTime: number; 
    history: {x: number, y: number, age: number}[]; 
    color: string; 
    waveFreq: number; 
    wavePhase: number; 
    waveAmp: number; 
    isHorizontal: boolean; 
    isSuction: boolean;
}

interface SideViewCanvasProps {
  width: number; 
  height: number;
  physics: PerformanceResult;
  isPowerOn: boolean; 
  isPlaying: boolean;
  temp: number; 
  roomTemp: number;
  flowType: string; 
  modelId: string;
  showGrid: boolean;
  roomHeight: number;
  roomWidth: number;
  roomLength: number;
  diffuserHeight: number; 
  workZoneHeight: number;
  placedDiffusers?: PlacedDiffuser[];
  selectedDiffuserId?: string | null;
  viewAxis: 'front' | 'side';
}

const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`; // Cold
    if (t >= 28) return `255, 99, 132`; // Hot
    if (t > 18 && t < 28) return `100, 255, 160`; // Comfort
    return `255, 255, 255`;
};

const getSideLayout = (w: number, h: number, rh: number, wallWidth: number) => {
    const padding = 40;
    const availW = w - padding * 2;
    const availH = h - padding * 2;
    const ppm = Math.min(availW / wallWidth, availH / rh);
    const floorY = h - padding;
    const ceilingY = floorY - rh * ppm;
    const originX = (w - wallWidth * ppm) / 2;
    return { ppm, originX, floorY, ceilingY };
};

const SideViewCanvas: React.FC<SideViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const simulationRef = useRef(props);
    const particlePool = useRef<Particle[]>([]);
    
    // Physics Grid for SPH-like pressure simulation
    const densityGrid = useRef<Float32Array | null>(null);
    const gridCols = useRef(0);
    const gridRows = useRef(0);
    
    useEffect(() => {
        if (particlePool.current.length === 0) {
            for (let i = 0; i < CONSTANTS.MAX_PARTICLES; i++) {
                particlePool.current.push({
                    active: false, x: 0, y: 0, vx: 0, vy: 0, buoyancy: 0, drag: 0, age: 0, life: 0,
                    lastHistoryTime: 0, history: [], color: '255,255,255',
                    waveFreq: 0, wavePhase: 0, waveAmp: 0, isHorizontal: false, isSuction: false
                });
            }
        }
    }, []);

    useEffect(() => { simulationRef.current = props; }, [props]);

    const spawnParticle = (p: Particle, state: SideViewCanvasProps, ppm: number, spawnX: number, spawnY: number, perf: PerformanceResult, sourceModelId: string) => {
        const { temp, roomTemp, roomHeight } = state;
        
        const model = DIFFUSER_CATALOG.find(m => m.id === sourceModelId);
        const flowType = model ? model.modes[0].flowType : state.flowType;

        if (perf.error || !perf.spec) return;

        const nozzleW = (perf.spec.A / 1000) * ppm;
        const pxSpeed = (perf.v0 || 0) * ppm * 0.8;
        const dtTemp = temp - roomTemp;
        
        const buoyancy = -(dtTemp / 293) * 9.81 * ppm * 4.0;

        let vx = 0, vy = 0, drag = 0.96, waveAmp = 5, waveFreq = 4 + Math.random() * 4, isHorizontal = false, isSuction = false;

        if (flowType === 'suction') {
            isSuction = true;
            const wallW = state.viewAxis === 'front' ? state.roomWidth : state.roomLength;
            const { originX, ceilingY } = getSideLayout(state.width, state.height, state.roomHeight, wallW);
            p.x = originX + Math.random() * (wallW * ppm);
            p.y = ceilingY + Math.random() * (state.roomHeight * ppm);
            const dx = spawnX - p.x; const dy = spawnY - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const force = (perf.v0 * 500) / (dist + 10);
            vx = (dx / dist) * force; vy = (dy / dist) * force;
            drag = 1.0; waveAmp = 0; p.life = 3.0; p.color = '150, 150, 150';
        } else if (flowType.includes('horizontal')) {
            isHorizontal = true;
            const side = Math.random() > 0.5 ? 1 : -1;
            p.x = spawnX + side * (nozzleW * 0.55); p.y = spawnY;
            const spread = (Math.random() - 0.5) * 0.1;
            const angle = side === 1 ? spread : Math.PI + spread;
            vx = Math.cos(angle) * pxSpeed * 1.2; vy = Math.sin(angle) * pxSpeed * 0.2;
            if (flowType.includes('swirl')) { waveAmp = 15; waveFreq = 8; } else { waveAmp = 3; }
        } else if (flowType === '4-way') {
            isHorizontal = true;
            const side = Math.random() > 0.5 ? 1 : -1;
            p.x = spawnX + side * (nozzleW * 0.55); p.y = spawnY;
            vx = side * pxSpeed * 1.0; vy = pxSpeed * 0.1;
        } else if (sourceModelId === 'dpu-m' && flowType.includes('vertical')) {
            const side = Math.random() > 0.5 ? 1 : -1;
            p.x = spawnX + side * (nozzleW * 0.45); p.y = spawnY;
            const coneAngle = (35 + Math.random() * 10) * (Math.PI / 180);
            vx = side * Math.sin(coneAngle) * pxSpeed; vy = Math.cos(coneAngle) * pxSpeed;
            waveAmp = 5; drag = 0.95;
        } else if (sourceModelId === 'dpu-k' && flowType.includes('vertical')) {
            p.x = spawnX + (Math.random() - 0.5) * nozzleW * 0.95; p.y = spawnY;
            const spreadAngle = (Math.random() - 0.5) * 60 * (Math.PI / 180); 
            vx = Math.sin(spreadAngle) * pxSpeed * 0.8; vy = Math.cos(spreadAngle) * pxSpeed;
            waveAmp = 8; drag = 0.96;
        } else if (flowType === 'vertical-swirl') {
            p.x = spawnX + (Math.random() - 0.5) * nozzleW * 0.9; p.y = spawnY;
            const spread = (Math.random() - 0.5) * 1.5;
            vx = Math.sin(spread) * pxSpeed * 0.5; vy = Math.cos(spread) * pxSpeed;
            waveAmp = 30 + Math.random() * 10; waveFreq = 6; drag = 0.94;
        } else {
            p.x = spawnX + (Math.random() - 0.5) * nozzleW * 0.95; p.y = spawnY;
            const spread = (Math.random() - 0.5) * 0.05;
            vx = Math.sin(spread) * pxSpeed * 0.3; vy = Math.cos(spread) * pxSpeed * 1.3;
            waveAmp = 1; drag = 0.985;
        }

        if (!isSuction) { p.life = 2.0 + Math.random() * 1.5; p.color = getGlowColor(temp); }
        p.vx = vx; p.vy = vy; p.buoyancy = buoyancy; p.drag = drag; p.age = 0;
        p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
        p.isHorizontal = isHorizontal; p.isSuction = isSuction;
        p.active = true; p.lastHistoryTime = 0; p.history.length = 0;
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, viewAxis, roomHeight, roomWidth, roomLength, diffuserHeight } = state;
        const dt = CONSTANTS.BASE_TIME_STEP;

        const wallW = viewAxis === 'front' ? roomWidth : roomLength;
        const { ppm, originX, floorY, ceilingY } = getSideLayout(width, height, roomHeight, wallW);
        const rightWall = originX + wallW * ppm;

        // --- GRID INIT ---
        const cols = Math.ceil(width / CONSTANTS.GRID_CELL_SIZE);
        const rows = Math.ceil(height / CONSTANTS.GRID_CELL_SIZE);
        if (!densityGrid.current || gridCols.current !== cols || gridRows.current !== rows) {
            densityGrid.current = new Float32Array(cols * rows);
            gridCols.current = cols;
            gridRows.current = rows;
        }
        const grid = densityGrid.current;
        grid.fill(0); // Clear grid every frame

        // Background
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
        ctx.fillRect(0, 0, width, height);

        // Grid & Room
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(originX, ceilingY, wallW * ppm, roomHeight * ppm);
        if (state.showGrid) {
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            const step = 0.5 * ppm;
            for (let x = originX; x <= originX + wallW * ppm; x += step) { ctx.moveTo(x, ceilingY); ctx.lineTo(x, floorY); }
            for (let y = ceilingY; y <= floorY; y += step) { ctx.moveTo(originX, y); ctx.lineTo(originX + wallW * ppm, y); }
            ctx.stroke();
        }

        const pool = particlePool.current;
        const activeDiffusers: {x: number, y: number, perf: PerformanceResult, modelId: string}[] = [];
        
        if (state.placedDiffusers && state.placedDiffusers.length > 0) {
            state.placedDiffusers.forEach(d => {
                const posInWall = viewAxis === 'front' ? d.x : d.y;
                const cx = originX + posInWall * ppm;
                const cy = ceilingY + (roomHeight - diffuserHeight) * ppm;
                activeDiffusers.push({ 
                    x: cx, 
                    y: cy + (d.performance.spec.D/1000 * ppm), 
                    perf: d.performance,
                    modelId: d.modelId
                });
            });
        } else {
            activeDiffusers.push({ 
                x: originX + (wallW/2) * ppm, 
                y: ceilingY + (roomHeight - diffuserHeight) * ppm + (state.physics.spec?.D/1000 * ppm || 10), 
                perf: state.physics,
                modelId: state.modelId
            });
        }

        // --- FLUID SIMULATION: PASS 1 ---
        if (isPlaying) {
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) continue;
                const p = pool[i];
                const gx = Math.floor(p.x / CONSTANTS.GRID_CELL_SIZE);
                const gy = Math.floor(p.y / CONSTANTS.GRID_CELL_SIZE);
                if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
                    grid[gy * cols + gx] += 1;
                }
            }
        }

        // --- SPAWN PARTICLES ---
        if (isPowerOn && isPlaying && activeDiffusers.length > 0) {
            const maxV0 = Math.max(...activeDiffusers.map(d => d.perf.v0 || 0));
            const spawnRate = Math.ceil(5 + (maxV0 / 2) * 8);
            let spawned = 0;
            
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) { 
                    const source = activeDiffusers[Math.floor(Math.random() * activeDiffusers.length)];
                    if (source.perf && !source.perf.error) {
                        spawnParticle(pool[i], state, ppm, source.x, source.y, source.perf, source.modelId); 
                        spawned++; 
                    }
                    if (spawned >= spawnRate) break; 
                }
            }
        }

        ctx.globalCompositeOperation = 'screen';
        ctx.lineWidth = 1; ctx.lineCap = 'round';

        // --- FLUID SIMULATION: PASS 2 ---
        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;

            if (isPlaying) {
                p.age += dt;
                if (p.isSuction) {
                    p.x += p.vx * dt; p.y += p.vy * dt;
                } else {
                    if (p.age > 0.2) {
                        const gx = Math.floor(p.x / CONSTANTS.GRID_CELL_SIZE);
                        const gy = Math.floor(p.y / CONSTANTS.GRID_CELL_SIZE);
                        if (gx > 0 && gx < cols - 1 && gy > 0 && gy < rows - 1) {
                            const idx = gy * cols + gx;
                            if (grid[idx] > 3) {
                                const densityLeft = grid[idx - 1];
                                const densityRight = grid[idx + 1];
                                const densityTop = grid[idx - cols];
                                const densityBottom = grid[idx + cols];
                                const forceX = (densityLeft - densityRight) * CONSTANTS.REPULSION_FORCE;
                                const forceY = (densityTop - densityBottom) * CONSTANTS.REPULSION_FORCE;
                                p.vx += forceX * dt; p.vy += forceY * dt;
                            }
                        }
                    }

                    if (p.isHorizontal) {
                        if (Math.abs(p.y - ceilingY) < (roomHeight * ppm * 0.15) && Math.abs(p.vx) > 0.3) { 
                            p.vy += (ceilingY - p.y) * 5.0 * dt; 
                        } else { 
                            p.vy += p.buoyancy * dt * 0.5; 
                        }
                    } else { 
                        p.vy += p.buoyancy * dt; 
                    }
                    
                    p.vx *= p.drag; p.vy *= p.drag;
                    p.x += p.vx * dt; p.y += p.vy * dt;

                    if (p.x < originX) { p.x = originX; p.vx *= -0.7; }
                    else if (p.x > rightWall) { p.x = rightWall; p.vx *= -0.7; }
                    if (p.y > floorY) { p.y = floorY; p.vy *= -0.2; p.vx *= 0.9; }
                }

                if (p.age - p.lastHistoryTime >= CONSTANTS.HISTORY_RECORD_INTERVAL) {
                    p.history.push({ x: p.x, y: p.y, age: p.age });
                    p.lastHistoryTime = p.age;
                    if (p.history.length > 20) p.history.shift();
                }
            }

            if (p.age > p.life || p.y < ceilingY - 100) {
                p.active = false; continue;
            }

            if (p.history.length > 2) {
                ctx.strokeStyle = `rgba(${p.color}, ${(1 - p.age/p.life) * 0.5})`;
                ctx.beginPath();
                const waveVal = Math.sin(p.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(p.age, 1.0);
                const wx = (p.isHorizontal && !p.isSuction) ? 0 : waveVal;
                const wy = (p.isHorizontal && !p.isSuction) ? waveVal : 0;
                ctx.moveTo(p.x + wx, p.y + wy);
                for (let j = p.history.length - 1; j >= 0; j--) {
                    const h = p.history[j];
                    const hWave = Math.sin(h.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(h.age, 1.0);
                    ctx.lineTo(h.x + ((p.isHorizontal && !p.isSuction) ? 0 : hWave), h.y + ((p.isHorizontal && !p.isSuction) ? hWave : 0));
                }
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        activeDiffusers.forEach(ad => {
             const w = (ad.perf.spec?.A / 1000 * ppm) || 20;
             ctx.fillStyle = '#475569';
             ctx.fillRect(ad.x - w/2, ceilingY + (roomHeight - diffuserHeight) * ppm, w, (ad.perf.spec?.D/1000 * ppm) || 10);
        });

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    return (
        <div className="relative w-full h-full">
            <canvas ref={canvasRef} width={props.width} height={props.height} className="block w-full h-full" />
        </div>
    );
};

const MemoizedSideViewCanvas = React.memo(SideViewCanvas);
export default MemoizedSideViewCanvas;