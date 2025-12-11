import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CONSTANTS } from '../../constants';
import { PerformanceResult, PlacedDiffuser } from '../../types';

interface DiffuserCanvasProps {
  width: number; height: number;
  physics: PerformanceResult;
  isPowerOn: boolean; isPlaying: boolean;
  temp: number; roomTemp: number;
  flowType: string; modelId: string;
  showGrid: boolean;
  roomHeight: number; roomWidth: number; roomLength: number;
  diffuserHeight: number; workZoneHeight: number;
  viewMode: 'side' | 'top';
  placedDiffusers: PlacedDiffuser[];
  onUpdateDiffuserPos: (id: string, x: number, y: number) => void;
  onSelectDiffuser: (id: string) => void;
  onRemoveDiffuser: (id: string) => void;
  selectedDiffuserId: string | null;
  showHeatmap?: boolean; velocityField?: number[][];
  gridStep?: number;
  dragPreview?: {x: number, y: number, width: number, height: number} | null;
  snapToGrid?: boolean; gridSnapSize?: number;
}

const DiffuserCanvas: React.FC<DiffuserCanvasProps> = ({ 
  width, height, physics, isPowerOn, isPlaying, temp, roomTemp, 
  flowType, modelId, showGrid, roomHeight, roomWidth, roomLength, diffuserHeight,
  viewMode, placedDiffusers, onUpdateDiffuserPos, onSelectDiffuser, onRemoveDiffuser, selectedDiffuserId,
  showHeatmap = false, velocityField = [], gridStep = 0.5, dragPreview = null, snapToGrid = false, gridSnapSize = 0.5
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>(0);
    const particlesRef = useRef<any[]>([]); 
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const getScale = () => {
        if (viewMode === 'side') return height / roomHeight;
        const padding = 60;
        const availableW = width - padding * 2;
        const availableH = height - padding * 2;
        return Math.min(availableW / roomWidth, availableH / roomLength);
    };
    const ppm = getScale();

    // 1. Кэширование фона
    const renderStaticBackground = useCallback(() => {
        if (!bgCanvasRef.current) bgCanvasRef.current = document.createElement('canvas');
        const bgCtx = bgCanvasRef.current.getContext('2d');
        if (!bgCtx) return;

        if (bgCanvasRef.current.width !== width || bgCanvasRef.current.height !== height) {
            bgCanvasRef.current.width = width;
            bgCanvasRef.current.height = height;
        }

        bgCtx.fillStyle = '#0f172a';
        bgCtx.fillRect(0, 0, width, height);

        if (viewMode === 'top') {
            const roomPixW = roomWidth * ppm;
            const roomPixL = roomLength * ppm;
            const originX = (width - roomPixW) / 2;
            const originY = (height - roomPixL) / 2;

            bgCtx.fillStyle = '#0f172a';
            bgCtx.fillRect(originX, originY, roomPixW, roomPixL);
            bgCtx.strokeStyle = '#334155';
            bgCtx.lineWidth = 2;
            bgCtx.strokeRect(originX, originY, roomPixW, roomPixL);

            if (showGrid) {
                bgCtx.lineWidth = 1;
                bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                const step = 0.5 * ppm;
                bgCtx.beginPath();
                for (let x = 0; x <= roomPixW; x += step) { bgCtx.moveTo(originX + x, originY); bgCtx.lineTo(originX + x, originY + roomPixL); }
                for (let y = 0; y <= roomPixL; y += step) { bgCtx.moveTo(originX, originY + y); bgCtx.lineTo(originX + roomPixW, originY + y); }
                bgCtx.stroke();
            }
        }
    }, [width, height, viewMode, roomWidth, roomLength, ppm, showGrid]);

    useEffect(() => renderStaticBackground(), [renderStaticBackground]);

    // 2. Анимация
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        if (viewMode === 'side') {
             // Side View Logic (упрощено для краткости, оставьте свой код частиц здесь)
             ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; ctx.fillRect(0, 0, width, height);
             // ... drawDiffuserSide ...
        } else {
            // Top View
            if (bgCanvasRef.current) ctx.drawImage(bgCanvasRef.current, 0, 0);

            const roomPixW = roomWidth * ppm;
            const roomPixL = roomLength * ppm;
            const originX = (width - roomPixW) / 2;
            const originY = (height - roomPixL) / 2;

            placedDiffusers.forEach(d => {
                const cx = originX + d.x * ppm;
                const cy = originY + d.y * ppm;
                
                // Рисуем радиус "по физике"
                const rPx = d.performance.coverageRadius * ppm;
                const v = d.performance.workzoneVelocity;
                
                let fillStyle = 'rgba(16, 185, 129, 0.15)'; 
                let strokeStyle = 'rgba(16, 185, 129, 0.4)';
                
                // Цветовая кодировка скорости
                if (v > 0.5) { fillStyle = 'rgba(239, 68, 68, 0.15)'; strokeStyle = 'rgba(239, 68, 68, 0.4)'; }
                else if (v > 0.25) { fillStyle = 'rgba(245, 158, 11, 0.15)'; strokeStyle = 'rgba(245, 158, 11, 0.4)'; }

                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(0, rPx), 0, Math.PI * 2);
                ctx.fillStyle = fillStyle; ctx.fill();
                ctx.lineWidth = 1; ctx.strokeStyle = strokeStyle; ctx.stroke();

                // Тело диффузора
                const dSize = (d.performance.spec.A / 1000 * ppm) || 20;
                ctx.beginPath(); ctx.rect(cx - dSize/2, cy - dSize/2, dSize, dSize);
                ctx.fillStyle = selectedDiffuserId === d.id ? '#3b82f6' : '#475569'; ctx.fill();
                if (selectedDiffuserId === d.id) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
            });
            
            if (dragPreview) {
                const cx = originX + dragPreview.x * ppm;
                const cy = originY + dragPreview.y * ppm;
                const wPx = dragPreview.width * ppm;
                const hPx = dragPreview.height * ppm;
                ctx.beginPath(); ctx.rect(cx - wPx/2, cy - hPx/2, wPx, hPx);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; ctx.fill();
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    }, [width, height, viewMode, placedDiffusers, selectedDiffuserId, dragPreview, isPowerOn, isPlaying]);

    // 3. Обработка мыши с Scale Correction
    const getMousePos = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const scaleX = width / rect.width;   // Ключевое исправление
        const scaleY = height / rect.height; // Ключевое исправление
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (viewMode !== 'top' || e.button !== 0) return;
        const { x: mouseX, y: mouseY } = getMousePos(e);
        
        const roomPixW = roomWidth * ppm;
        const roomPixL = roomLength * ppm;
        const originX = (width - roomPixW) / 2;
        const originY = (height - roomPixL) / 2;

        let hit = false;
        for (let i = placedDiffusers.length - 1; i >= 0; i--) {
            const d = placedDiffusers[i];
            const cx = originX + d.x * ppm;
            const cy = originY + d.y * ppm;
            const hitSize = Math.max((d.performance.spec.A / 1000 * ppm), 40);
            
            if (mouseX >= cx - hitSize/2 && mouseX <= cx + hitSize/2 && 
                mouseY >= cy - hitSize/2 && mouseY <= cy + hitSize/2) {
                onSelectDiffuser(d.id);
                setIsDragging(true);
                setDragOffset({ x: mouseX - cx, y: mouseY - cy });
                hit = true;
                return;
            }
        }
        if (!hit) onSelectDiffuser('');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedDiffuserId || viewMode !== 'top') return;
        const { x: mouseX, y: mouseY } = getMousePos(e);

        const roomPixW = roomWidth * ppm;
        const roomPixL = roomLength * ppm;
        const originX = (width - roomPixW) / 2;
        const originY = (height - roomPixL) / 2;

        let newX = (mouseX - dragOffset.x - originX) / ppm;
        let newY = (mouseY - dragOffset.y - originY) / ppm;

        if (snapToGrid && gridSnapSize) {
            newX = Math.round(newX / gridSnapSize) * gridSnapSize;
            newY = Math.round(newY / gridSnapSize) * gridSnapSize;
        }
        newX = Math.max(0, Math.min(roomWidth, newX));
        newY = Math.max(0, Math.min(roomLength, newY));

        onUpdateDiffuserPos(selectedDiffuserId, newX, newY);
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    return (
        <canvas 
            ref={canvasRef} width={width} height={height} 
            className="block w-full h-full touch-none cursor-crosshair"
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
        />
    );
};

export default React.memo(DiffuserCanvas);