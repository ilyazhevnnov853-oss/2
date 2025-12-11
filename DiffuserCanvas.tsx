import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CONSTANTS } from '../../constants';
import { PerformanceResult, PlacedDiffuser } from '../../types';
import { AlertTriangle } from 'lucide-react';

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
  roomWidth: number;
  roomLength: number;
  diffuserHeight: number;
  workZoneHeight: number;
  viewMode: 'side' | 'top';
  placedDiffusers: PlacedDiffuser[];
  onUpdateDiffuserPos: (id: string, x: number, y: number) => void;
  onSelectDiffuser: (id: string) => void;
  onRemoveDiffuser: (id: string) => void;
  selectedDiffuserId: string | null;
  showHeatmap?: boolean;
  velocityField?: number[][];
  gridStep?: number;
  dragPreview?: {x: number, y: number} | null;
  snapToGrid?: boolean;
  gridSnapSize?: number;
}

const DiffuserCanvas: React.FC<DiffuserCanvasProps> = ({ 
  width, height, physics, isPowerOn, isPlaying, temp, roomTemp, 
  flowType, modelId, showGrid, roomHeight, roomWidth, roomLength, diffuserHeight, workZoneHeight,
  viewMode, placedDiffusers, onUpdateDiffuserPos, onSelectDiffuser, onRemoveDiffuser, selectedDiffuserId,
  showHeatmap = false, velocityField = [], gridStep = 0.5, dragPreview = null, snapToGrid = false, gridSnapSize = 0.5
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const particlesRef = useRef<any[]>([]); 
    
    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const getGlowColor = (t: number) => {
        if (t <= 18) return `64, 224, 255`; // Cyan for cold
        if (t >= 28) return `255, 99, 132`; // Red for hot
        if (t > 18 && t < 28) return `100, 255, 160`; // Green for comfort
        return `255, 255, 255`;
    };

    useEffect(() => {
        particlesRef.current = [];
    }, [modelId, flowType, physics.spec?.A, diffuserHeight, viewMode]); 

    // Scale Logic
    const getScale = () => {
        if (viewMode === 'side') return height / roomHeight;
        
        const padding = 60;
        const availableW = width - padding * 2;
        const availableH = height - padding * 2;
        
        // Fit both width and length
        const ppm = Math.min(availableW / roomWidth, availableH / roomLength);
        return ppm;
    };
    
    const ppm = getScale();

    // ==========================================
    // SIDE VIEW LOGIC
    // ==========================================
    const createParticle = () => {
        if (physics.error) return null; 

        const spec = physics.spec;
        if (!spec || !spec.A) return null; 

        const nozzleW = (spec.A / 1000) * ppm;
        const diffuserYPos = (roomHeight - diffuserHeight) * ppm;
        
        const scale = ppm / 1000;
        const hD = spec.D * scale;
        const startY = diffuserYPos + hD; 

        const pxSpeed = physics.v0 * ppm * 0.8; 
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
            const force = (physics.v0 * 500) / (dist + 10); 
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

    const drawDiffuserSide = (ctx: CanvasRenderingContext2D, cx: number) => {
        const spec = physics.spec;
        if (!spec || !spec.A) return;

        const scale = ppm / 1000;
        const wA = spec.A * scale;
        const hD = spec.D * scale;
        const hC = spec.C * scale; 
        const hTotal = hD + hC;
        
        const yPos = (roomHeight - diffuserHeight) * ppm;

        // Pipe
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - (wA * 0.8)/2, 0, wA * 0.8, yPos);

        ctx.save();
        ctx.translate(0, yPos);
        
        // Body
        ctx.fillStyle = '#475569'; ctx.beginPath();
        ctx.rect(cx - wA/2, 0, wA, hD); ctx.fill();
        
        // Face
        ctx.fillStyle = '#94a3b8'; ctx.beginPath();
        ctx.moveTo(cx - wA/2, hD);
        
        if (modelId === 'dpu-s') {
             ctx.lineTo(cx - wA/2 + 10, hTotal + 20); ctx.lineTo(cx + wA/2 - 10, hTotal + 20); ctx.lineTo(cx + wA/2, hD);
        } else if (modelId === 'amn-adn') {
             ctx.rect(cx - wA/2, hD, wA, 5*scale);
        } else {
             ctx.quadraticCurveTo(cx - wA/2, hTotal, cx, hTotal + 5); 
             ctx.quadraticCurveTo(cx + wA/2, hTotal, cx + wA/2, hD);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        if (!showGrid) return;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        const step = 0.5 * ppm; 
        ctx.beginPath();
        
        if (viewMode === 'side') {
            for (let x = width/2; x < width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
            for (let x = width/2; x > 0; x -= step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
            for (let y = 0; y < height; y += step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        } else {
             // Grid relative to Top View Room Origin (centered)
            const roomPixW = roomWidth * ppm;
            const roomPixL = roomLength * ppm;
            const startX = (width - roomPixW) / 2;
            const startY = (height - roomPixL) / 2;
            
            for (let x = 0; x <= roomPixW; x += step) { ctx.moveTo(startX + x, startY); ctx.lineTo(startX + x, startY + roomPixL); }
            for (let y = 0; y <= roomPixL; y += step) { ctx.moveTo(startX, startY + y); ctx.lineTo(startX + roomPixW, startY + y); }
        }
        ctx.stroke();

        if (viewMode === 'side' && workZoneHeight > 0) {
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

    const drawOffState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);
        const time = Date.now() / 2000;
        const scanY = (time % 1) * height;
        const grad = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0)');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 50, width, 100);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.font = '700 32px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("СИСТЕМА ОТКЛЮЧЕНА", width/2, height/2);
    }

    // ==========================================
    // TOP VIEW RENDER
    // ==========================================
    const renderTopView = (ctx: CanvasRenderingContext2D) => {
        const roomPixW = roomWidth * ppm;
        const roomPixL = roomLength * ppm;
        const originX = (width - roomPixW) / 2;
        const originY = (height - roomPixL) / 2;

        // Draw Floor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(originX, originY, roomPixW, roomPixL);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(originX, originY, roomPixW, roomPixL);

        // Draw Dimensions
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${roomWidth}m`, width/2, originY - 10);
        
        ctx.save();
        ctx.translate(originX - 10, height/2);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = 'center';
        ctx.fillText(`${roomLength}m`, 0, 0); 
        ctx.restore();
        
        // Draw Heatmap (if enabled)
        if (showHeatmap && velocityField && velocityField.length > 0) {
            const cellSize = gridStep * ppm;
            
            velocityField.forEach((row, rowIdx) => {
                row.forEach((velocity, colIdx) => {
                    const x = originX + colIdx * cellSize;
                    const y = originY + rowIdx * cellSize;
                    
                    // Color based on velocity
                    let color;
                    if (velocity < 0.15) {
                        // Blue - weak flow
                        const alpha = (velocity / 0.15) * 0.3;
                        color = `rgba(59, 130, 246, ${alpha})`;
                    } else if (velocity < 0.25) {
                        // Green - comfort
                        color = `rgba(16, 185, 129, 0.3)`;
                    } else if (velocity < 0.5) {
                        // Yellow - warning
                        color = `rgba(245, 158, 11, 0.4)`;
                    } else {
                        // Red - draft
                        color = `rgba(239, 68, 68, 0.5)`;
                    }
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, cellSize, cellSize);
                });
            });
        }

        // Draw Diffusers
        placedDiffusers.forEach(d => {
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            
            // Coverage Zone (Intersection with Work Zone)
            const rPx = d.performance.coverageRadius * ppm;
            
            // Color based on Work Zone Velocity
            // Green (< 0.2 m/s) to Yellow (0.2-0.5) to Red (> 0.5)
            const v = d.performance.workzoneVelocity;
            let fillStyle = 'rgba(16, 185, 129, 0.15)'; // Green
            let strokeStyle = 'rgba(16, 185, 129, 0.4)';
            
            if (v > 0.5) {
                fillStyle = 'rgba(239, 68, 68, 0.15)'; // Red
                strokeStyle = 'rgba(239, 68, 68, 0.4)';
            } else if (v > 0.25) {
                fillStyle = 'rgba(245, 158, 11, 0.15)'; // Amber
                strokeStyle = 'rgba(245, 158, 11, 0.4)';
            }

            // Draw Influence Area
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(0, rPx), 0, Math.PI * 2);
            ctx.fillStyle = fillStyle;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();

            // Diffuser Body
            const isSelected = selectedDiffuserId === d.id;
            ctx.beginPath();
            // Draw a square or circle for the diffuser itself
            const dSize = (d.performance.spec.A / 1000 * ppm) || 20;
            ctx.rect(cx - dSize/2, cy - dSize/2, dSize, dSize);
            ctx.fillStyle = isSelected ? '#3b82f6' : '#475569';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = isSelected ? '#fff' : '#94a3b8';
            ctx.stroke();

            // Index
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.index.toString(), cx, cy);

            // Velocity Label if selected
            if (isSelected) {
                const labelW = 100;
                const labelH = 40;
                ctx.fillStyle = 'rgba(0,0,0,0.9)';
                ctx.fillRect(cx - labelW/2, cy - dSize/2 - labelH - 5, labelW, labelH);
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.strokeRect(cx - labelW/2, cy - dSize/2 - labelH - 5, labelW, labelH);
                
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.font = '10px Inter';
                ctx.fillText(`ID: ${d.index} | Ø${d.diameter}`, cx, cy - dSize/2 - labelH + 12);
                ctx.fillStyle = '#34d399';
                ctx.fillText(`V_rz: ${v.toFixed(2)} m/s`, cx, cy - dSize/2 - labelH + 24);
                ctx.fillStyle = '#60a5fa';
                ctx.fillText(`R_rz: ${d.performance.coverageRadius.toFixed(1)} m`, cx, cy - dSize/2 - labelH + 36);
            }
        });
        
        // Draw Drag Preview
        if (dragPreview) {
            const cx = originX + dragPreview.x * ppm;
            const cy = originY + dragPreview.y * ppm;
            const dSize = 30; // approximate size
            
            // Semi-transparent square
            ctx.beginPath();
            ctx.rect(cx - dSize/2, cy - dSize/2, dSize, dSize);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Plus sign in center
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy);
            ctx.lineTo(cx + 8, cy);
            ctx.moveTo(cx, cy - 8);
            ctx.lineTo(cx, cy + 8);
            ctx.stroke();
        }
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dt = CONSTANTS.BASE_TIME_STEP;

        if (!isPowerOn && viewMode === 'side') {
            drawOffState(ctx, width, height);
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; 
        ctx.fillRect(0, 0, width, height);
        
        // Clear fully for crisp rendering in top view or high refresh
        if (viewMode === 'top') {
             ctx.fillStyle = '#050505';
             ctx.fillRect(0, 0, width, height);
        }

        drawGrid(ctx, width, height);

        if (viewMode === 'side') {
            if (isPlaying && !physics.error) {
                const maxParticles = 3500; 
                const spawnRate = Math.ceil(5 + (physics.v0 / 2) * 8); 
                
                if (particlesRef.current.length < maxParticles) {
                    for(let i=0; i<spawnRate; i++) {
                        const p = createParticle();
                        if(p) particlesRef.current.push(p);
                    }
                }
            }

            ctx.globalCompositeOperation = 'screen'; 
            ctx.lineWidth = 1; 
            ctx.lineCap = 'round';

            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                let p = particlesRef.current[i];
                
                if (isPlaying) {
                    p.age += dt;
                    
                    if (p.isSuction) {
                        const targetX = width / 2;
                        const targetY = (roomHeight - diffuserHeight) * ppm;
                        const dx = targetX - p.x;
                        const dy = targetY - p.y;
                        const distSq = dx*dx + dy*dy;
                        
                        if (Math.sqrt(distSq) < 20) { 
                            particlesRef.current.splice(i, 1);
                            continue;
                        }

                        const force = (physics.v0 * 2000) / (distSq + 100);
                        p.vx += (dx / Math.sqrt(distSq)) * force * dt;
                        p.vy += (dy / Math.sqrt(distSq)) * force * dt;
                        p.x += p.vx; 
                        p.y += p.vy;
                    } else {
                        if (p.isHorizontal) {
                            if (p.y < (height * 0.15) && Math.abs(p.vx) > 0.3) { p.vy += (0 - p.y) * 5.0 * dt; } 
                            else { p.vy += p.buoyancy * dt * 0.5; }
                        } else {
                            p.vy += p.buoyancy * dt;
                        }
                        
                        p.vx *= p.drag; p.vy *= p.drag;
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
                    ctx.stroke();
                }
            }

            ctx.globalCompositeOperation = 'source-over';
            drawDiffuserSide(ctx, width/2);
        } else {
            renderTopView(ctx);
        }

        requestRef.current = requestAnimationFrame(animate);

    }, [width, height, isPowerOn, isPlaying, physics, temp, roomTemp, flowType, modelId, showGrid, roomHeight, diffuserHeight, workZoneHeight, viewMode, placedDiffusers, selectedDiffuserId, roomWidth, roomLength]);

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (viewMode !== 'top') return;
        
        // Only left click drags
        if (e.button !== 0) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const roomPixW = roomWidth * ppm;
        const roomPixL = roomLength * ppm;
        const originX = (width - roomPixW) / 2;
        const originY = (height - roomPixL) / 2;

        // Check if hit a diffuser
        for (let i = placedDiffusers.length - 1; i >= 0; i--) {
            const d = placedDiffusers[i];
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            const dSize = (d.performance.spec.A / 1000 * ppm) || 20;
            
            // Simple hit box
            if (mouseX >= cx - dSize && mouseX <= cx + dSize && mouseY >= cy - dSize && mouseY <= cy + dSize) {
                onSelectDiffuser(d.id);
                setIsDragging(true);
                setDragOffset({ x: mouseX - cx, y: mouseY - cy });
                return;
            }
        }
        // Deselect if clicked empty space
        onSelectDiffuser('');
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (viewMode !== 'top') return;
        e.preventDefault();
        
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const roomPixW = roomWidth * ppm;
        const roomPixL = roomLength * ppm;
        const originX = (width - roomPixW) / 2;
        const originY = (height - roomPixL) / 2;

        // Check hit
        for (let i = placedDiffusers.length - 1; i >= 0; i--) {
            const d = placedDiffusers[i];
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            const dSize = (d.performance.spec.A / 1000 * ppm) || 20;
            
            if (mouseX >= cx - dSize && mouseX <= cx + dSize && mouseY >= cy - dSize && mouseY <= cy + dSize) {
                onRemoveDiffuser(d.id);
                return;
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedDiffuserId || viewMode !== 'top') return;
        
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const roomPixW = roomWidth * ppm;
        const roomPixL = roomLength * ppm;
        const originX = (width - roomPixW) / 2;
        const originY = (height - roomPixL) / 2;

        // Calculate new meter position relative to room origin
        let newX = (mouseX - dragOffset.x - originX) / ppm;
        let newY = (mouseY - dragOffset.y - originY) / ppm;
        
        // Apply snap to grid
        if (snapToGrid && gridSnapSize) {
            newX = Math.round(newX / gridSnapSize) * gridSnapSize;
            newY = Math.round(newY / gridSnapSize) * gridSnapSize;
        }

        // Clamp to room
        newX = Math.max(0, Math.min(roomWidth, newX));
        newY = Math.max(0, Math.min(roomLength, newY));

        onUpdateDiffuserPos(selectedDiffuserId, newX, newY);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    return (
        <div className="relative w-full h-full bg-[#050505] cursor-crosshair">
            <canvas 
                ref={canvasRef} 
                width={width} 
                height={height} 
                className="block w-full h-full touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
            />
            {viewMode === 'side' && physics.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-4 p-8 border border-red-500/30 bg-red-500/5 rounded-3xl text-red-200">
                        <AlertTriangle size={48} className="text-red-500" />
                        <span className="font-bold text-xl tracking-tight">ТИПОРАЗМЕР НЕДОСТУПЕН</span>
                        <span className="text-sm opacity-70">Для выбранной модели нет данных для этого размера</span>
                    </div>
                </div>
            )}
             {viewMode === 'top' && (
                <div className="absolute top-4 right-4 pointer-events-none bg-black/60 backdrop-blur px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-300">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> &lt; 0.2 m/s (Комфорт)
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> 0.2 - 0.5 m/s
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> &gt; 0.5 m/s (Сквозняк)
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiffuserCanvas;