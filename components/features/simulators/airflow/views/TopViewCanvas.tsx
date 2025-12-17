import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PerformanceResult, PlacedDiffuser } from '../../../../../types';
import { Trash2, Move, Copy, X } from 'lucide-react';

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
            prevProps.velocityField !== props.velocityField
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
        
        isOffscreenDirty.current = false;
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

        // Dynamic Diffusers
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

    // --- INTERACTIONS ---
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
            return;
        }

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
        if (!isDragging || !props.selectedDiffuserId) return;
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
                className="block w-full h-full touch-none cursor-crosshair"
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