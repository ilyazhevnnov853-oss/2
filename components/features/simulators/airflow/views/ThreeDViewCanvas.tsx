import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult } from '../../../../../types';

const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  MAX_PARTICLES: 1500, 
  HISTORY_LENGTH: 12,
  SPAWN_RATE: 3
};

interface Particle3D {
    active: boolean;
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    age: number; life: number;
    color: string;
    size: number;
    history: {x: number, y: number, z: number}[];
    turbulence: number;
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
    
    // Avoid division by zero or negative behind camera
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
    if (t <= 18) return `64, 224, 255`; // Cold Blue
    if (t >= 28) return `255, 99, 132`; // Hot Red
    if (t > 18 && t < 28) return `100, 255, 160`; // Comfort Green
    return `255, 255, 255`;
};

const ThreeDViewCanvas: React.FC<ThreeDViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const simulationRef = useRef(props);
    const particlesRef = useRef<Particle3D[]>([]);
    
    // Camera State
    const [camera, setCamera] = useState({ 
        rotX: 0.2, 
        rotY: -0.5, 
        panX: 0, 
        panY: 0, 
        zoom: 1 
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
                    age: 0, life: 0,
                    color: '255,255,255',
                    size: 1,
                    history: [],
                    turbulence: Math.random()
                });
            }
        }
    }, []);

    // Sync Props
    useEffect(() => { simulationRef.current = props; }, [props]);

    // Input Handlers
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = -Math.sign(e.deltaY) * 0.1;
        setCamera(prev => ({
            ...prev,
            zoom: Math.max(0.1, Math.min(5, prev.zoom + delta))
        }));
    }, []);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
            // Middle mouse or Shift+Left for panning
            if ((e as React.MouseEvent).button === 1 || (e as React.MouseEvent).shiftKey) {
                isPanning.current = true;
            } else {
                isDragging.current = true;
            }
        }
        // Touch defaults to drag for now
        if ('touches' in e) isDragging.current = true;

        lastMouse.current = { x: clientX, y: clientY };
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging.current && !isPanning.current) return;
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
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

    const handleEnd = () => {
        isDragging.current = false;
        isPanning.current = false;
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, roomHeight, roomWidth, roomLength, diffuserHeight, workZoneHeight = 0 } = state;
        
        // Trail Effect (instead of solid clear)
        ctx.fillStyle = 'rgba(3, 3, 4, 0.25)';
        ctx.fillRect(0, 0, width, height);

        // --- COORDINATE SYSTEM ---
        const PPM = 80; // Simulation scale (Pixels Per Meter)
        
        const rw = roomWidth * PPM;
        const rl = roomLength * PPM;
        const rh = roomHeight * PPM;
        
        // Calculate Scale to fit room in view
        const maxDim = Math.max(rw, rl, rh);
        const fitScale = (Math.min(width, height) / maxDim) * 0.6; 
        
        // Combined Scale
        const finalScale = fitScale * camera.zoom;

        const diffY = (diffuserHeight) * PPM; 

        // Center vertically based on room height
        const yOffset = -rh/2;

        const proj = (p: {x:number, y:number, z:number}) => 
            project(
                p.x, -(p.y + yOffset), p.z, 
                width, height, 
                camera.rotX, camera.rotY, 
                finalScale,
                camera.panX, camera.panY
            );

        // --- DRAW GRID & ROOM ---
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Floor & Ceiling Corners
        const corners = [
            {x: -rw/2, y: 0, z: -rl/2}, {x: rw/2, y: 0, z: -rl/2}, {x: rw/2, y: 0, z: rl/2}, {x: -rw/2, y: 0, z: rl/2}, // Floor
            {x: -rw/2, y: rh, z: -rl/2}, {x: rw/2, y: rh, z: -rl/2}, {x: rw/2, y: rh, z: rl/2}, {x: -rw/2, y: rh, z: rl/2}, // Ceiling
        ];
        const pc = corners.map(proj);

        // Draw Box
        ctx.beginPath();
        // Floor
        ctx.moveTo(pc[0].x, pc[0].y); ctx.lineTo(pc[1].x, pc[1].y); ctx.lineTo(pc[2].x, pc[2].y); ctx.lineTo(pc[3].x, pc[3].y); ctx.closePath();
        // Ceiling
        ctx.moveTo(pc[4].x, pc[4].y); ctx.lineTo(pc[5].x, pc[5].y); ctx.lineTo(pc[6].x, pc[6].y); ctx.lineTo(pc[7].x, pc[7].y); ctx.closePath();
        // Verticals
        ctx.moveTo(pc[0].x, pc[0].y); ctx.lineTo(pc[4].x, pc[4].y);
        ctx.moveTo(pc[1].x, pc[1].y); ctx.lineTo(pc[5].x, pc[5].y);
        ctx.moveTo(pc[2].x, pc[2].y); ctx.lineTo(pc[6].x, pc[6].y);
        ctx.moveTo(pc[3].x, pc[3].y); ctx.lineTo(pc[7].x, pc[7].y);
        ctx.stroke();

        // Floor Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        const gridStep = 1 * PPM; 
        for(let x = -rw/2; x <= rw/2; x+=gridStep) {
            const p1 = proj({x, y:0, z: -rl/2});
            const p2 = proj({x, y:0, z: rl/2});
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        }
        for(let z = -rl/2; z <= rl/2; z+=gridStep) {
            const p1 = proj({x: -rw/2, y:0, z});
            const p2 = proj({x: rw/2, y:0, z});
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();

        // Draw Diffuser
        const dPos = {x: 0, y: diffY, z: 0};
        const pDiff = proj(dPos);
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(pDiff.x, pDiff.y, Math.max(2, 8 * pDiff.s), 0, Math.PI*2);
        ctx.fill();

        // --- PARTICLE LOGIC ---
        if (isPowerOn && isPlaying && !state.physics.error) {
            const dt = CONSTANTS.BASE_TIME_STEP;
            const buoyancy = (state.physics.Ar || 0) * 9.81 * PPM * 0.5;
            let spawned = 0;
            const v0 = state.physics.v0 || 0;
            const color = getGlowColor(state.temp);

            for (let i = 0; i < particlesRef.current.length; i++) {
                const p = particlesRef.current[i];
                
                // Spawn
                if (!p.active && spawned < CONSTANTS.SPAWN_RATE) {
                    p.active = true;
                    p.x = 0; p.y = diffY - 2; p.z = 0;
                    p.life = 1.5 + Math.random() * 1.0;
                    p.age = 0;
                    p.color = color;
                    p.history = [];
                    
                    const speed = v0 * PPM;
                    const angle = Math.random() * Math.PI * 2;
                    let spread = 0.15 + Math.random() * 0.1;
                    
                    if (state.flowType.includes('swirl')) spread = 0.5 + Math.random() * 0.5;
                    
                    p.vx = Math.cos(angle) * speed * spread;
                    p.vz = Math.sin(angle) * speed * spread;
                    p.vy = -speed; // Down

                    if (state.flowType.includes('swirl')) {
                        const swirlStr = 0.3;
                        p.vx += Math.sin(angle) * speed * swirlStr;
                        p.vz += -Math.cos(angle) * speed * swirlStr;
                        p.vy *= 0.6;
                    }

                    spawned++;
                }

                if (p.active) {
                    p.history.push({x: p.x, y: p.y, z: p.z});
                    if (p.history.length > CONSTANTS.HISTORY_LENGTH) p.history.shift();

                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.z += p.vz * dt;
                    p.vy += buoyancy * dt;

                    // Swirl effect
                    if (state.flowType.includes('swirl')) {
                        const rot = 1.5 * dt;
                        const nx = p.x * Math.cos(rot) - p.z * Math.sin(rot);
                        const nz = p.x * Math.sin(rot) + p.z * Math.cos(rot);
                        p.x = nx; p.z = nz;
                    }

                    p.vx *= 0.96; p.vz *= 0.96; p.vy *= 0.98;
                    p.age += dt;

                    if (p.y < 0) {
                        p.y = 0; p.vy = 0;
                        p.vx *= 0.8; p.vz *= 0.8;
                    }
                    if (p.age > p.life) p.active = false;
                }
            }
        }

        // --- RENDER PARTICLES ---
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';

        const activeParticles = particlesRef.current.filter(p => p.active && p.history.length > 1);
        // Simple Z-sort
        activeParticles.sort((a, b) => {
            // Sort by current Z distance to camera
            const pa = proj({x: a.x, y: a.y, z: a.z});
            const pb = proj({x: b.x, y: b.y, z: b.z});
            return pb.z - pa.z; 
        });

        for (const p of activeParticles) {
            const alpha = Math.max(0, 1 - p.age / p.life);
            ctx.beginPath();
            
            // Draw Trail
            let started = false;
            for (const h of p.history) {
                const pp = proj(h);
                if (pp.s <= 0) continue; // Clipped
                if (!started) { ctx.moveTo(pp.x, pp.y); started = true; }
                else ctx.lineTo(pp.x, pp.y);
            }
            
            const cur = proj({x: p.x, y: p.y, z: p.z});
            if (started && cur.s > 0) {
                ctx.lineTo(cur.x, cur.y);
                ctx.strokeStyle = `rgba(${p.color}, ${alpha * 0.7})`;
                ctx.lineWidth = Math.max(1, 2 * cur.s); 
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';

        // Draw Work Zone
        const wzY = workZoneHeight * PPM;
        if (wzY < rh) {
            const wzCorners = [
                {x: -rw/2, y: wzY, z: -rl/2}, {x: rw/2, y: wzY, z: -rl/2},
                {x: rw/2, y: wzY, z: rl/2}, {x: -rw/2, y: wzY, z: rl/2}
            ].map(proj);

            ctx.fillStyle = 'rgba(255, 200, 0, 0.05)';
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
            ctx.beginPath();
            ctx.moveTo(wzCorners[0].x, wzCorners[0].y);
            ctx.lineTo(wzCorners[1].x, wzCorners[1].y);
            ctx.lineTo(wzCorners[2].x, wzCorners[2].y);
            ctx.lineTo(wzCorners[3].x, wzCorners[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
            ctx.font = '10px Inter';
            ctx.fillText(`РАБОЧАЯ ЗОНА (${workZoneHeight}м)`, wzCorners[3].x + 10, wzCorners[3].y);
        }

        // HUD
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px Inter';
        ctx.fillText(`ЛКМ: Вращение | ПКМ/Shift: Сдвиг | Колесо: Зум`, 20, height - 20);

        requestRef.current = requestAnimationFrame(animate);
    }, [camera]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    return (
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
    );
};

export default React.memo(ThreeDViewCanvas);