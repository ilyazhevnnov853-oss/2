import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult, PlacedDiffuser } from '../../types';

const CONSTANTS = {
  DEFAULT_ROOM_HEIGHT: 3.5,
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
};

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
  
  // Top View Props
  roomWidth?: number;
  roomLength?: number;
  viewMode?: 'side' | 'top';
  placedDiffusers?: PlacedDiffuser[];
  onUpdateDiffuserPos?: (id: string, x: number, y: number) => void;
  onSelectDiffuser?: (id: string) => void;
  onRemoveDiffuser?: (id: string) => void;
  selectedDiffuserId?: string | null;
  showHeatmap?: boolean;
  velocityField?: number[][];
  dragPreview?: {x: number, y: number, width: number, height: number} | null;
  snapToGrid?: boolean;
  gridSnapSize?: number;
  gridStep?: number;
}

const DiffuserCanvas: React.FC<DiffuserCanvasProps> = ({ 
    width, height, physics, isPowerOn, isPlaying, temp, roomTemp, 
    flowType, modelId, showGrid, roomHeight, diffuserHeight, workZoneHeight,
    roomWidth = 6, roomLength = 6, viewMode = 'side', placedDiffusers = [], 
    onUpdateDiffuserPos, onSelectDiffuser, selectedDiffuserId, 
    dragPreview, snapToGrid, gridSnapSize,
    showHeatmap, velocityField, gridStep
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>(0);
    const particlesRef = useRef<any[]>([]); 
    
    // State for dragging in Top View
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const getGlowColor = (t: number) => {
        if (t <= 18) return `64, 224, 255`; 
        if (t >= 28) return `255, 99, 132`;
        if (t > 18 && t < 28) return `100, 255, 160`;
        return `255, 255, 255`;
    };

    // --- Helper for Scaling ---
    const getLayout = () => {
        if (viewMode === 'side') {
            return {
                ppm: height / roomHeight,
                originX: 0,
                originY: 0
            };
        } else {
            const padding = 60; // Padding around the room in canvas pixels
            const availW = width - padding * 2;
            const availH = height - padding * 2;
            const ppm = Math.min(availW / roomWidth, availH / roomLength);
            const roomPixW = roomWidth * ppm;
            const roomPixH = roomLength * ppm;
            const originX = (width - roomPixW) / 2;
            const originY = (height - roomPixH) / 2;
            return { ppm, originX, originY };
        }
    };

    useEffect(() => {
        particlesRef.current = [];
        // Reset static background when dimensions change
        bgCanvasRef.current = null;
    }, [modelId, flowType, physics.spec?.A, diffuserHeight, viewMode, width, height, roomWidth, roomLength]);


    // --- SIDE VIEW PARTICLE LOGIC ---
    const createParticle = (ppm: number) => {
        if (physics.error) return null;
        const spec = physics.spec;
        if (!spec || !spec.A) return null; 

        const nozzleW = (spec.A / 1000) * ppm;
        const scale = ppm / 1000;
        
        const diffuserYPos = (roomHeight - diffuserHeight) * ppm;
        const hD = (spec.D || 0) * scale;
        const startY = diffuserYPos + hD;

        const pxSpeed = (physics.v0 || 0) * ppm * 0.8;
        const dtTemp = temp - roomTemp;

        let startX = width / 2;
        let vx = 0, vy = 0;
        let drag = 0.96;
        let waveAmp = 5;
        let waveFreq = 4 + Math.random() * 4;
        let isHorizontal = false;
        let isSuction = false;

        const buoyancy = -(dtTemp / 293) * 9.81 * ppm * 4.0;

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
            return { x: startX, y: spawnY, vx, vy, buoyancy: 0, drag, age: 0, life: 3.0, history: [], color: '150, 150, 150', waveFreq, wavePhase: 0, waveAmp, isHorizontal, isSuction };
        }

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

        return {
            x: startX, y: startY, vx, vy, buoyancy, drag, 
            age: 0, life: 2.0 + Math.random() * 1.5,
            lastHistoryTime: 0, history: [],
            color: getGlowColor(temp),
            waveFreq, wavePhase: Math.random() * Math.PI * 2, waveAmp, isHorizontal, isSuction
        };
    };

    const drawDiffuserSideProfile = (ctx: CanvasRenderingContext2D, cx: number, ppm: number) => {
        const spec = physics.spec;
        if (!spec || !spec.A) return;

        const scale = ppm / 1000;
        const wA = spec.A * scale;
        const hD = (spec.D || 0) * scale;
        const hC = (spec.C || 0) * scale; 
        const hTotal = hD + hC;
        
        const yPos = (roomHeight - diffuserHeight) * ppm;
        
        // Pipe
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - (wA * 0.8)/2, 0, wA * 0.8, yPos);
        
        // Body
        ctx.save();
        ctx.translate(0, yPos);
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.rect(cx - wA/2, 0, wA, hD); ctx.fill();
        
        // Face
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(cx - wA/2, hD);
        
        if (modelId === 'dpu-s') {
             ctx.lineTo(cx - wA/2 + 10, hTotal + 20);
             ctx.lineTo(cx + wA/2 - 10, hTotal + 20); ctx.lineTo(cx + wA/2, hD);
        } else if (modelId === 'amn-adn') {
             ctx.rect(cx - wA/2, hD, wA, 5*scale);
        } else {
             ctx.quadraticCurveTo(cx - wA/2, hTotal, cx, hTotal + 5);
             ctx.quadraticCurveTo(cx + wA/2, hTotal, cx + wA/2, hD);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
    };

    const drawSideGrid = (ctx: CanvasRenderingContext2D, ppm: number) => {
        if (!showGrid) return;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        const step = 0.5 * ppm;
        
        ctx.beginPath();
        for (let x = width/2; x < width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let x = width/2; x > 0; x -= step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();
        
        if (workZoneHeight > 0) {
            const wzY = (roomHeight - workZoneHeight) * ppm;
            ctx.beginPath();
            ctx.setLineDash([10, 5]);
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.moveTo(0, wzY);
            ctx.lineTo(width, wzY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
            ctx.font = '10px Inter';
            ctx.fillText(`РАБОЧАЯ ЗОНА (${workZoneHeight}м)`, 10, wzY - 5);
        }
    };

    // --- RENDER STATIC BACKGROUND (TOP VIEW) ---
    const renderStaticBackground = (ctx: CanvasRenderingContext2D, layout: any) => {
        // Clear entire canvas
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        if (viewMode === 'top') {
            const { ppm, originX, originY } = layout;
            const roomPixW = roomWidth * ppm;
            const roomPixL = roomLength * ppm;

            // Room Floor
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(originX, originY, roomPixW, roomPixL);
            
            // Room Border
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.strokeRect(originX, originY, roomPixW, roomPixL);

            // Heatmap Rendering (Simplified or Future Implementation)
            if (showHeatmap && velocityField && velocityField.length > 0 && gridStep) {
                // To implement heatmap rendering, iterate over velocityField
                // using gridStep and ppm to draw colored rects.
                // Currently placeholder or relies on placedDiffusers radius logic below for quick visualization
            }

            // Grid
            if (showGrid) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                const step = 0.5 * ppm;
                
                ctx.beginPath();
                for (let x = 0; x <= roomPixW; x += step) {
                    ctx.moveTo(originX + x, originY);
                    ctx.lineTo(originX + x, originY + roomPixL);
                }
                for (let y = 0; y <= roomPixL; y += step) {
                    ctx.moveTo(originX, originY + y);
                    ctx.lineTo(originX + roomPixW, originY + y);
                }
                ctx.stroke();
            }
        }
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dt = CONSTANTS.BASE_TIME_STEP;
        const layout = getLayout();

        if (viewMode === 'side') {
            // --- SIDE VIEW RENDER ---
            
            // Background clearing (trail effect)
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
            ctx.fillRect(0, 0, width, height);
            
            drawSideGrid(ctx, layout.ppm);

            // Simulation
            if (isPowerOn && isPlaying && !physics.error) {
                const maxParticles = 3500; 
                const spawnRate = Math.ceil(5 + (physics.v0 || 0) / 2 * 8);
                
                if (particlesRef.current.length < maxParticles) {
                    for(let i=0; i<spawnRate; i++) {
                        const p = createParticle(layout.ppm);
                        if(p) particlesRef.current.push(p);
                    }
                }
            }

            // Draw Particles
            ctx.globalCompositeOperation = 'screen';
            ctx.lineWidth = 1; 
            ctx.lineCap = 'round';

            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                let p = particlesRef.current[i];
                if (isPowerOn && isPlaying) {
                    p.age += dt;
                    if (p.isSuction) {
                        const targetX = width / 2;
                        const targetY = (roomHeight - diffuserHeight) * layout.ppm;
                        const dx = targetX - p.x;
                        const dy = targetY - p.y;
                        const distSq = dx*dx + dy*dy;
                        const dist = Math.sqrt(distSq);
                        if (dist < 20) { 
                            particlesRef.current.splice(i, 1);
                            continue;
                        }
                        const force = ((physics.v0 || 0) * 2000) / (distSq + 100);
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
                        p.history.push({ x: p.x, y: p.y, age: p.age });
                        p.lastHistoryTime = p.age;
                    }
                    if (p.history.length > 20) p.history.shift();
                }

                if (p.age > p.life || p.y > height || p.x < 0 || p.x > width || p.y < -100) {
                    particlesRef.current.splice(i, 1);
                    continue;
                }

                if (p.history.length > 2) {
                    let alpha = (1 - p.age/p.life) * 0.5;
                    ctx.strokeStyle = `rgba(${p.color}, ${alpha})`; 
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    for (let j = p.history.length - 1; j >= 0; j--) {
                        ctx.lineTo(p.history[j].x, p.history[j].y);
                    }
                    ctx.stroke();
                }
            }

            ctx.globalCompositeOperation = 'source-over';
            drawDiffuserSideProfile(ctx, width/2, layout.ppm);

        } else {
            // --- TOP VIEW RENDER ---
            
            // Use cached background if possible (not implemented here for brevity, using direct draw)
            renderStaticBackground(ctx, layout);

            const { ppm, originX, originY } = layout;

            // Draw Placed Diffusers
            placedDiffusers.forEach(d => {
                const cx = originX + d.x * ppm;
                const cy = originY + d.y * ppm;
                
                // Draw Coverage Area (Physics-based)
                const rPx = d.performance.coverageRadius * ppm;
                const v = d.performance.workzoneVelocity;
                
                let fillStyle = 'rgba(16, 185, 129, 0.15)'; // Greenish (Comfort)
                let strokeStyle = 'rgba(16, 185, 129, 0.4)';
                
                // Velocity color coding
                if (v > 0.5) { 
                    fillStyle = 'rgba(239, 68, 68, 0.15)'; // Red (Draft)
                    strokeStyle = 'rgba(239, 68, 68, 0.4)';
                } else if (v > 0.25) { 
                    fillStyle = 'rgba(245, 158, 11, 0.15)'; // Amber (Warning)
                    strokeStyle = 'rgba(245, 158, 11, 0.4)';
                }

                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(0, rPx), 0, Math.PI * 2);
                ctx.fillStyle = fillStyle; 
                ctx.fill();
                ctx.lineWidth = 1; 
                ctx.strokeStyle = strokeStyle; 
                ctx.stroke();

                // Draw Diffuser Body
                const dSize = (d.performance.spec.A / 1000 * ppm) || 20;
                ctx.beginPath();
                ctx.rect(cx - dSize/2, cy - dSize/2, dSize, dSize);
                
                // Highlight Selection
                if (selectedDiffuserId === d.id) {
                    ctx.fillStyle = '#3b82f6'; // Blue
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = '#475569'; // Slate
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                }
                
                ctx.fill();
                ctx.stroke();
            });

            // Draw Drag Preview
            if (dragPreview) {
                const cx = originX + dragPreview.x * ppm;
                const cy = originY + dragPreview.y * ppm;
                const wPx = dragPreview.width * ppm; // width in meters * ppm
                const hPx = dragPreview.height * ppm;
                
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
    }, [width, height, isPowerOn, isPlaying, physics, temp, roomTemp, flowType, modelId, showGrid, roomHeight, diffuserHeight, workZoneHeight, viewMode, roomWidth, roomLength, placedDiffusers, selectedDiffuserId, dragPreview]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);


    // --- MOUSE HANDLERS (TOP VIEW) ---
    const getMousePos = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (viewMode !== 'top' || e.button !== 0) return;
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getLayout();

        // Hit detection reversed to select top-most
        let hitId = null;
        for (let i = placedDiffusers.length - 1; i >= 0; i--) {
            const d = placedDiffusers[i];
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            const hitSize = Math.max((d.performance.spec.A / 1000 * ppm), 40); // Minimum hit area
            
            if (mouseX >= cx - hitSize/2 && mouseX <= cx + hitSize/2 && 
                mouseY >= cy - hitSize/2 && mouseY <= cy + hitSize/2) {
                hitId = d.id;
                break;
            }
        }

        if (hitId) {
            onSelectDiffuser && onSelectDiffuser(hitId);
            setIsDragging(true);
            const d = placedDiffusers.find(d => d.id === hitId);
            if(d) {
                const cx = originX + d.x * ppm;
                const cy = originY + d.y * ppm;
                setDragOffset({ x: mouseX - cx, y: mouseY - cy });
            }
        } else {
            onSelectDiffuser && onSelectDiffuser(''); // Deselect
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedDiffuserId || viewMode !== 'top') return;
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getLayout();

        let newX = (mouseX - dragOffset.x - originX) / ppm;
        let newY = (mouseY - dragOffset.y - originY) / ppm;

        if (snapToGrid && gridSnapSize) {
            newX = Math.round(newX / gridSnapSize) * gridSnapSize;
            newY = Math.round(newY / gridSnapSize) * gridSnapSize;
        }

        // Clamp to room
        newX = Math.max(0, Math.min(roomWidth, newX));
        newY = Math.max(0, Math.min(roomLength, newY));

        onUpdateDiffuserPos && onUpdateDiffuserPos(selectedDiffuserId, newX, newY);
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <canvas 
            ref={canvasRef} 
            width={width} 
            height={height} 
            className={`block w-full h-full touch-none ${viewMode === 'top' ? 'cursor-crosshair' : ''}`}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    );
};

export default React.memo(DiffuserCanvas);