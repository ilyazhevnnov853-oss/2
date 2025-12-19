import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult } from '../../../../../types';

const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 2000, 
  SPAWN_RATE_BASE: 5,
  SPAWN_RATE_MULTIPLIER: 8
};

// --- TYPES ---
interface Particle3D {
    active: boolean;
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    buoyancy: number; 
    drag: number; 
    age: number; 
    life: number; 
    lastHistoryTime: number; 
    history: {x: number, y: number, z: number, age: number}[]; 
    color: string; 
    waveFreq: number; 
    wavePhase: number; 
    waveAmp: number;
    isSuction: boolean;
}

interface ThreeDViewCanvasProps {
  width: number; 
  height: number;
  physics: PerformanceResult;
  isPowerOn: boolean; 
  isPlaying: boolean;
  temp: number; 
  roomTemp: number;
  flowType: string; 
  modelId: string;
  roomHeight: number; 
  roomWidth: number;
  roomLength: number;
  diffuserHeight: number;
  workZoneHeight: number;
}

// 3D Projection Helper
const project = (
    x: number, y: number, z: number, 
    w: number, h: number, 
    rotX: number, rotY: number, 
    scale: number,
    panX: number, panY: number
) => {
    // 1. Rotate Y (Azimuth)
    const cx = Math.cos(rotY);
    const sx = Math.sin(rotY);
    const x1 = x * cx - z * sx;
    const z1 = z * cx + x * sx;

    // 2. Rotate X (Elevation)
    const cy = Math.cos(rotX);
    const sy = Math.sin(rotX);
    const y2 = y * cy - z1 * sy;
    const z2 = z1 * cy + y * sy;

    // 3. Perspective
    const fov = 1000;
    const cameraDist = 1500; 
    
    const depth = cameraDist + z2;
    if (depth < 10) return { x: -10000, y: -10000, s: 0, z: z2 }; // Clipped

    const factor = (fov / depth) * scale;

    return {
        x: w / 2 + panX + x1 * factor,
        y: h / 2 + panY + y2 * factor, 
        s: factor,
        z: z2 
    };
};

const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`; 
    if (t >= 28) return `255, 99, 132`; 
    if (t > 18 && t < 28) return `100, 255, 160`; 
    return `255, 255, 255`;
};

// --- VIEW CUBE COMPONENT ---
const ViewCube = ({ rotX, rotY, setCamera }: { rotX: number, rotY: number, setCamera: any }) => {
    const size = 60; // px
    const offset = size / 2;
    
    // Invert Y rotation to match CSS coordinate system with Canvas projection
    const rX = rotX * (180 / Math.PI);
    const rY = -rotY * (180 / Math.PI);

    const faceStyle = "absolute inset-0 flex items-center justify-center border border-slate-300/50 bg-white/90 backdrop-blur-md text-[9px] font-extrabold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer select-none uppercase tracking-wider shadow-[inset_0_0_10px_rgba(0,0,0,0.05)]";

    const snap = (rx: number, ry: number) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setCamera((prev: any) => ({ ...prev, rotX: rx, rotY: ry }));
    };

    return (
        <div className="absolute top-6 right-6 w-[60px] h-[60px] z-50 group" style={{ perspective: '300px' }}>
            {/* Compass Ring */}
            <div className="absolute inset-[-10px] rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div 
                className="relative w-full h-full transform-3d transition-transform duration-100 ease-linear"
                style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: `rotateX(${rX}deg) rotateY(${rY}deg)`
                }}
            >
                {/* FRONT (0, 0) */}
                <div className={faceStyle} style={{ transform: `translateZ(${offset}px)` }} onClick={snap(0, 0)}>
                    ПЕРЕД
                </div>

                {/* BACK (0, PI) */}
                <div className={faceStyle} style={{ transform: `rotateY(180deg) translateZ(${offset}px)` }} onClick={snap(0, Math.PI)}>
                    ТЫЛ
                </div>

                {/* RIGHT (0, -PI/2) */}
                <div className={faceStyle} style={{ transform: `rotateY(90deg) translateZ(${offset}px)` }} onClick={snap(0, -Math.PI/2)}>
                    ПРАВО
                </div>

                {/* LEFT (0, PI/2) */}
                <div className={faceStyle} style={{ transform: `rotateY(-90deg) translateZ(${offset}px)` }} onClick={snap(0, Math.PI/2)}>
                    ЛЕВО
                </div>

                {/* TOP (PI/2, 0) */}
                <div className={faceStyle} style={{ transform: `rotateX(90deg) translateZ(${offset}px)` }} onClick={snap(Math.PI/2, 0)}>
                    ВЕРХ
                </div>

                {/* BOTTOM (-PI/2, 0) */}
                <div className={faceStyle} style={{ transform: `rotateX(-90deg) translateZ(${offset}px)` }} onClick={snap(-Math.PI/2, 0)}>
                    НИЗ
                </div>
            </div>
        </div>
    );
};

const ThreeDViewCanvas: React.FC<ThreeDViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const simulationRef = useRef(props);
    const particlesRef = useRef<Particle3D[]>([]);
    
    // Camera State
    const [camera, setCamera] = useState({ 
        rotX: 0.3, 
        rotY: -0.6, 
        panX: 0, 
        panY: 0, 
        zoom: 1.0 
    });
    
    const isDragging = useRef(false);
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    // Init Pool
    useEffect(() => {
        if (particlesRef.current.length === 0) {
            for (let i = 0; i < CONSTANTS.MAX_PARTICLES; i++) {
                particlesRef.current.push({
                    active: false,
                    x: 0, y: 0, z: 0,
                    vx: 0, vy: 0, vz: 0,
                    buoyancy: 0, drag: 0, age: 0, life: 0,
                    lastHistoryTime: 0,
                    history: [], 
                    color: '255,255,255',
                    waveFreq: 0, wavePhase: 0, waveAmp: 0,
                    isSuction: false
                });
            }
        }
    }, []);

    // Sync Props
    useEffect(() => { simulationRef.current = props; }, [props]);

    // --- PHYSICS SPAWN LOGIC ---
    const spawnParticle = (p: Particle3D, state: ThreeDViewCanvasProps, PPM: number) => {
        const { physics, temp, flowType, modelId, roomHeight, diffuserHeight } = state;
        
        if (physics.error) return;
        const spec = physics.spec;
        if (!spec || !spec.A) return;
        
        const nozzleW = (spec.A / 1000) * PPM;
        const startY = (diffuserHeight * PPM); 
        
        const pxSpeed = (physics.v0 || 0) * PPM * 0.8;

        let startX = 0, startZ = 0;
        let vx = 0, vy = 0, vz = 0;
        let drag = 0.96;
        let waveAmp = 5;
        let waveFreq = 4 + Math.random() * 4;
        let isSuction = false;

        const physicsAr = physics.Ar || 0; 
        const visualGain = 50.0; 
        const buoyancy = physicsAr * (physics.v0 * physics.v0) * PPM * visualGain;

        if (flowType === 'suction') {
            isSuction = true;
            startX = (Math.random() - 0.5) * state.roomWidth * PPM;
            startZ = (Math.random() - 0.5) * state.roomLength * PPM;
            const spawnH = Math.random() * startY;
            
            p.x = startX; p.y = spawnH; p.z = startZ;
            
            const dx = 0 - startX;
            const dy = startY - spawnH;
            const dz = 0 - startZ;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            const force = ((physics.v0 || 0) * 500) / (dist + 10);
            
            p.vx = (dx / dist) * force;
            p.vy = (dy / dist) * force;
            p.vz = (dz / dist) * force;
            
            drag = 1.0; waveAmp = 0;
            p.life = 3.0; 
            p.color = '150, 150, 150';
        } else {
            let angle = Math.random() * Math.PI * 2; 
            let radSpeed = 0;
            let vertSpeed = 0;

            if (flowType.includes('horizontal') || flowType === '4-way') {
                if (flowType === '4-way') {
                    const quad = Math.floor(Math.random() * 4);
                    const baseAngle = quad * (Math.PI / 2);
                    const spread = (Math.random() - 0.5) * 0.2; 
                    angle = baseAngle + spread;
                    radSpeed = pxSpeed * 1.0;
                    vertSpeed = -pxSpeed * 0.1;
                } else {
                    radSpeed = pxSpeed * 1.2;
                    vertSpeed = -pxSpeed * 0.2;
                }
                
                startX = Math.cos(angle) * (nozzleW * 0.55);
                startZ = Math.sin(angle) * (nozzleW * 0.55);
                
                if (flowType.includes('swirl')) { 
                    waveAmp = 15; waveFreq = 8; 
                } else { 
                    waveAmp = 3; 
                }

            } else if (modelId === 'dpu-m' && flowType.includes('vertical')) {
                const coneAngle = (35 + Math.random() * 10) * (Math.PI / 180);
                const speed = pxSpeed;
                radSpeed = Math.sin(coneAngle) * speed;
                vertSpeed = -Math.cos(coneAngle) * speed;
                waveAmp = 5; drag = 0.95;

            } else if (modelId === 'dpu-k' && flowType.includes('vertical')) {
                const spreadAngle = (Math.random() - 0.5) * 60 * (Math.PI / 180);
                startX = (Math.random() - 0.5) * nozzleW * 0.95; 
                startZ = (Math.random() - 0.5) * nozzleW * 0.95;
                const rSpd = Math.sin(spreadAngle) * pxSpeed * 0.8; 
                radSpeed = Math.abs(rSpd);
                vertSpeed = -Math.cos(spreadAngle) * pxSpeed;
                waveAmp = 8; drag = 0.96;

            } else if (flowType === 'vertical-swirl') {
                startX = (Math.random() - 0.5) * nozzleW * 0.9;
                startZ = (Math.random() - 0.5) * nozzleW * 0.9;
                const spread = (Math.random() - 0.5) * 1.5;
                radSpeed = Math.sin(spread) * pxSpeed * 0.5;
                vertSpeed = -Math.cos(spread) * pxSpeed;
                waveAmp = 30 + Math.random() * 10; waveFreq = 6; drag = 0.94;
            } else {
                startX = (Math.random() - 0.5) * nozzleW * 0.95;
                startZ = (Math.random() - 0.5) * nozzleW * 0.95;
                const spread = (Math.random() - 0.5) * 0.05;
                radSpeed = Math.sin(spread) * pxSpeed * 0.3;
                vertSpeed = -Math.cos(spread) * pxSpeed * 1.3;
                waveAmp = 1; drag = 0.985;
            }

            vx = Math.cos(angle) * radSpeed;
            vz = Math.sin(angle) * radSpeed;
            vy = vertSpeed;

            if (flowType.includes('swirl')) {
                const swirlSpeed = pxSpeed * 0.5;
                vx += -Math.sin(angle) * swirlSpeed;
                vz += Math.cos(angle) * swirlSpeed;
            }

            p.x = startX; p.y = startY; p.z = startZ;
            p.life = 2.0 + Math.random() * 1.5;
            p.color = getGlowColor(temp);
        }

        p.vx = vx; p.vy = vy; p.vz = vz;
        p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
        p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
        p.isSuction = isSuction;
        p.active = true;
        p.lastHistoryTime = 0;
        p.history.length = 0; 
    };

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = -Math.sign(e.deltaY) * 0.1;
        setCamera(prev => ({ ...prev, zoom: Math.max(0.1, Math.min(5, prev.zoom + delta)) }));
    }, []);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
            isDragging.current = true;
        } else {
            clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY;
            if ((e as React.MouseEvent).button === 1 || (e as React.MouseEvent).shiftKey) isPanning.current = true;
            else isDragging.current = true;
        }
        lastMouse.current = { x: clientX, y: clientY };
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging.current && !isPanning.current) return;
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY;
        }
        const dx = clientX - lastMouse.current.x;
        const dy = clientY - lastMouse.current.y;
        
        if (isDragging.current) {
            setCamera(prev => ({
                ...prev,
                rotY: prev.rotY + dx * 0.005,
                rotX: Math.max(-1.5, Math.min(1.5, prev.rotX + dy * 0.005))
            }));
        } else if (isPanning.current) {
            setCamera(prev => ({
                ...prev,
                panX: prev.panX + dx,
                panY: prev.panY + dy
            }));
        }
        lastMouse.current = { x: clientX, y: clientY };
    };

    const handleEnd = () => { isDragging.current = false; isPanning.current = false; };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, roomHeight, roomWidth, roomLength, diffuserHeight, workZoneHeight } = state;

        if (!isPowerOn) {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#030304';
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.fillStyle = 'rgba(5, 5, 5, 0.25)';
            ctx.fillRect(0, 0, width, height);
        }

        const PPM = (height / roomHeight) || 50; 
        
        const rw = roomWidth * PPM;
        const rl = roomLength * PPM;
        const rh = roomHeight * PPM;
        const diffY = diffuserHeight * PPM;

        const maxDim = Math.max(rw, rl, rh);
        const fitScale = (Math.min(width, height) / maxDim) * 0.65;
        const finalScale = fitScale * camera.zoom;
        const yOffset = -rh / 2;

        const p3d = (x: number, y: number, z: number) => 
            project(x, -(y + yOffset), z, width, height, camera.rotX, camera.rotY, finalScale, camera.panX, camera.panY);

        // --- DRAW ROOM ---
        if (isPowerOn) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            const corners = [
                {x: -rw/2, y: 0, z: -rl/2}, {x: rw/2, y: 0, z: -rl/2}, {x: rw/2, y: 0, z: rl/2}, {x: -rw/2, y: 0, z: rl/2},
                {x: -rw/2, y: rh, z: -rl/2}, {x: rw/2, y: rh, z: -rl/2}, {x: rw/2, y: rh, z: rl/2}, {x: -rw/2, y: rh, z: rl/2}
            ].map(v => p3d(v.x, v.y, v.z));

            ctx.beginPath();
            [0,4].forEach(start => {
                ctx.moveTo(corners[start].x, corners[start].y);
                ctx.lineTo(corners[start+1].x, corners[start+1].y);
                ctx.lineTo(corners[start+2].x, corners[start+2].y);
                ctx.lineTo(corners[start+3].x, corners[start+3].y);
                ctx.closePath();
            });
            [0,1,2,3].forEach(i => {
                ctx.moveTo(corners[i].x, corners[i].y);
                ctx.lineTo(corners[i+4].x, corners[i+4].y);
            });
            ctx.stroke();

            if (workZoneHeight > 0) {
                const wy = workZoneHeight * PPM;
                const wc = [
                    {x: -rw/2, y: wy, z: -rl/2}, {x: rw/2, y: wy, z: -rl/2},
                    {x: rw/2, y: wy, z: rl/2}, {x: -rw/2, y: wy, z: rl/2}
                ].map(v => p3d(v.x, v.y, v.z));
                
                ctx.fillStyle = 'rgba(255, 200, 0, 0.05)';
                ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
                ctx.beginPath();
                ctx.moveTo(wc[0].x, wc[0].y); ctx.lineTo(wc[1].x, wc[1].y); ctx.lineTo(wc[2].x, wc[2].y); ctx.lineTo(wc[3].x, wc[3].y);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
        }

        const pool = particlesRef.current;
        const dt = CONSTANTS.BASE_TIME_STEP;

        if (isPowerOn && isPlaying && !state.physics.error) {
            const spawnRate = Math.ceil(CONSTANTS.SPAWN_RATE_BASE + (state.physics.v0 || 0) / 2 * CONSTANTS.SPAWN_RATE_MULTIPLIER);
            let spawnedCount = 0;
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) {
                    spawnParticle(pool[i], state, PPM);
                    spawnedCount++;
                    if (spawnedCount >= spawnRate) break;
                }
            }
        }

        const batches: Record<string, Particle3D[]> = {};
        const QUANTIZE = 10;

        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;

            if (isPowerOn && isPlaying) {
                p.age += dt;
                
                if (p.age > p.life || p.y < 0 || p.y > rh || Math.abs(p.x) > rw/2 || Math.abs(p.z) > rl/2) {
                    p.active = false;
                    continue;
                }

                if (p.isSuction) {
                    const dx = 0 - p.x;
                    const dy = diffY - p.y;
                    const dz = 0 - p.z;
                    const dSq = dx*dx + dy*dy + dz*dz;
                    const dist = Math.sqrt(dSq);
                    if (dist < 20) { p.active = false; continue; }
                    const force = ((state.physics.v0 || 0) * 2000) / (dSq + 100);
                    p.vx += (dx/dist)*force*dt;
                    p.vy += (dy/dist)*force*dt;
                    p.vz += (dz/dist)*force*dt;
                    p.x += p.vx; p.y += p.vy; p.z += p.vz;
                } else {
                    p.vy += p.buoyancy * dt; 
                    p.vx *= p.drag; p.vy *= p.drag; p.vz *= p.drag;
                    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
                }

                if (p.age - p.lastHistoryTime >= CONSTANTS.HISTORY_RECORD_INTERVAL) {
                    if (p.history.length > 20) p.history.shift();
                    p.history.push({ x: p.x, y: p.y, z: p.z, age: p.age });
                    p.lastHistoryTime = p.age;
                }
            }

            if (p.history.length > 1) {
                const rawAlpha = (1 - p.age/p.life) * 0.5;
                const alpha = Math.ceil(rawAlpha * QUANTIZE) / QUANTIZE;
                if (alpha <= 0) continue;
                const key = `${p.color}|${alpha}`;
                if (!batches[key]) batches[key] = [];
                batches[key].push(p);
            }
        }

        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';

        for (const key in batches) {
            const [color, alphaStr] = key.split('|');
            ctx.strokeStyle = `rgba(${color}, ${alphaStr})`;
            ctx.lineWidth = 1.5; 
            ctx.beginPath();

            const group = batches[key];
            for (let k = 0; k < group.length; k++) {
                const p = group[k];
                const waveVal = Math.sin(p.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(p.age, 1.0);
                
                let wx = 0, wy = 0, wz = 0;
                if (Math.abs(p.vy) > Math.abs(p.vx) + Math.abs(p.vz)) {
                    wx = waveVal * Math.cos(p.wavePhase); 
                    wz = waveVal * Math.sin(p.wavePhase);
                } else {
                    wy = waveVal;
                }
                if (p.isSuction) { wx=0; wy=0; wz=0; }

                const cur = p3d(p.x + wx, p.y + wy, p.z + wz);
                if (cur.s <= 0) continue;

                ctx.moveTo(cur.x, cur.y);

                for (let j = p.history.length - 1; j >= 0; j--) {
                    const h = p.history[j];
                    const hWave = Math.sin(h.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(h.age, 1.0);
                    let hwx = 0, hwy = 0, hwz = 0;
                    if (Math.abs(p.vy) > Math.abs(p.vx) + Math.abs(p.vz)) {
                        hwx = hWave * Math.cos(p.wavePhase);
                        hwz = hWave * Math.sin(p.wavePhase);
                    } else {
                        hwy = hWave;
                    }
                    if (p.isSuction) { hwx=0; hwy=0; hwz=0; }

                    const prev = p3d(h.x + hwx, h.y + hwy, h.z + hwz);
                    ctx.lineTo(prev.x, prev.y);
                }
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
        
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px Inter';
        ctx.fillText(`ЛКМ: Вращение | ПКМ: Сдвиг | Колесо: Зум`, 20, height - 20);

        requestRef.current = requestAnimationFrame(animate);
    }, [camera]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [animate]);

    return (
        <div className="relative w-full h-full">
            <ViewCube rotX={camera.rotX} rotY={camera.rotY} setCamera={setCamera} />
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className="block w-full h-full cursor-move touch-none"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onWheel={handleWheel}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            />
        </div>
    );
};

export default React.memo(ThreeDViewCanvas);