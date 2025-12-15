import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult, PlacedDiffuser } from '../../types';
import { Trash2, Move, Copy, X } from 'lucide-react';

const CONSTANTS = {
  DEFAULT_ROOM_HEIGHT: 3.5,
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 2000, // Reduced from 3500 for better mobile performance
  SPAWN_RATE_BASE: 5,
  SPAWN_RATE_MULTIPLIER: 8
};

// --- HELPER FUNCTIONS ---
const getGlowColor = (t: number, theme: 'light' | 'dark') => {
    // In light mode, use darker, more saturated colors for better visibility
    if (theme === 'light') {
        if (t <= 18) return `0, 160, 220`; // Deep Cyan/Blue
        if (t >= 28) return `220, 40, 80`; // Deep Red
        if (t > 18 && t < 28) return `20, 180, 100`; // Deep Green
        return `80, 80, 80`; // Dark Gray default
    }
    // Dark mode neon colors
    if (t <= 18) return `64, 224, 255`; 
    if (t >= 28) return `255, 99, 132`; 
    if (t > 18 && t < 28) return `100, 255, 160`; 
    return `255, 255, 255`;
};

const getLayout = (w: number, h: number, rw: number, rl: number, rh: number, mode: 'side' | 'top') => {
    if (mode === 'side') {
        return { ppm: h / rh, originX: 0, originY: 0 };
    } else {
        const padding = 60; 
        const availW = w - padding * 2;
        const availH = h - padding * 2;
        const ppm = Math.min(availW / rw, availH / rl);
        const roomPixW = rw * ppm;
        const roomPixH = rl * ppm;
        const originX = (w - roomPixW) / 2;
        const originY = (h - roomPixH) / 2;
        return { ppm, originX, originY };
    }
};

// --- PARTICLE POOLING SYSTEM ---
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

interface DiffuserCanvasProps {
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
  roomWidth?: number;
  roomLength?: number;
  viewMode?: 'side' | 'top';
  placedDiffusers?: PlacedDiffuser[];
  onUpdateDiffuserPos?: (id: string, x: number, y: number) => void;
  onSelectDiffuser?: (id: string) => void;
  onRemoveDiffuser?: (id: string) => void;
  onDuplicateDiffuser?: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  selectedDiffuserId?: string | null;
  showHeatmap?: boolean;
  velocityField?: number[][];
  dragPreview?: {x: number, y: number, width: number, height: number} | null;
  snapToGrid?: boolean;
  gridSnapSize?: number;
  gridStep?: number;
  theme?: 'light' | 'dark';
}

const DiffuserCanvas: React.FC<DiffuserCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    
    // --- OFFSCREEN CANVAS FOR STATIC TOP VIEW ---
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isOffscreenDirty = useRef<boolean>(true);

    // --- STRICT REF PATTERN ---
    const simulationRef = useRef(props);

    // --- PARTICLE POOL ---
    const particlePool = useRef<Particle[]>([]);

    // Init Pool Once
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

    // Sync Props to Ref
    useEffect(() => {
        const prevProps = simulationRef.current;
        simulationRef.current = props;

        // Check if we need to redraw the static background
        if (
            props.viewMode === 'top' && (
                prevProps.width !== props.width ||
                prevProps.height !== props.height ||
                prevProps.roomWidth !== props.roomWidth ||
                prevProps.roomLength !== props.roomLength ||
                prevProps.showHeatmap !== props.showHeatmap ||
                prevProps.showGrid !== props.showGrid ||
                prevProps.velocityField !== props.velocityField ||
                prevProps.theme !== props.theme
            )
        ) {
            isOffscreenDirty.current = true;
        }
    }, [props]);

    // Local state for interactions
    const [isDragging, setIsDragging] = useState(false);
    const [isStickyDrag, setIsStickyDrag] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);

    // --- REUSE PARTICLE LOGIC ---
    const spawnParticle = (p: Particle, state: DiffuserCanvasProps, ppm: number) => {
        const { physics, temp, flowType, modelId, width, height, roomHeight, diffuserHeight, theme } = state;
        
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

        // Physics gain
        const physicsAr = physics.Ar || 0; 
        const visualGain = 50.0; 
        const buoyancy = -physicsAr * (physics.v0 * physics.v0) * ppm * visualGain;

        if (flowType === 'suction') {
            isSuction = true;
            startX = Math.random() * width;
            const spawnY = Math.random() * height;
            const targetX = width / 2;
            const targetY = diffuserYPos;
            const dx = targetX - startX;
            const dy = targetY - spawnY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const force = ((physics.v0 || 0) * 500) / (dist + 10);
            vx = (dx / dist) * force;
            vy = (dy / dist) * force;
            drag = 1.0; waveAmp = 0;
            // Setup particle for suction
            p.x = startX; p.y = spawnY; p.vx = vx; p.vy = vy; p.buoyancy = 0; 
            p.drag = drag; p.age = 0; p.life = 3.0; p.color = theme === 'light' ? '100, 100, 100' : '150, 150, 150';
            p.waveFreq = waveFreq; p.wavePhase = 0; p.waveAmp = waveAmp;
            p.isHorizontal = isHorizontal; p.isSuction = isSuction;
        } else {
            // Supply Logic (Standard)
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

            p.x = startX; p.y = startY; p.vx = vx; p.vy = vy; 
            p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
            p.life = 2.0 + Math.random() * 1.5;
            p.color = getGlowColor(temp, theme || 'dark');
            p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
            p.isHorizontal = isHorizontal; p.isSuction = isSuction;
        }

        p.active = true;
        p.lastHistoryTime = 0;
        p.history.length = 0; 
    };

    const drawDiffuserSideProfile = (ctx: CanvasRenderingContext2D, cx: number, ppm: number, state: DiffuserCanvasProps) => {
        const spec = state.physics.spec;
        if (!spec || !spec.A) return;
        const theme = state.theme || 'dark';

        const scale = ppm / 1000;
        const wA = spec.A * scale;
        const hD = (spec.D || 0) * scale;
        const hC = (spec.C || 0) * scale; 
        const hTotal = hD + hC;
        const yPos = (state.roomHeight - state.diffuserHeight) * ppm;
        
        ctx.fillStyle = theme === 'light' ? '#CBD5E1' : '#334155'; // Slate-300 vs Slate-700
        ctx.fillRect(cx - (wA * 0.8)/2, 0, wA * 0.8, yPos);
        
        ctx.save();
        ctx.translate(0, yPos);
        ctx.fillStyle = theme === 'light' ? '#94A3B8' : '#475569';
        ctx.beginPath();
        ctx.rect(cx - wA/2, 0, wA, hD); ctx.fill();
        
        ctx.fillStyle = theme === 'light' ? '#64748B' : '#94a3b8';
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

    const drawSideViewGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, ppm: number, state: DiffuserCanvasProps) => {
        if (!state.showGrid) return;
        const theme = state.theme || 'dark';
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
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
            ctx.strokeStyle = theme === 'light' ? 'rgba(234, 179, 8, 0.6)' : 'rgba(255, 200, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.moveTo(0, wzY);
            ctx.lineTo(w, wzY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = theme === 'light' ? 'rgba(234, 179, 8, 0.8)' : 'rgba(255, 200, 0, 0.6)';
            ctx.font = 'bold 10px Inter';
            ctx.fillText(`РАБОЧАЯ ЗОНА (${state.workZoneHeight}м)`, 10, wzY - 5);
        }
    };

    const updateOffscreenCanvas = (state: DiffuserCanvasProps) => {
        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        const cvs = offscreenCanvasRef.current;
        if (cvs.width !== state.width || cvs.height !== state.height) {
            cvs.width = state.width;
            cvs.height = state.height;
        }
        const ctx = cvs.getContext('2d', { alpha: false });
        if (!ctx) return;

        const theme = state.theme || 'dark';

        // Clear with Theme Background
        ctx.fillStyle = theme === 'light' ? '#FFFFFF' : '#030304'; 
        ctx.fillRect(0, 0, state.width, state.height);

        const { ppm, originX, originY } = getLayout(state.width, state.height, state.roomWidth || 6, state.roomLength || 6, state.roomHeight, 'top');

        const roomPixW = (state.roomWidth || 6) * ppm;
        const roomPixL = (state.roomLength || 6) * ppm;
        
        ctx.fillStyle = theme === 'light' ? '#F1F5F9' : '#0f172a'; // Room Floor
        ctx.fillRect(originX, originY, roomPixW, roomPixL);

        // Heatmap logic preserved (colors need slight tuning for light mode opacity if needed, but standard RGBA usually works OK on light too)
        if (state.showHeatmap && state.velocityField && state.velocityField.length > 0 && state.gridStep) {
            const stepPx = state.gridStep * ppm;
            const comfortPath = new Path2D();
            const warningPath = new Path2D();
            const draftPath = new Path2D();

            for (let r = 0; r < state.velocityField.length; r++) {
                for (let c = 0; c < state.velocityField[r].length; c++) {
                    const v = state.velocityField[r][c];
                    if (v < 0.1) continue;
                    
                    const x = originX + c * stepPx;
                    const y = originY + r * stepPx;
                    const drawSize = stepPx + 0.5;

                    if (v <= 0.25) comfortPath.rect(x, y, drawSize, drawSize);
                    else if (v <= 0.5) warningPath.rect(x, y, drawSize, drawSize);
                    else draftPath.rect(x, y, drawSize, drawSize);
                }
            }

            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.fill(comfortPath);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.fill(warningPath);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.fill(draftPath);
        }

        ctx.strokeStyle = theme === 'light' ? '#CBD5E1' : '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(originX, originY, roomPixW, roomPixL);

        if (state.showGrid) {
            const rw = state.roomWidth || 6;
            const rl = state.roomLength || 6;
            const gStep = state.gridStep || 0.1;

            if (gStep < 0.2) {
                ctx.beginPath();
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.03)';
                for (let x = 0; x <= rw; x += 0.1) {
                    if (Math.abs(x % 1) > 0.01) { 
                        const px = x * ppm;
                        ctx.moveTo(originX + px, originY);
                        ctx.lineTo(originX + px, originY + roomPixL);
                    }
                }
                for (let y = 0; y <= rl; y += 0.1) {
                    if (Math.abs(y % 1) > 0.01) {
                        const py = y * ppm;
                        ctx.moveTo(originX, originY + py);
                        ctx.lineTo(originX + roomPixW, originY + py);
                    }
                }
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.12)'; 
            for (let x = 0; x <= rw; x += 1) {
                const px = x * ppm;
                ctx.moveTo(originX + px, originY);
                ctx.lineTo(originX + px, originY + roomPixL);
            }
            for (let y = 0; y <= rl; y += 1) {
                const py = y * ppm;
                ctx.moveTo(originX, originY + py);
                ctx.lineTo(originX + roomPixW, originY + py);
            }
            ctx.stroke();
        }
        
        isOffscreenDirty.current = false;
    };

    // --- MAIN ANIMATION LOOP (DEPENDENCY FREE) ---
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // READ LATEST STATE FROM REF
        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, viewMode } = state;
        const theme = state.theme || 'dark';
        
        const dt = CONSTANTS.BASE_TIME_STEP;
        const layout = getLayout(width, height, state.roomWidth || 6, state.roomLength || 6, state.roomHeight, viewMode || 'side');

        if (viewMode === 'side') {
            // SIDE VIEW LOGIC
            
            // If simulation is OFF, simply clear the canvas (removes expensive trail effect)
            if (!isPowerOn) {
                 ctx.clearRect(0, 0, width, height);
                 drawSideViewGrid(ctx, width, height, layout.ppm, state);
                 drawDiffuserSideProfile(ctx, width/2, layout.ppm, state);
                 requestRef.current = requestAnimationFrame(animate);
                 return;
            }

            // Trail effect (only when ON)
            ctx.fillStyle = theme === 'light' ? 'rgba(255,255,255,0.2)' : 'rgba(5, 5, 5, 0.2)'; 
            ctx.fillRect(0, 0, width, height);
            
            drawSideViewGrid(ctx, width, height, layout.ppm, state);

            const pool = particlePool.current;
            
            // 1. UPDATE AND SPAWN
            if (isPowerOn && isPlaying && !state.physics.error) {
                const spawnRate = Math.ceil(CONSTANTS.SPAWN_RATE_BASE + (state.physics.v0 || 0) / 2 * CONSTANTS.SPAWN_RATE_MULTIPLIER);
                let spawnedCount = 0;
                for (let i = 0; i < pool.length; i++) {
                    if (!pool[i].active) {
                        spawnParticle(pool[i], state, layout.ppm);
                        spawnedCount++;
                        if (spawnedCount >= spawnRate) break;
                    }
                }
            }

            // 2. UPDATE PHYSICS & BATCHING
            // We group particles by style key to minimize state changes
            const maxH = height;
            const batches: Record<string, Particle[]> = {};
            const QUANTIZE = 10; // Number of alpha levels

            for (let i = 0; i < pool.length; i++) {
                const p = pool[i];
                if (!p.active) continue;

                if (isPowerOn && isPlaying) {
                    p.age += dt;
                    if (p.age > p.life || p.y > maxH || p.x < 0 || p.x > width || p.y < -100) {
                        p.active = false;
                        continue;
                    }

                    if (p.isSuction) {
                        const targetX = width / 2;
                        const targetY = (state.roomHeight - state.diffuserHeight) * layout.ppm;
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
                    const rawAlpha = (1 - p.age/p.life) * 0.5;
                    // Quantize alpha to reduce draw calls
                    const alpha = Math.ceil(rawAlpha * QUANTIZE) / QUANTIZE;
                    if (alpha <= 0) continue;

                    const key = `${p.color}|${alpha}`;
                    if (!batches[key]) batches[key] = [];
                    batches[key].push(p);
                }
            }

            // 3. DRAW BATCHES
            // Dramatically reduces draw calls from 2000 to ~20-40 per frame
            ctx.globalCompositeOperation = theme === 'light' ? 'multiply' : 'screen';
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
            drawDiffuserSideProfile(ctx, width/2, layout.ppm, state);

        } else {
            // TOP VIEW LOGIC
            
            // Check dirty flag
            if (isOffscreenDirty.current) {
                updateOffscreenCanvas(state);
            }

            // Draw Background
            if (offscreenCanvasRef.current) {
                ctx.drawImage(offscreenCanvasRef.current, 0, 0);
            } else {
                ctx.fillStyle = theme === 'light' ? '#FFFFFF' : '#030304';
                ctx.fillRect(0, 0, width, height);
            }

            const { ppm, originX, originY } = layout;

            // Dynamic Diffusers
            state.placedDiffusers?.forEach(d => {
                const cx = originX + d.x * ppm;
                const cy = originY + d.y * ppm;
                
                // Draw Coverage Area (Physics-based)
                if (!state.showHeatmap) {
                    const rPx = d.performance.coverageRadius * ppm;
                    const v = d.performance.workzoneVelocity;
                    
                    let fillStyle = 'rgba(16, 185, 129, 0.15)'; 
                    let strokeStyle = 'rgba(16, 185, 129, 0.4)';
                    
                    if (v > 0.5) { 
                        fillStyle = 'rgba(239, 68, 68, 0.15)'; 
                        strokeStyle = 'rgba(239, 68, 68, 0.4)';
                    } else if (v > 0.25) { 
                        fillStyle = 'rgba(245, 158, 11, 0.15)'; 
                        strokeStyle = 'rgba(245, 158, 11, 0.4)';
                    }
                    
                    ctx.beginPath();
                    ctx.arc(cx, cy, Math.max(0, rPx), 0, Math.PI * 2);
                    ctx.fillStyle = fillStyle; 
                    ctx.fill();
                    ctx.lineWidth = 1; 
                    ctx.strokeStyle = strokeStyle; 
                    ctx.stroke();
                }

                // Draw Diffuser Body
                const dSize = (d.performance.spec.A / 1000 * ppm) || 20;
                ctx.beginPath();
                ctx.rect(cx - dSize/2, cy - dSize/2, dSize, dSize);
                
                // Highlight Selection
                if (state.selectedDiffuserId === d.id) {
                    ctx.fillStyle = '#3b82f6'; 
                    ctx.strokeStyle = theme === 'light' ? '#1e293b' : '#fff';
                    ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = theme === 'light' ? '#94a3b8' : '#475569'; 
                    ctx.strokeStyle = theme === 'light' ? '#cbd5e1' : '#94a3b8';
                    ctx.lineWidth = 1;
                }
                
                ctx.fill();
                ctx.stroke();
            });

            // Draw Drag Preview
            if (state.dragPreview) {
                const cx = originX + state.dragPreview.x * ppm;
                const cy = originY + state.dragPreview.y * ppm;
                const wPx = state.dragPreview.width * ppm; 
                const hPx = state.dragPreview.height * ppm;
                
                ctx.beginPath();
                ctx.rect(cx - wPx/2, cy - hPx/2, wPx, hPx);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        requestRef.current = requestAnimationFrame(animate);
    }, []); 

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    // ... (Interactions remain the same)
    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        let clientX, clientY;
        if ('touches' in e) {
             clientX = e.touches[0].clientX;
             clientY = e.touches[0].clientY;
        } else {
             clientX = (e as React.MouseEvent).clientX;
             clientY = (e as React.MouseEvent).clientY;
        }
        const scaleX = props.width / rect.width;
        const scaleY = props.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (props.viewMode !== 'top') return;
        e.preventDefault();
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getLayout(props.width, props.height, props.roomWidth || 6, props.roomLength || 6, props.roomHeight, 'top');

        let hitId = null;
        const diffusers = props.placedDiffusers || [];
        for (let i = diffusers.length - 1; i >= 0; i--) {
            const d = diffusers[i];
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            const hitSize = Math.max((d.performance.spec.A / 1000 * ppm), 40); 
            
            if (mouseX >= cx - hitSize/2 && mouseX <= cx + hitSize/2 && 
                mouseY >= cy - hitSize/2 && mouseY <= cy + hitSize/2) {
                hitId = d.id;
                break;
            }
        }

        if (hitId) {
            setContextMenu({ x: e.clientX, y: e.clientY, id: hitId });
            props.onSelectDiffuser && props.onSelectDiffuser(hitId);
        } else {
            setContextMenu(null);
        }
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (props.viewMode !== 'top') return;
        if ('button' in e && e.button !== 0) return;
        
        if (isStickyDrag) {
            setIsDragging(false);
            setIsStickyDrag(false);
            props.onDragEnd && props.onDragEnd();
            setContextMenu(null);
            return;
        }

        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getLayout(props.width, props.height, props.roomWidth || 6, props.roomLength || 6, props.roomHeight, 'top');

        let hitId = null;
        const diffusers = props.placedDiffusers || [];
        for (let i = diffusers.length - 1; i >= 0; i--) {
            const d = diffusers[i];
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            const hitSize = Math.max((d.performance.spec.A / 1000 * ppm), 40); 
            
            if (mouseX >= cx - hitSize/2 && mouseX <= cx + hitSize/2 && 
                mouseY >= cy - hitSize/2 && mouseY <= cy + hitSize/2) {
                hitId = d.id;
                break;
            }
        }

        if (hitId) {
            props.onSelectDiffuser && props.onSelectDiffuser(hitId);
            setIsDragging(true);
            props.onDragStart && props.onDragStart();
            const d = diffusers.find(d => d.id === hitId);
            if(d) {
                const cx = originX + d.x * ppm;
                const cy = originY + d.y * ppm;
                setDragOffset({ x: mouseX - cx, y: mouseY - cy });
            }
        } else {
            props.onSelectDiffuser && props.onSelectDiffuser(''); 
        }
        setContextMenu(null);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !props.selectedDiffuserId || props.viewMode !== 'top') return;
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getLayout(props.width, props.height, props.roomWidth || 6, props.roomLength || 6, props.roomHeight, 'top');

        let newX = (mouseX - dragOffset.x - originX) / ppm;
        let newY = (mouseY - dragOffset.y - originY) / ppm;

        if (props.snapToGrid && props.gridSnapSize) {
            newX = Math.round(newX / props.gridSnapSize) * props.gridSnapSize;
            newY = Math.round(newY / props.gridSnapSize) * props.gridSnapSize;
        }

        const rw = props.roomWidth || 6;
        const rl = props.roomLength || 6;
        newX = Math.max(0, Math.min(rw, newX));
        newY = Math.max(0, Math.min(rl, newY));

        props.onUpdateDiffuserPos && props.onUpdateDiffuserPos(props.selectedDiffuserId, newX, newY);
    };

    const handleEnd = () => {
        if (!isStickyDrag) {
            setIsDragging(false);
            props.onDragEnd && props.onDragEnd();
        }
    };

    const handleContextAction = (action: 'move' | 'delete' | 'duplicate') => {
        if (!contextMenu) return;
        
        if (action === 'move') {
            props.onSelectDiffuser && props.onSelectDiffuser(contextMenu.id);
            setIsDragging(true);
            setIsStickyDrag(true);
            props.onDragStart && props.onDragStart();
            setDragOffset({ x: 0, y: 0 }); 
        } else if (action === 'delete' && props.onRemoveDiffuser) {
            props.onRemoveDiffuser(contextMenu.id);
        } else if (action === 'duplicate' && props.onDuplicateDiffuser) {
            props.onDuplicateDiffuser(contextMenu.id);
            setIsDragging(true);
            setIsStickyDrag(true);
            props.onDragStart && props.onDragStart();
            setDragOffset({ x: 0, y: 0 }); 
        }
        setContextMenu(null);
    };

    return (
        <div className="relative w-full h-full">
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className={`block w-full h-full touch-none ${props.viewMode === 'top' ? 'cursor-crosshair' : ''}`}
                onContextMenu={handleContextMenu}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                style={{ touchAction: 'none' }}
            />
            {contextMenu && (
                <div 
                    className="fixed z-50 bg-white/90 dark:bg-[#1a1b26] border border-black/5 dark:border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-1.5 flex flex-col min-w-[160px] animate-in zoom-in-95 duration-200 origin-top-left backdrop-blur-xl"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Действия</span>
                        <button onClick={() => setContextMenu(null)} className="text-slate-500 hover:text-black dark:hover:text-white transition-colors"><X size={12}/></button>
                    </div>
                    <button onClick={() => handleContextAction('move')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors text-left">
                        <Move size={14} className="text-blue-500 dark:text-blue-400" />
                        <span>Переместить</span>
                    </button>
                    <button onClick={() => handleContextAction('duplicate')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors text-left">
                        <Copy size={14} className="text-emerald-500 dark:text-emerald-400" />
                        <span>Дублировать</span>
                    </button>
                    <button onClick={() => handleContextAction('delete')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-red-500 dark:text-red-300 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-200 transition-colors text-left">
                        <Trash2 size={14} />
                        <span>Удалить</span>
                    </button>
                </div>
            )}
            {props.physics.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-4 p-8 border border-red-500/30 bg-red-500/5 rounded-3xl text-red-600 dark:text-red-200">
                        <span className="font-bold text-xl tracking-tight">ТИПОРАЗМЕР НЕДОСТУПЕН</span>
                        <span className="text-sm opacity-70">Для выбранной модели нет данных для этого размера</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(DiffuserCanvas);