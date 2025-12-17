import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CONSTANTS, Particle3D, ThreeDViewCanvasProps, project, spawnParticle } from '../utils/airflow3DLogic';
import ViewCube from './ViewCube';
import { PlacedDiffuser } from '../../../../../types';

interface ExtendedThreeDProps extends ThreeDViewCanvasProps {
    placedDiffusers?: PlacedDiffuser[];
    selectedDiffuserId?: string | null;
}

const ThreeDViewCanvas: React.FC<ExtendedThreeDProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const simulationRef = useRef(props);
    const particlesRef = useRef<Particle3D[]>([]);
    
    // Camera State
    const [camera, setCamera] = useState({ 
        rotX: 0.5, 
        rotY: -0.6, 
        panX: 0, 
        panY: 0, 
        zoom: 1.0 
    });

    // Target Camera for Smooth Tweening
    const targetCamera = useRef({ 
        rotX: 0.5, 
        rotY: -0.6 
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

    // Handle ViewCube Rotation Changes
    const handleViewChange = useCallback((rx: number, ry: number, smooth: boolean) => {
        if (smooth) {
            // Update target for lerping
            targetCamera.current = { rotX: rx, rotY: ry };
        } else {
            // Instant update (for dragging)
            setCamera(prev => ({ ...prev, rotX: rx, rotY: ry }));
            targetCamera.current = { rotX: rx, rotY: ry };
        }
    }, []);

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
        
        // Sync target on drag start to prevent jumping
        targetCamera.current = { rotX: camera.rotX, rotY: camera.rotY };
        
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
            const newRotY = camera.rotY + dx * 0.005;
            const newRotX = Math.max(-1.5, Math.min(1.5, camera.rotX + dy * 0.005));
            
            // Update both to keep them in sync during drag
            setCamera(prev => ({ ...prev, rotY: newRotY, rotX: newRotX }));
            targetCamera.current = { rotX: newRotX, rotY: newRotY };
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

        // --- CAMERA INTERPOLATION (LERP) ---
        if (!isDragging.current) {
            const lerpFactor = 0.1;
            
            // Normalize angles for shortest path interpolation
            let diffY = targetCamera.current.rotY - camera.rotY;
            // Wrap diffY to -PI to +PI
            while (diffY < -Math.PI) diffY += 2 * Math.PI;
            while (diffY > Math.PI) diffY -= 2 * Math.PI;

            const diffX = targetCamera.current.rotX - camera.rotX;

            if (Math.abs(diffX) > 0.001 || Math.abs(diffY) > 0.001) {
                setCamera(prev => ({
                    ...prev,
                    rotX: prev.rotX + diffX * lerpFactor,
                    rotY: prev.rotY + diffY * lerpFactor
                }));
            }
        }

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

        // --- DRAW ROOM (Always visible) ---
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

        // --- DRAW DIFFUSERS ---
        // Render placed diffusers
        let activeSpawnX = 0;
        let activeSpawnZ = 0;
        let hasActiveDiffuser = false;

        const drawDiffuserMarker = (x3d: number, z3d: number, isActive: boolean, spec: any) => {
            const dp = p3d(x3d, diffY, z3d);
            if (dp.s > 0) {
                ctx.beginPath();
                ctx.fillStyle = isActive ? '#3b82f6' : '#64748b';
                const r = (spec?.A ? Math.sqrt(spec.A)/50 : 0.15) * PPM * finalScale * 0.5; // Scale radius by size
                ctx.arc(dp.x, dp.y, Math.max(3, r), 0, Math.PI * 2);
                ctx.fill();
                
                // Stem to ceiling if suspended
                if (diffuserHeight < roomHeight) {
                    const ceilP = p3d(x3d, rh, z3d);
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                    ctx.lineWidth = 1;
                    ctx.moveTo(dp.x, dp.y);
                    ctx.lineTo(ceilP.x, ceilP.y);
                    ctx.stroke();
                }
            }
        };

        if (state.placedDiffusers && state.placedDiffusers.length > 0) {
            state.placedDiffusers.forEach(d => {
                const x3d = (d.x - roomWidth/2) * PPM;
                const z3d = (d.y - roomLength/2) * PPM;
                
                const isSelected = state.selectedDiffuserId === d.id;
                drawDiffuserMarker(x3d, z3d, isSelected, d.performance.spec);

                if (isSelected) {
                    activeSpawnX = x3d;
                    activeSpawnZ = z3d;
                    hasActiveDiffuser = true;
                }
            });
        } else {
            // Preview Mode: Draw one at center
            drawDiffuserMarker(0, 0, true, state.physics.spec);
            hasActiveDiffuser = true; // Use center
        }

        // --- PARTICLES (Only when Power ON) ---
        const pool = particlesRef.current;
        const dt = CONSTANTS.BASE_TIME_STEP;

        if (isPowerOn && hasActiveDiffuser) {
            if (isPlaying && !state.physics.error) {
                const spawnRate = Math.ceil(CONSTANTS.SPAWN_RATE_BASE + (state.physics.v0 || 0) / 2 * CONSTANTS.SPAWN_RATE_MULTIPLIER);
                let spawnedCount = 0;
                for (let i = 0; i < pool.length; i++) {
                    if (!pool[i].active) {
                        spawnParticle(pool[i], state, PPM, activeSpawnX, activeSpawnZ);
                        spawnedCount++;
                        if (spawnedCount >= spawnRate) break;
                    }
                }
            }

            const batches: Record<string, Particle3D[]> = {};
            const QUANTIZE = 10;
            const throwLimit = state.physics.throwDist || 50;

            for (let i = 0; i < pool.length; i++) {
                const p = pool[i];
                if (!p.active) continue;

                if (isPlaying) {
                    p.age += dt;
                    
                    // Check physical distance from source
                    const dx = p.x - activeSpawnX;
                    const dy = diffY - p.y;
                    const dz = p.z - activeSpawnZ;
                    const distFromOrigin = Math.sqrt(dx*dx + dy*dy + dz*dz) / PPM;

                    if (distFromOrigin > throwLimit || p.age > p.life || p.y < 0 || p.y > rh || Math.abs(p.x) > rw/2 || Math.abs(p.z) > rl/2) {
                        p.active = false;
                        continue;
                    }

                    if (p.isSuction) {
                        const dxS = activeSpawnX - p.x;
                        const dyS = diffY - p.y;
                        const dzS = activeSpawnZ - p.z;
                        const dSq = dxS*dxS + dyS*dyS + dzS*dzS;
                        const dist = Math.sqrt(dSq);
                        if (dist < 20) { p.active = false; continue; }
                        const force = ((state.physics.v0 || 0) * 2000) / (dSq + 100);
                        p.vx += (dxS/dist)*force*dt;
                        p.vy += (dyS/dist)*force*dt;
                        p.vz += (dzS/dist)*force*dt;
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
                    // Fade out near end of throw distance
                    const dx = p.x - activeSpawnX;
                    const dy = diffY - p.y;
                    const dz = p.z - activeSpawnZ;
                    const currentDist = Math.sqrt(dx*dx + dy*dy + dz*dz) / PPM;
                    const distFactor = Math.max(0, 1 - (currentDist / throwLimit));
                    
                    const rawAlpha = Math.min(distFactor, (1 - p.age/p.life)) * 0.5;
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
        <div 
            className="relative w-full h-full cursor-move"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onWheel={handleWheel}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            <ViewCube rotX={camera.rotX} rotY={camera.rotY} onViewChange={handleViewChange} />
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className="block w-full h-full pointer-events-none"
            />
        </div>
    );
};

export default React.memo(ThreeDViewCanvas);