
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult, PlacedDiffuser, Probe, ToolMode, Obstacle } from '../../../../../types';
import { Trash2, Move, Copy, X } from 'lucide-react';
import { calculateProbeData } from '../../../../../hooks/useSimulation';

interface TopViewCanvasProps {
  width: number; 
  height: number;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  placedDiffusers?: PlacedDiffuser[];
  selectedDiffuserId?: string | null;
  showGrid: boolean;
  showHeatmap: boolean;
  velocityField?: number[][];
  snapToGrid?: boolean;
  gridSnapSize?: number;
  gridStep?: number;
  dragPreview?: {x: number, y: number, width: number, height: number} | null;
  onUpdateDiffuserPos?: (id: string, x: number, y: number) => void;
  onSelectDiffuser?: (id: string) => void;
  onRemoveDiffuser?: (id: string) => void;
  onDuplicateDiffuser?: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  // Tool Props
  activeTool?: ToolMode;
  setActiveTool?: (mode: ToolMode) => void;
  // Probe Props
  probes?: Probe[];
  onAddProbe?: (x: number, y: number) => void;
  onRemoveProbe?: (id: string) => void;
  onUpdateProbePos?: (id: string, pos: {x?: number, y?: number, z?: number}) => void;
  // Obstacle Props
  obstacles?: Obstacle[];
  onAddObstacle?: (x: number, y: number, w?: number, h?: number, type?: 'furniture' | 'wall_block') => void;
  onRemoveObstacle?: (id: string) => void;
  onUpdateObstacle?: (id: string, updates: Partial<Obstacle>) => void;
  
  roomTemp?: number;
  supplyTemp?: number;
}

const getTopLayout = (w: number, h: number, rw: number, rl: number) => {
    const padding = 60; 
    const availW = w - padding * 2;
    const availH = h - padding * 2;
    const ppm = Math.min(availW / rw, availH / rl);
    const roomPixW = rw * ppm;
    const roomPixH = rl * ppm;
    const originX = (w - roomPixW) / 2;
    const originY = (h - roomPixH) / 2;
    return { ppm, originX, originY };
};

const TopViewCanvas: React.FC<TopViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isOffscreenDirty = useRef<boolean>(true);
    const simulationRef = useRef(props);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [isStickyDrag, setIsStickyDrag] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
    
    // Drag Target Type
    const dragTargetRef = useRef<{ type: 'diffuser' | 'probe' | 'obstacle', id: string } | null>(null);

    // Sync Props
    useEffect(() => {
        const prevProps = simulationRef.current;
        simulationRef.current = props;

        if (
            prevProps.width !== props.width ||
            prevProps.height !== props.height ||
            prevProps.roomWidth !== props.roomWidth ||
            prevProps.roomLength !== props.roomLength ||
            prevProps.showHeatmap !== props.showHeatmap ||
            prevProps.showGrid !== props.showGrid ||
            prevProps.velocityField !== props.velocityField ||
            prevProps.obstacles !== props.obstacles ||
            prevProps.probes !== props.probes
        ) {
            isOffscreenDirty.current = true;
        }
    }, [props]);

    const updateOffscreenCanvas = (state: TopViewCanvasProps) => {
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

        ctx.fillStyle = '#030304'; 
        ctx.fillRect(0, 0, state.width, state.height);

        const { ppm, originX, originY } = getTopLayout(state.width, state.height, state.roomWidth, state.roomLength);

        const roomPixW = state.roomWidth * ppm;
        const roomPixL = state.roomLength * ppm;
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(originX, originY, roomPixW, roomPixL);

        // Heatmap
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

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(originX, originY, roomPixW, roomPixL);

        if (state.showGrid) {
            const rw = state.roomWidth;
            const rl = state.roomLength;
            const gStep = state.gridStep || 0.1;

            if (gStep < 0.2) {
                ctx.beginPath();
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; 
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
        
        // Draw Obstacles - Wall Blocks (Negative Space)
        if (state.obstacles) {
            state.obstacles.forEach(obs => {
                if (obs.type === 'wall_block') {
                    const ox = originX + (obs.x - obs.width/2) * ppm;
                    const oy = originY + (obs.y - obs.height/2) * ppm;
                    const ow = obs.width * ppm;
                    const oh = obs.height * ppm;
                    
                    ctx.fillStyle = '#030304'; 
                    ctx.fillRect(ox, oy, ow, oh);
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(ox, oy, ow, oh);
                    
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(ox, oy, ow, oh);
                    ctx.clip();
                    ctx.strokeStyle = '#1e293b';
                    ctx.lineWidth = 1;
                    for (let i = -ow; i < ow + oh; i += 10) {
                        ctx.moveTo(ox + i, oy);
                        ctx.lineTo(ox + i - oh, oy + oh);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
        
        isOffscreenDirty.current = false;
    };

    const drawProbe = (ctx: CanvasRenderingContext2D, probe: Probe, ppm: number, originX: number, originY: number, state: TopViewCanvasProps) => {
        const cx = originX + probe.x * ppm;
        const cy = originY + probe.y * ppm;
        
        const data = calculateProbeData(
            probe.x, probe.y, 
            state.placedDiffusers || [], 
            state.roomTemp || 24, 
            state.supplyTemp || 20,
            state.obstacles || []
        );
        
        let color = '#34d399'; 
        if (data.dr >= 15) color = '#fbbf24'; 
        if (data.dr >= 25) color = '#f87171'; 

        // Draw Arrow Vector
        if (data.v > 0.05) {
            const arrowLen = 20 + data.v * 10;
            const endX = cx + Math.cos(data.angle) * arrowLen;
            const endY = cy + Math.sin(data.angle) * arrowLen;
            
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            const headLen = 6;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headLen * Math.cos(data.angle - Math.PI / 6), endY - headLen * Math.sin(data.angle - Math.PI / 6));
            ctx.lineTo(endX - headLen * Math.cos(data.angle + Math.PI / 6), endY - headLen * Math.sin(data.angle + Math.PI / 6));
            ctx.fillStyle = color;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        const badgeW = 96;
        const badgeH = 50;
        const bx = cx + 12;
        const by = cy - 50;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; 
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 10px Inter, sans-serif';
        
        ctx.fillStyle = '#94a3b8';
        ctx.fillText("V:", bx + 8, by + 14);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${data.v.toFixed(2)} м/с`, bx + 28, by + 14);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText("T:", bx + 8, by + 28);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${data.t.toFixed(1)}°C`, bx + 28, by + 28);
        
        ctx.fillStyle = '#94a3b8';
        ctx.fillText("DR:", bx + 8, by + 42);
        ctx.fillStyle = color;
        ctx.fillText(`${data.dr.toFixed(0)}%`, bx + 28, by + 42);
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const state = simulationRef.current;
        const { width, height } = state;

        if (isOffscreenDirty.current) {
            updateOffscreenCanvas(state);
        }

        if (offscreenCanvasRef.current) {
            ctx.drawImage(offscreenCanvasRef.current, 0, 0);
        } else {
            ctx.fillStyle = '#030304';
            ctx.fillRect(0, 0, width, height);
        }

        const { ppm, originX, originY } = getTopLayout(width, height, state.roomWidth, state.roomLength);

        // Draw Obstacles - Furniture (On top of floor)
        if (state.obstacles) {
            state.obstacles.forEach(obs => {
                if (obs.type === 'furniture') {
                    const ox = originX + (obs.x - obs.width/2) * ppm;
                    const oy = originY + (obs.y - obs.height/2) * ppm;
                    const ow = obs.width * ppm;
                    const oh = obs.height * ppm;
                    
                    ctx.fillStyle = '#475569';
                    ctx.fillRect(ox, oy, ow, oh);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(ox, oy, ow, oh);
                    
                    ctx.beginPath();
                    ctx.moveTo(ox, oy); ctx.lineTo(ox + ow, oy + oh);
                    ctx.moveTo(ox + ow, oy); ctx.lineTo(ox, oy + oh);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        }

        state.placedDiffusers?.forEach(d => {
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            
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

            const dSize = (d.performance.spec.A / 1000 * ppm) || 20;
            ctx.beginPath();
            ctx.rect(cx - dSize/2, cy - dSize/2, dSize, dSize);
            
            if (state.selectedDiffuserId === d.id) {
                ctx.fillStyle = '#3b82f6'; 
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
            } else {
                ctx.fillStyle = '#475569'; 
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1;
            }
            
            ctx.fill();
            ctx.stroke();
        });

        state.probes?.forEach(p => {
            drawProbe(ctx, p, ppm, originX, originY, state);
        });

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

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

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
        e.preventDefault();
        if (props.activeTool !== 'select') return;

        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getTopLayout(props.width, props.height, props.roomWidth, props.roomLength);

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
        if ('button' in e && e.button !== 0) return;
        
        if (isStickyDrag) {
            setIsDragging(false);
            setIsStickyDrag(false);
            props.onDragEnd && props.onDragEnd();
            setContextMenu(null);
            dragTargetRef.current = null;
            return;
        }

        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getTopLayout(props.width, props.height, props.roomWidth, props.roomLength);

        switch (props.activeTool) {
            case 'select': {
                const obstacles = props.obstacles || [];
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    const obs = obstacles[i];
                    if (obs.type !== 'furniture') continue;
                    
                    const ox = originX + (obs.x - obs.width/2) * ppm;
                    const oy = originY + (obs.y - obs.height/2) * ppm;
                    const ow = obs.width * ppm;
                    const oh = obs.height * ppm;
                    
                    if (mouseX >= ox && mouseX <= ox + ow && mouseY >= oy && mouseY <= oy + oh) {
                        dragTargetRef.current = { type: 'obstacle', id: obs.id };
                        setIsDragging(true);
                        setDragOffset({ x: mouseX - (originX + obs.x * ppm), y: mouseY - (originY + obs.y * ppm) });
                        return;
                    }
                }

                const probes = props.probes || [];
                for (let i = probes.length - 1; i >= 0; i--) {
                    const p = probes[i];
                    const cx = originX + p.x * ppm;
                    const cy = originY + p.y * ppm;
                    if (Math.hypot(mouseX - cx, mouseY - cy) < 15) { 
                        dragTargetRef.current = { type: 'probe', id: p.id };
                        setIsDragging(true);
                        setDragOffset({ x: mouseX - cx, y: mouseY - cy });
                        return;
                    }
                }

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
                    dragTargetRef.current = { type: 'diffuser', id: hitId };
                    const d = diffusers.find(d => d.id === hitId);
                    if(d) {
                        const cx = originX + d.x * ppm;
                        const cy = originY + d.y * ppm;
                        setDragOffset({ x: mouseX - cx, y: mouseY - cy });
                    }
                } else {
                    props.onSelectDiffuser && props.onSelectDiffuser(''); 
                }
                break;
            }

            case 'probe': {
                if (props.onAddProbe) {
                    const newX = (mouseX - originX) / ppm;
                    const newY = (mouseY - originY) / ppm;
                    if (newX >= 0 && newX <= props.roomWidth && newY >= 0 && newY <= props.roomLength) {
                        props.onAddProbe(newX, newY);
                    }
                }
                break;
            }

            case 'obstacle': {
                if (props.onAddObstacle) {
                    const newX = (mouseX - originX) / ppm;
                    const newY = (mouseY - originY) / ppm;
                    if (newX >= 0 && newX <= props.roomWidth && newY >= 0 && newY <= props.roomLength) {
                        props.onAddObstacle(newX, newY, 1.0, 1.0, 'furniture');
                    }
                }
                break;
            }

            case 'measure': {
                console.log('Measure tool clicked at', mouseX, mouseY);
                break;
            }

            case 'pipette': {
                console.log('Pipette tool clicked at', mouseX, mouseY);
                break;
            }
        }
        
        setContextMenu(null);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragTargetRef.current) return;
        
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const { ppm, originX, originY } = getTopLayout(props.width, props.height, props.roomWidth, props.roomLength);

        let newX = (mouseX - dragOffset.x - originX) / ppm;
        let newY = (mouseY - dragOffset.y - originY) / ppm;

        if (props.snapToGrid && props.gridSnapSize) {
            newX = Math.round(newX / props.gridSnapSize) * props.gridSnapSize;
            newY = Math.round(newY / props.gridSnapSize) * props.gridSnapSize;
        }

        const rw = props.roomWidth;
        const rl = props.roomLength;
        
        newX = Math.max(0, Math.min(rw, newX));
        newY = Math.max(0, Math.min(rl, newY));

        if (dragTargetRef.current.type === 'diffuser' && props.onUpdateDiffuserPos) {
            props.onUpdateDiffuserPos(dragTargetRef.current.id, newX, newY);
        } else if (dragTargetRef.current.type === 'probe' && props.onUpdateProbePos) {
            props.onUpdateProbePos(dragTargetRef.current.id, { x: newX, y: newY });
        } else if (dragTargetRef.current.type === 'obstacle' && props.onUpdateObstacle) {
            props.onUpdateObstacle(dragTargetRef.current.id, { x: newX, y: newY });
        }
    };

    const handleEnd = () => {
        if (!isStickyDrag) {
            setIsDragging(false);
            dragTargetRef.current = null;
            props.onDragEnd && props.onDragEnd();
        }
    };

    const handleContextAction = (action: 'move' | 'delete' | 'duplicate') => {
        if (!contextMenu) return;
        
        if (action === 'move') {
            props.onSelectDiffuser && props.onSelectDiffuser(contextMenu.id);
            setIsDragging(true);
            setIsStickyDrag(true);
            dragTargetRef.current = { type: 'diffuser', id: contextMenu.id };
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

    const getCursorStyle = () => {
        switch (props.activeTool) {
            case 'probe': return 'cursor-crosshair';
            case 'measure': return 'cursor-text'; 
            case 'obstacle': return 'cursor-nwse-resize';
            case 'pipette': return 'cursor-help';
            case 'select': return isDragging ? 'cursor-grabbing' : 'cursor-default';
            default: return 'cursor-default';
        }
    };

    return (
        <div className="relative w-full h-full">
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className={`block w-full h-full touch-none ${getCursorStyle()}`}
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
                    className="fixed z-50 bg-[#1a1b26] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-1.5 flex flex-col min-w-[160px] animate-in zoom-in-95 duration-200 origin-top-left backdrop-blur-xl"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <div className="px-3 py-2 border-b border-white/5 mb-1 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Действия</span>
                        <button onClick={() => setContextMenu(null)} className="text-slate-500 hover:text-white transition-colors"><X size={12}/></button>
                    </div>
                    <button onClick={() => handleContextAction('move')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left">
                        <Move size={14} className="text-blue-400" />
                        <span>Переместить</span>
                    </button>
                    <button onClick={() => handleContextAction('duplicate')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left">
                        <Copy size={14} className="text-emerald-400" />
                        <span>Дублировать</span>
                    </button>
                    <button onClick={() => handleContextAction('delete')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors text-left">
                        <Trash2 size={14} />
                        <span>Удалить</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default React.memo(TopViewCanvas);
