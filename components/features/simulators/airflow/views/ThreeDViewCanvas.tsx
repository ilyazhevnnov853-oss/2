
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CONSTANTS, Particle3D, ThreeDViewCanvasProps, project, spawnParticle } from '../utils/airflow3DLogic';
import ViewCube from './ViewCube';
import { PerformanceResult, PlacedDiffuser } from '@/types';

interface ExtendedThreeDProps extends ThreeDViewCanvasProps {
    placedDiffusers?: PlacedDiffuser[];
    selectedDiffuserId?: string | null;
    showRoom?: boolean;
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

    const targetCamera = useRef({ rotX: 0.5, rotY: -0.6 });
    const isDragging = useRef(false);
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (particlesRef.current.length === 0) {
            for (let i = 0; i < CONSTANTS.MAX_PARTICLES; i++) {
                particlesRef.current.push({
                    active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
                    buoyancy: 0, drag: 0, age: 0, life: 0, lastHistoryTime: 0,
                    history: [], color: '255,255,255',
                    waveFreq: 0, wavePhase: 0, waveAmp: 0, waveAngle: 0,
                    isHorizontal: false, isSuction: false
                });
            }
        }
    }, []);

    useEffect(() => { simulationRef.current = props; }, [props]);

    const handleViewChange = useCallback((rx: number, ry: number, smooth: boolean) => {
        if (smooth) targetCamera.current = { rotX: rx, rotY: ry };
        else {
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
            setCamera(prev => ({ ...prev, rotY: newRotY, rotX: newRotX }));
            targetCamera.current = { rotX: newRotX, rotY: newRotY };
        } else if (isPanning.current) {
            setCamera(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
        }
        lastMouse.current = { x: clientX, y: clientY };
    };

    const handleEnd = () => { isDragging.current = false; isPanning.current = false; };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        if (!isDragging.current) {
            const lerpFactor = 0.1;
            let diffY = targetCamera.current.rotY - camera.rotY;
            while (diffY < -Math.PI) diffY += 2 * Math.PI;
            while (diffY > Math.PI) diffY -= 2 * Math.PI;
            const diffX = targetCamera.current.rotX - camera.rotX;
            if (Math.abs(diffX) > 0.001 || Math.abs(diffY) > 0.001) {
                setCamera(prev => ({ ...prev, rotX: prev.rotX + diffX * lerpFactor, rotY: prev.rotY + diffY * lerpFactor }));
            }
        }

        const state = simulationRef.current;
        const { width, height, isPowerOn, isPlaying, roomHeight, roomWidth, roomLength, diffuserHeight, workZoneHeight } = state;
        const dt = CONSTANTS.BASE_TIME_STEP;

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = isPowerOn ? 'rgba(5, 5, 5, 0.25)' : '#030304';
        ctx.fillRect(0, 0, width, height);

        const PPM = (height / roomHeight) || 50; 
        const rw = roomWidth * PPM; const rl = roomLength * PPM; const rh = roomHeight * PPM;
        
        // COORD SYSTEM: Y=0 is Ceiling, Y=rh is Floor.
        // Diffuser Spawning Height
        const dY_pos = (roomHeight - diffuserHeight) * PPM; 
        
        const fitScale = (Math.min(width, height) / Math.max(rw, rl, rh)) * 0.65;
        const finalScale = fitScale * camera.zoom;
        const yOffset = -rh / 2; // Center the room vertically in 3D space

        // 3D Projector with centering
        const p3d = (x: number, y: number, z: number) => 
            project(x, -(y + yOffset), z, width, height, camera.rotX, camera.rotY, finalScale, camera.panX, camera.panY);

        // Draw Room Box
        if (state.showRoom !== false) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            const corners = [
                // Ceiling Corners (y=0)
                {x:-rw/2,y:0,z:-rl/2},{x:rw/2,y:0,z:-rl/2},{x:rw/2,y:0,z:rl/2},{x:-rw/2,y:0,z:rl/2},
                // Floor Corners (y=rh)
                {x:-rw/2,y:rh,z:-rl/2},{x:rw/2,y:rh,z:-rl/2},{x:rw/2,y:rh,z:rl/2},{x:-rw/2,y:rh,z:rl/2}
            ].map(v => p3d(v.x, v.y, v.z));
            
            ctx.beginPath();
            // Connect Top Face (Ceiling)
            [0,4].forEach(start => {
                ctx.moveTo(corners[start].x, corners[start].y);
                ctx.lineTo(corners[start+1].x, corners[start+1].y);
                ctx.lineTo(corners[start+2].x, corners[start+2].y);
                ctx.lineTo(corners[start+3].x, corners[start+3].y);
                ctx.closePath();
            });
            // Connect Pillars
            [0,1,2,3].forEach(i => { ctx.moveTo(corners[i].x, corners[i].y); ctx.lineTo(corners[i+4].x, corners[i+4].y); });
            ctx.stroke();

            // Work Zone (if set)
            if (workZoneHeight > 0) {
                // Work Zone Height is FROM FLOOR. So Y = RoomHeight - WorkZoneHeight
                const wy = (roomHeight - workZoneHeight) * PPM; 
                const wc = [{x:-rw/2,y:wy,z:-rl/2},{x:rw/2,y:wy,z:-rl/2},{x:rw/2,y:wy,z:rl/2},{x:-rw/2,y:wy,z:rl/2}].map(v => p3d(v.x, v.y, v.z));
                
                ctx.fillStyle = 'rgba(255, 200, 0, 0.05)';
                ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
                ctx.beginPath(); 
                ctx.moveTo(wc[0].x, wc[0].y); wc.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(wc[0].x, wc[0].y);
                ctx.fill(); ctx.stroke();
            }
        }

        const pool = particlesRef.current;
        const activeDiffusers: {x:number, z:number, perf: PerformanceResult, modelId: string, selected: boolean}[] = [];
        
        if (state.placedDiffusers && state.placedDiffusers.length > 0) {
            state.placedDiffusers.forEach(d => {
                const x3d = (d.x - roomWidth/2) * PPM;
                const z3d = (d.y - roomLength/2) * PPM; 
                activeDiffusers.push({
                    x: x3d, z: z3d, 
                    perf: d.performance, 
                    modelId: d.modelId,
                    selected: state.selectedDiffuserId === d.id
                });
            });
        } else {
            activeDiffusers.push({x:0, z:0, perf: state.physics, modelId: state.modelId, selected: true});
        }

        activeDiffusers.forEach(ad => {
            const dp = p3d(ad.x, dY_pos, ad.z);
            if (dp.s > 0) {
                ctx.beginPath(); ctx.fillStyle = ad.selected ? '#3b82f6' : '#64748b';
                const r = (ad.perf.spec?.A ? Math.sqrt(ad.perf.spec.A)/50 : 0.15) * PPM * finalScale * 0.5;
                ctx.arc(dp.x, dp.y, Math.max(3, r), 0, Math.PI * 2); ctx.fill();
            }
        });

        if (isPowerOn && isPlaying && activeDiffusers.length > 0) {
            // Aggregate spawn rate roughly
            const maxV0 = Math.max(...activeDiffusers.map(d => d.perf.v0 || 0));
            const spawnRate = Math.ceil(CONSTANTS.SPAWN_RATE_BASE + (maxV0 / 2) * CONSTANTS.SPAWN_RATE_MULTIPLIER);
            
            let spawned = 0;
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) { 
                    // Randomly select one source diffuser for this particle
                    const source = activeDiffusers[Math.floor(Math.random() * activeDiffusers.length)];
                    if (!source.perf.error) {
                        spawnParticle(pool[i], state, PPM, source.x, source.z, source.perf, source.modelId); 
                        spawned++; 
                    }
                    if (spawned >= spawnRate) break; 
                }
            }
        }

        ctx.globalCompositeOperation = 'screen';
        ctx.lineWidth = 1.5; ctx.lineCap = 'round';

        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;

            if (isPlaying) {
                p.age += dt;
                if (p.isSuction) {
                    // Simple suction logic: particles move towards source center
                    // For better multi-diffuser suction, we'd need nearest neighbor search
                    // Keeping simple drift for now
                    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
                } else {
                    // --- COANDA EFFECT (Ceiling) ---
                    // If near ceiling (y approx 0) and moving horizontally, sticking force
                    if (p.isHorizontal && p.y < rh * 0.15 && Math.abs(p.y) < 60) {
                        const horizSpeed = Math.sqrt(p.vx*p.vx + p.vz*p.vz);
                        if (horizSpeed > 0.5) {
                            // Apply lift force towards ceiling (y=0)
                            p.vy -= 10.0 * dt; 
                            // Dampen vertical velocity slightly to "stick"
                            p.vy *= 0.9;
                        }
                    }

                    // --- WALL JET EFFECT (Walls) ---
                    // Inelastic collision: cancel normal velocity, keep tangential, add turbulence
                    
                    // X-Walls
                    if (p.x < -rw/2) { 
                        p.x = -rw/2 + 1; 
                        p.vx = 0; // Kill normal velocity
                        // Add turbulence simulating boundary layer separation/vortices
                        p.vx += Math.random() * 2; 
                        p.vy += (Math.random() - 0.5) * 2; 
                        p.vz += (Math.random() - 0.5) * 2;
                        // Friction
                        p.vy *= 0.95; p.vz *= 0.95;
                    }
                    else if (p.x > rw/2) { 
                        p.x = rw/2 - 1; 
                        p.vx = 0;
                        p.vx -= Math.random() * 2;
                        p.vy += (Math.random() - 0.5) * 2; 
                        p.vz += (Math.random() - 0.5) * 2;
                        p.vy *= 0.95; p.vz *= 0.95;
                    }
                    
                    // Z-Walls
                    if (p.z < -rl/2) { 
                        p.z = -rl/2 + 1; 
                        p.vz = 0;
                        p.vz += Math.random() * 2;
                        p.vx += (Math.random() - 0.5) * 2;
                        p.vy += (Math.random() - 0.5) * 2;
                        p.vx *= 0.95; p.vy *= 0.95;
                    }
                    else if (p.z > rl/2) { 
                        p.z = rl/2 - 1; 
                        p.vz = 0;
                        p.vz -= Math.random() * 2;
                        p.vx += (Math.random() - 0.5) * 2;
                        p.vy += (Math.random() - 0.5) * 2;
                        p.vx *= 0.95; p.vy *= 0.95;
                    }

                    // --- FLOOR SPREADING (Floor) ---
                    if (p.y > rh) {
                        p.y = rh - 1;
                        // Kill vertical momentum (no bounce)
                        p.vy = 0; 
                        // High friction on floor, but allow spreading
                        p.vx *= 0.85;  
                        p.vz *= 0.85;
                        // Spread turbulence
                        p.vx += (Math.random() - 0.5) * 3;
                        p.vz += (Math.random() - 0.5) * 3;
                    }

                    // Buoyancy / General movement
                    if (!p.isHorizontal || p.y > 60) {
                         p.vy += p.buoyancy * dt; 
                    }
                    
                    p.vx *= p.drag; p.vy *= p.drag; p.vz *= p.drag;
                    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
                }

                if (p.age - p.lastHistoryTime >= CONSTANTS.HISTORY_RECORD_INTERVAL) {
                    p.history.push({ x: p.x, y: p.y, z: p.z, age: p.age });
                    p.lastHistoryTime = p.age;
                    if (p.history.length > 20) p.history.shift();
                }
            }

            // Life Check
            if (p.age > p.life) {
                p.active = false; continue;
            }

            if (p.history.length > 2) {
                const alpha = (1 - p.age/p.life) * 0.5;
                ctx.strokeStyle = `rgba(${p.color}, ${alpha})`;
                ctx.beginPath();
                
                const waveVal = Math.sin(p.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(p.age, 1.0);
                const waveAngle = p.waveAngle || 0;
                
                // Volumetric Wave Logic
                let wx = 0, wy = 0, wz = 0;
                if (!p.isSuction) {
                    if (Math.abs(p.vy) > 0.5 * (Math.abs(p.vx) + Math.abs(p.vz))) { 
                        // Vertical flow: wave in horizontal plane
                        wx = waveVal * Math.cos(waveAngle); 
                        wz = waveVal * Math.sin(waveAngle);
                    } else { 
                        // Horizontal flow: wave in vertical axis
                        wy = waveVal; 
                    }
                }

                const cur = p3d(p.x + wx, p.y + wy, p.z + wz);
                ctx.moveTo(cur.x, cur.y);
                
                for (let j = p.history.length - 1; j >= 0; j--) {
                    const h = p.history[j];
                    const hW = Math.sin(h.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(h.age, 1.0);
                    
                    let hwx = 0, hwy = 0, hwz = 0;
                    if (!p.isSuction) {
                        if (Math.abs(p.vy) > 0.5 * (Math.abs(p.vx) + Math.abs(p.vz))) { 
                             hwx = hW * Math.cos(waveAngle); 
                             hwz = hW * Math.sin(waveAngle);
                        } else { 
                             hwy = hW; 
                        }
                    }
                    
                    const prev = p3d(h.x + hwx, h.y + hwy, h.z + hwz);
                    ctx.lineTo(prev.x, prev.y);
                }
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        requestRef.current = requestAnimationFrame(animate);
    }, [camera]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [animate]);

    return (
        <div 
            className="relative w-full h-full cursor-move"
            onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
            onWheel={handleWheel} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        >
            <ViewCube rotX={camera.rotX} rotY={camera.rotY} onViewChange={handleViewChange} />
            <canvas ref={canvasRef} width={props.width} height={props.height} className="block w-full h-full pointer-events-none" />
        </div>
    );
};

export default React.memo(ThreeDViewCanvas);
