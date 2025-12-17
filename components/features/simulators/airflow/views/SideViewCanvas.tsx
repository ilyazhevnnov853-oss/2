import React, { useRef, useEffect, useCallback } from 'react';
import { PerformanceResult } from '../../../../../types';

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
  diffuserHeight: number; 
  workZoneHeight: number;
}

// --- HELPERS ---
const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`; 
    if (t >= 28) return `255, 99, 132`; 
    if (t > 18 && t < 28) return `100, 255, 160`; 
    return `255, 255, 255`;
};

const getSideLayout = (w: number, h: number, rh: number) => {
    return { ppm: h / rh };
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

    const spawnParticle = (p: Particle, state: SideViewCanvasProps, ppm: number) => {
        const { physics, temp, flowType, modelId, width, roomHeight, diffuserHeight } = state;
        
        if (physics.error) return;
        const spec = physics.spec;
        if (!spec || !spec.A) return;

        const nozzleW = (spec.A / 1000) * ppm;
        const scale = ppm / 1000;
        
        const diffuserYPos = (roomHeight - diffuserHeight) * ppm;
        const hD = (spec.D || 0) * scale;
        const startY = diffuserYPos + hD;

        const pxSpeed = (physics.v0 || 0) * ppm * 0.8;

        let startX = width / 2;
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
            startX = Math.random() * width;
            const spawnY = Math.random() * state.height;
            const targetX = width / 2;
            const targetY = diffuserYPos;
            const dx = targetX - startX;
            const dy = targetY - spawnY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const force = ((physics.v0 || 0) * 500) / (dist + 10);
            vx = (dx / dist) * force;
            vy = (dy / dist) * force;
            drag = 1.0; waveAmp = 0;
            p.life = 3.0; 
            p.color = '150, 150, 150';
        } else {
            if (flowType.includes('horizontal')) {
                isHorizontal = true;
                const side = Math.random() > 0.5 ? 1 : -1;
                startX = width/2 + side * (nozzleW * 0.55);
                const spread = (Math.random() - 0.5) * 0.1; 
                const angle = side === 1 ? spread : Math.PI + spread;
                vx = Math.cos(angle) * pxSpeed * 1.2; 
                vy = Math.sin(angle) * pxSpeed * 0.2; 
                if (flowType.includes('swirl')) { waveAmp = 15; waveFreq = 8; } else { waveAmp = 3; }
            } else if (flowType === '4-way') {
                isHorizontal = true;
                const side = Math.random() > 0.5 ? 1 : -1;
                startX = width/2 + side * (nozzleW * 0.55);
                vx = side * pxSpeed * 1.0;
                vy = pxSpeed * 0.1;
            } else if (modelId === 'dpu-m' && flowType.includes('vertical')) {
                const side = Math.random() > 0.5 ? 1 : -1;
                startX = width/2 + side * (nozzleW * 0.45);
                const coneAngle = (35 + Math.random() * 10) * (Math.PI / 180);
                vx = side * Math.sin(coneAngle) * pxSpeed;
                vy = Math.cos(coneAngle) * pxSpeed;
                waveAmp = 5; drag = 0.95;
            } else if (modelId === 'dpu-k' && flowType.includes('vertical')) {
                startX = width/2 + (Math.random() - 0.5) * nozzleW * 0.95;
                const spreadAngle = (Math.random() - 0.5) * 60 * (Math.PI / 180); 
                vx = Math.sin(spreadAngle) * pxSpeed * 0.8;
                vy = Math.cos(spreadAngle) * pxSpeed;
                waveAmp = 8; drag = 0.96;
            } else if (flowType === 'vertical-swirl') {
                startX = width/2 + (Math.random() - 0.5) * nozzleW * 0.9;
                const spread = (Math.random() - 0.5) * 1.5; 
                vx = Math.sin(spread) * pxSpeed * 0.5;
                vy = Math.cos(spread) * pxSpeed;
                waveAmp = 30 + Math.random() * 10; waveFreq = 6; drag = 0.94;
            } else if (flowType === 'vertical-compact') {
                startX = width/2 + (Math.random() - 0.5) * nozzleW * 0.95;
                const spread = (Math.random() - 0.5) * 0.05; 
                vx = Math.sin(spread) * pxSpeed * 0.3;
                vy = Math.cos(spread) * pxSpeed * 1.3; 
                waveAmp = 1; drag = 0.985;
            }

            // Extended life so distance clipping works
            p.life = 10.0 + Math.random() * 2.0;
            p.color = getGlowColor(temp);
        }

        p.x = startX; p.y = startY; p.vx = vx; p.vy = vy; 
        p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
        p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
        p.isHorizontal = isHorizontal; p.isSuction = isSuction;
        p.active = true;
        p.lastHistoryTime = 0;
        p.history.length = 0; 
    };

    const drawDiffuserSideProfile = (ctx: CanvasRenderingContext2D, cx: number, ppm: number, state: SideViewCanvasProps) => {
        const spec = state.physics.spec;
        if (!spec || !spec.A) return;

        const scale = ppm / 1000;
        const wA = spec.A * scale;
        const hD = (spec.D || 0) * scale;
        const hC = (spec.C || 0) * scale; 
        const hTotal = hD + hC;
        const yPos = (state.roomHeight - state.diffuserHeight) * ppm;
        
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - (wA * 0.8)/2, 0, wA * 0.8, yPos);
        
        ctx.save();
        ctx.translate(0, yPos);
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.rect(cx - wA/2, 0, wA, hD); ctx.fill();
        
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(cx - wA/2, hD);
        
        if (state.modelId === 'dpu-s') {
             ctx.lineTo(cx - wA/2 + 10, hTotal + 20);
             ctx.lineTo(cx + wA/2 - 10, hTotal + 20); ctx.lineTo(cx + wA/2, hD);
        } else if (state.modelId === 'amn-adn') {
             ctx.rect(cx - wA/2, hD, wA, 5*scale);
        } else {
             ctx.quadraticCurveTo(cx - wA/2, hTotal, cx, hTotal + 5);
             ctx.quadraticCurveTo(cx + wA/2, hTotal, cx + wA/2, hD);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
    };

    const drawSideViewGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, ppm: number, state: SideViewCanvasProps) => {
        if (!state.showGrid) return;
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        const step = 0.5 * ppm;
        
        ctx.beginPath();
        for (let x = w/2; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let x = w/2; x > 0; x -= step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
        
        if (state.workZoneHeight > 0) {
            const wzY = (state.roomHeight - state.workZoneHeight) * ppm;
            ctx.beginPath();
            ctx.setLineDash([10, 5]);
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.moveTo(0, wzY);
            ctx.lineTo(w, wzY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
            ctx.font = 'bold 10px Inter';
            ctx.fillText(`РАБОЧАЯ ЗОНА (${state.workZoneHeight}м)`, 10, wzY - 5);
        }
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, roomHeight, diffuserHeight } = state;
        
        const dt = CONSTANTS.BASE_TIME_STEP;
        const { ppm } = getSideLayout(width, height, roomHeight);
        const diffuserYPos = (roomHeight - diffuserHeight) * ppm;

        // If simulation is OFF, simply clear the canvas
        if (!isPowerOn) {
                ctx.clearRect(0, 0, width, height);
                // Fill bg for better clear
                ctx.fillStyle = '#030304';
                ctx.fillRect(0, 0, width, height);
                drawSideViewGrid(ctx, width, height, ppm, state);
                drawDiffuserSideProfile(ctx, width/2, ppm, state);
                requestRef.current = requestAnimationFrame(animate);
                return;
        }

        // Trail effect
        ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; 
        ctx.fillRect(0, 0, width, height);
        
        drawSideViewGrid(ctx, width, height, ppm, state);

        const pool = particlePool.current;
        
        // 1. UPDATE AND SPAWN
        if (isPowerOn && isPlaying && !state.physics.error) {
            const spawnRate = Math.ceil(CONSTANTS.SPAWN_RATE_BASE + (state.physics.v0 || 0) / 2 * CONSTANTS.SPAWN_RATE_MULTIPLIER);
            let spawnedCount = 0;
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) {
                    spawnParticle(pool[i], state, ppm);
                    spawnedCount++;
                    if (spawnedCount >= spawnRate) break;
                }
            }
        }

        // 2. UPDATE PHYSICS & BATCHING
        const maxH = height;
        const batches: Record<string, Particle[]> = {};
        const QUANTIZE = 10;
        const throwLimit = state.physics.throwDist || 50;

        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;

            if (isPowerOn && isPlaying) {
                p.age += dt;
                
                // Calculate physical distance from diffuser origin
                // Origin X is center (width/2), Origin Y is diffuserYPos
                const distPx = Math.sqrt(Math.pow(p.x - width/2, 2) + Math.pow(p.y - diffuserYPos, 2));
                const distMeters = distPx / ppm;

                if (distMeters > throwLimit || p.age > p.life || p.y > maxH || p.x < 0 || p.x > width || p.y < -100) {
                    p.active = false;
                    continue;
                }

                if (p.isSuction) {
                    const targetX = width / 2;
                    const targetY = diffuserYPos;
                    const dx = targetX - p.x;
                    const dy = targetY - p.y;
                    const distSq = dx*dx + dy*dy;
                    const dist = Math.sqrt(distSq);
                    if (dist < 20) { 
                        p.active = false;
                        continue;
                    }
                    const force = ((state.physics.v0 || 0) * 2000) / (distSq + 100);
                    p.vx += (dx / dist) * force * dt;
                    p.vy += (dy / dist) * force * dt;
                    p.x += p.vx; 
                    p.y += p.vy;
                } else {
                    if (p.isHorizontal) {
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
                // Fade out near end of throw distance
                const distPx = Math.sqrt(Math.pow(p.x - width/2, 2) + Math.pow(p.y - diffuserYPos, 2));
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
        drawDiffuserSideProfile(ctx, width/2, ppm, state);

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