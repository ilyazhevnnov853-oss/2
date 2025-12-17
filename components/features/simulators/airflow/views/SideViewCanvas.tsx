import React, { useRef, useEffect, useCallback } from 'react';
import { PerformanceResult, PlacedDiffuser } from '../../../../../types';

const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 2000, 
  SPAWN_RATE_BASE: 5,
  SPAWN_RATE_MULTIPLIER: 8
};

// --- TYPES ---
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

// --- HELPERS ---
const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`; 
    if (t >= 28) return `255, 99, 132`; 
    if (t > 18 && t < 28) return `100, 255, 160`; 
    return `255, 255, 255`;
};

const getSideLayout = (w: number, h: number, rh: number, wallWidth: number) => {
    const padding = 40;
    const availW = w - padding * 2;
    const availH = h - padding * 2;
    // Fit both width and height
    const ppm = Math.min(availW / wallWidth, availH / rh);
    
    // Center the room
    const contentW = wallWidth * ppm;
    const contentH = rh * ppm;
    const originX = (w - contentW) / 2;
    const originY = h - (h - contentH) / 2; // Bottom aligned usually, but here Y grows down.
    // Let's align bottom of room to bottom of visible area minus padding
    const floorY = h - padding;
    const ceilingY = floorY - contentH;
    
    return { ppm, originX, floorY, ceilingY };
};

const SideViewCanvas: React.FC<SideViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const simulationRef = useRef(props);
    const particlePool = useRef<Particle[]>([]);
    
    // Init Pool
    useEffect(() => {
        if (particlePool.current.length === 0) {
            for (let i = 0; i < CONSTANTS.MAX_PARTICLES; i++) {
                particlePool.current.push({
                    active: false,
                    x: 0, y: 0, vx: 0, vy: 0,
                    buoyancy: 0, drag: 0, age: 0, life: 0,
                    lastHistoryTime: 0,
                    history: [], 
                    color: '255,255,255',
                    waveFreq: 0, wavePhase: 0, waveAmp: 0,
                    isHorizontal: false, isSuction: false
                });
            }
        }
    }, []);

    // Sync Props
    useEffect(() => {
        simulationRef.current = props;
    }, [props]);

    const spawnParticle = (p: Particle, state: SideViewCanvasProps, ppm: number, spawnX: number, spawnY: number) => {
        const { physics, temp, flowType, modelId, viewAxis } = state;
        
        if (physics.error) return;
        const spec = physics.spec;
        if (!spec || !spec.A) return;

        const nozzleW = (spec.A / 1000) * ppm;
        const pxSpeed = (physics.v0 || 0) * ppm * 0.8;

        let startX = spawnX;
        let startY = spawnY;
        let vx = 0, vy = 0;
        let drag = 0.96;
        let waveAmp = 5;
        let waveFreq = 4 + Math.random() * 4;
        let isHorizontal = false;
        let isSuction = false;

        const physicsAr = physics.Ar || 0; 
        const visualGain = 50.0; 
        const buoyancy = -physicsAr * (physics.v0 * physics.v0) * ppm * visualGain;

        if (flowType === 'suction') {
            isSuction = true;
            // Random point in room volume projected to 2D
            const wallW = viewAxis === 'front' ? state.roomWidth : state.roomLength;
            const { originX, ceilingY } = getSideLayout(state.width, state.height, state.roomHeight, wallW);
            
            startX = originX + Math.random() * (wallW * ppm);
            const currentFloorY = ceilingY + state.roomHeight * ppm;
            const randH = Math.random() * (state.roomHeight * ppm);
            startY = ceilingY + randH;

            const targetX = spawnX;
            const targetY = spawnY;
            const dx = targetX - startX;
            const dy = targetY - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const force = ((physics.v0 || 0) * 500) / (dist + 10);
            vx = (dx / dist) * force;
            vy = (dy / dist) * force;
            drag = 1.0; waveAmp = 0;
            p.life = 3.0; 
            p.color = '150, 150, 150';
            p.x = startX; p.y = startY;
        } else {
            if (flowType.includes('horizontal')) {
                isHorizontal = true;
                const side = Math.random() > 0.5 ? 1 : -1;
                startX = spawnX + side * (nozzleW * 0.55);
                const spread = (Math.random() - 0.5) * 0.1; 
                const angle = side === 1 ? spread : Math.PI + spread;
                vx = Math.cos(angle) * pxSpeed * 1.2; 
                vy = Math.sin(angle) * pxSpeed * 0.2; 
                if (flowType.includes('swirl')) { waveAmp = 15; waveFreq = 8; } else { waveAmp = 3; }
            } else if (flowType === '4-way') {
                isHorizontal = true;
                const side = Math.random() > 0.5 ? 1 : -1;
                startX = spawnX + side * (nozzleW * 0.55);
                vx = side * pxSpeed * 1.0;
                vy = pxSpeed * 0.1;
            } else if (modelId === 'dpu-m' && flowType.includes('vertical')) {
                const side = Math.random() > 0.5 ? 1 : -1;
                startX = spawnX + side * (nozzleW * 0.45);
                const coneAngle = (35 + Math.random() * 10) * (Math.PI / 180);
                vx = side * Math.sin(coneAngle) * pxSpeed;
                vy = Math.cos(coneAngle) * pxSpeed;
                waveAmp = 5; drag = 0.95;
            } else if (modelId === 'dpu-k' && flowType.includes('vertical')) {
                startX = spawnX + (Math.random() - 0.5) * nozzleW * 0.95;
                const spreadAngle = (Math.random() - 0.5) * 60 * (Math.PI / 180); 
                vx = Math.sin(spreadAngle) * pxSpeed * 0.8;
                vy = Math.cos(spreadAngle) * pxSpeed;
                waveAmp = 8; drag = 0.96;
            } else if (flowType === 'vertical-swirl') {
                startX = spawnX + (Math.random() - 0.5) * nozzleW * 0.9;
                const spread = (Math.random() - 0.5) * 1.5; 
                vx = Math.sin(spread) * pxSpeed * 0.5;
                vy = Math.cos(spread) * pxSpeed;
                waveAmp = 30 + Math.random() * 10; waveFreq = 6; drag = 0.94;
            } else if (flowType === 'vertical-compact') {
                startX = spawnX + (Math.random() - 0.5) * nozzleW * 0.95;
                const spread = (Math.random() - 0.5) * 0.05; 
                vx = Math.sin(spread) * pxSpeed * 0.3;
                vy = Math.cos(spread) * pxSpeed * 1.3; 
                waveAmp = 1; drag = 0.985;
            }

            p.life = 10.0 + Math.random() * 2.0;
            p.color = getGlowColor(temp);
            p.x = startX; p.y = startY;
        }

        p.vx = vx; p.vy = vy; 
        p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
        p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
        p.isHorizontal = isHorizontal; p.isSuction = isSuction;
        p.active = true;
        p.lastHistoryTime = 0;
        p.history.length = 0; 
    };

    const drawSideViewGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, ppm: number, originX: number, ceilingY: number, state: SideViewCanvasProps, wallW: number) => {
        // Draw Room Box
        const floorY = ceilingY + state.roomHeight * ppm;
        const roomPxW = wallW * ppm;

        // Background for room
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(originX, ceilingY, roomPxW, floorY - ceilingY);
        
        if (!state.showGrid) return;
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        const step = 0.5 * ppm;
        
        ctx.beginPath();
        // Vertical lines
        for (let x = originX; x <= originX + roomPxW; x += step) { ctx.moveTo(x, ceilingY); ctx.lineTo(x, floorY); }
        // Horizontal lines
        for (let y = ceilingY; y <= floorY; y += step) { ctx.moveTo(originX, y); ctx.lineTo(originX + roomPxW, y); }
        ctx.stroke();
        
        // Work Zone
        if (state.workZoneHeight > 0) {
            const wzY = floorY - state.workZoneHeight * ppm;
            ctx.beginPath();
            ctx.setLineDash([10, 5]);
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.moveTo(originX, wzY);
            ctx.lineTo(originX + roomPxW, wzY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
            ctx.font = 'bold 10px Inter';
            ctx.fillText(`РЗ (${state.workZoneHeight}м)`, originX + 5, wzY - 5);
        }

        // Walls
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(originX, ceilingY, roomPxW, floorY - ceilingY);
    };

    const drawDiffuser = (ctx: CanvasRenderingContext2D, cx: number, cy: number, ppm: number, isActive: boolean, spec?: any) => {
        if (!spec) return;
        const wA = (spec.A / 1000) * ppm;
        const hD = (spec.D / 1000) * ppm || 20;
        
        ctx.fillStyle = isActive ? '#3b82f6' : '#475569';
        ctx.beginPath();
        // Simple shape for now
        ctx.moveTo(cx - wA/2, cy);
        ctx.lineTo(cx + wA/2, cy);
        ctx.lineTo(cx + wA/3, cy + hD);
        ctx.lineTo(cx - wA/3, cy + hD);
        ctx.closePath();
        ctx.fill();
        if (isActive) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, viewAxis } = state;
        const dt = CONSTANTS.BASE_TIME_STEP;

        // View Layout
        // If front, X is Width. If Side, X is Length.
        const wallW = viewAxis === 'front' ? state.roomWidth : state.roomLength;
        const { ppm, originX, floorY, ceilingY } = getSideLayout(width, height, state.roomHeight, wallW);

        // Clear
        ctx.fillStyle = '#030304';
        ctx.fillRect(0, 0, width, height);

        drawSideViewGrid(ctx, width, height, ppm, originX, ceilingY, state, wallW);

        // Draw Diffusers
        // Front View: X is x-coord. Side View: X is y-coord.
        // We render ALL placed diffusers.
        const activeDiffusers: {x: number, y: number}[] = [];
        
        if (state.placedDiffusers && state.placedDiffusers.length > 0) {
            state.placedDiffusers.forEach(d => {
                // Project position
                // In plan: x is "width", y is "length"
                // Front view: X axis is Width (x).
                // Side view: X axis is Length (y).
                const posInWall = viewAxis === 'front' ? d.x : d.y;
                const cx = originX + posInWall * ppm;
                // Since Diffuser Height is parameter for ceiling mounting or drop, we use params.diffuserHeight for simplicity for the *active* one, 
                // but for placed ones we should theoretically track their height. Assuming all same height for now.
                const diffY = ceilingY + (state.roomHeight - state.diffuserHeight) * ppm; 
                
                const isSelected = state.selectedDiffuserId === d.id;
                drawDiffuser(ctx, cx, diffY, ppm, isSelected, d.performance.spec);

                if (isSelected) {
                    // Only spawn particles from the SELECTED diffuser
                    activeDiffusers.push({ x: cx, y: diffY + (d.performance.spec.D/1000 * ppm || 20) });
                }
            });
        } else {
            // Preview Mode (No placed diffusers yet, or creating one)
            // Show one in center
            const cx = originX + (wallW/2) * ppm;
            const diffY = ceilingY + (state.roomHeight - state.diffuserHeight) * ppm;
            const spec = state.physics.spec;
            drawDiffuser(ctx, cx, diffY, ppm, true, spec);
            activeDiffusers.push({ x: cx, y: diffY + ((spec?.D||50)/1000 * ppm) });
        }

        const pool = particlePool.current;
        
        // 1. UPDATE AND SPAWN
        if (isPowerOn && isPlaying && !state.physics.error && activeDiffusers.length > 0) {
            const spawnRate = Math.ceil(CONSTANTS.SPAWN_RATE_BASE + (state.physics.v0 || 0) / 2 * CONSTANTS.SPAWN_RATE_MULTIPLIER);
            let spawnedCount = 0;
            // Simple distribution: Spawn from the first active source found (usually 1 selected)
            const source = activeDiffusers[0];

            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) {
                    spawnParticle(pool[i], state, ppm, source.x, source.y);
                    spawnedCount++;
                    if (spawnedCount >= spawnRate) break;
                }
            }
        }

        // 2. UPDATE PHYSICS & BATCHING
        const batches: Record<string, Particle[]> = {};
        const QUANTIZE = 10;
        const throwLimit = state.physics.throwDist || 50;

        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;

            if (isPowerOn && isPlaying) {
                p.age += dt;
                
                // Calculate physical distance from source
                const source = activeDiffusers[0] || {x: width/2, y: 0};
                const distPx = Math.sqrt(Math.pow(p.x - source.x, 2) + Math.pow(p.y - source.y, 2));
                const distMeters = distPx / ppm;

                if (distMeters > throwLimit || p.age > p.life || p.y > floorY || p.x < originX || p.x > originX + wallW * ppm || p.y < 0) {
                    p.active = false;
                    continue;
                }

                if (p.isSuction) {
                    const dx = source.x - p.x;
                    const dy = source.y - p.y;
                    const distSq = dx*dx + dy*dy;
                    const dist = Math.sqrt(distSq);
                    if (dist < 20) { p.active = false; continue; }
                    const force = ((state.physics.v0 || 0) * 2000) / (distSq + 100);
                    p.vx += (dx / dist) * force * dt;
                    p.vy += (dy / dist) * force * dt;
                    p.x += p.vx; p.y += p.vy;
                } else {
                    if (p.isHorizontal) {
                        // Floor collision bounce/slide
                        if (p.y < (height * 0.15) && Math.abs(p.vx) > 0.3) { p.vy += (0 - p.y) * 5.0 * dt; } 
                        else { p.vy += p.buoyancy * dt * 0.5; }
                    } else {
                        p.vy += p.buoyancy * dt;
                    }
                    p.vx *= p.drag;
                    p.vy *= p.drag;
                    p.x += p.vx * dt; p.y += p.vy * dt;
                }

                if (p.age - p.lastHistoryTime >= CONSTANTS.HISTORY_RECORD_INTERVAL) {
                    if (p.history.length > 20) p.history.shift();
                    p.history.push({ x: p.x, y: p.y, age: p.age });
                    p.lastHistoryTime = p.age;
                }
            }

            // Add to Batch
            if (p.history.length > 1) {
                const source = activeDiffusers[0] || {x: width/2, y: 0};
                const distPx = Math.sqrt(Math.pow(p.x - source.x, 2) + Math.pow(p.y - source.y, 2));
                const currentDist = distPx / ppm;
                const distFactor = Math.max(0, 1 - (currentDist / throwLimit));

                const rawAlpha = Math.min(distFactor, (1 - p.age/p.life)) * 0.5;
                const alpha = Math.ceil(rawAlpha * QUANTIZE) / QUANTIZE;
                if (alpha <= 0) continue;

                const key = `${p.color}|${alpha}`;
                if (!batches[key]) batches[key] = [];
                batches[key].push(p);
            }
        }

        // 3. DRAW BATCHES
        ctx.globalCompositeOperation = 'screen';
        ctx.lineWidth = 1; 
        ctx.lineCap = 'round';

        for (const key in batches) {
            const [color, alphaStr] = key.split('|');
            ctx.strokeStyle = `rgba(${color}, ${alphaStr})`;
            ctx.beginPath();
            
            const particles = batches[key];
            for (let k = 0; k < particles.length; k++) {
                const p = particles[k];
                const waveVal = Math.sin(p.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(p.age, 1.0);
                const wx = (p.isHorizontal && !p.isSuction) ? 0 : waveVal;
                const wy = (p.isHorizontal && !p.isSuction) ? waveVal : 0;
                
                ctx.moveTo(p.x + wx, p.y + wy);
                
                for (let j = p.history.length - 1; j >= 0; j--) {
                    const h = p.history[j];
                    const hWave = Math.sin(h.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(h.age, 1.0);
                    const hwx = (p.isHorizontal && !p.isSuction) ? 0 : hWave;
                    const hwy = (p.isHorizontal && !p.isSuction) ? hWave : 0;
                    ctx.lineTo(h.x + hwx, h.y + hwy);
                }
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    return (
        <div className="relative w-full h-full">
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className="block w-full h-full touch-none"
                style={{ touchAction: 'none' }}
            />
            {props.physics.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-4 p-8 border border-red-500/30 bg-red-500/5 rounded-3xl text-red-200">
                        <span className="font-bold text-xl tracking-tight">ТИПОРАЗМЕР НЕДОСТУПЕН</span>
                        <span className="text-sm opacity-70">Для выбранной модели нет данных для этого размера</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(SideViewCanvas);