import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CONSTANTS, Particle3D, ThreeDViewCanvasProps, project, spawnParticle, updateParticlePhysics } from '../utils/airflow3DLogic';
import ViewCube from './ViewCube';

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
                    waveFreq: 0, wavePhase: 0, waveAmp: 0, waveAngle: 0,
                    isHorizontal: false, isSuction: false
                });
            }
        }
    }, []);

    useEffect(() => { simulationRef.current = props; }, [props]);

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
        const { width, height, isPowerOn, isPlaying, roomHeight, roomWidth, roomLength, workZoneHeight } = state;

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
                updateParticlePhysics(p, dt, state, PPM);
                if (p.age > p.life) p.active = false;

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
        <div 
            className="relative w-full h-full cursor-move"
            onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
            onWheel={handleWheel} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        >
            <ViewCube rotX={camera.rotX} rotY={camera.rotY} setCamera={setCamera} />
            <canvas ref={canvasRef} width={props.width} height={props.height} className="block w-full h-full pointer-events-none" />
        </div>
    );
};

const MemoizedThreeDViewCanvas = React.memo(ThreeDViewCanvas);
export default MemoizedThreeDViewCanvas;
