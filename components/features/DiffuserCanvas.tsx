import React, { useRef, useEffect, useCallback } from 'react';
import { PerformanceResult } from '../../types';

// Константы из вашего файла
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
  // Добавлены недостающие пропсы
  roomWidth?: number;
  roomLength?: number;
  gridStep?: number;
  snapToGrid?: boolean;
  gridSnapSize?: number;

  // Дополнительные пропсы для совместимости (если они передаются из родителя)
  viewMode?: 'side' | 'top';
  placedDiffusers?: any[];
  onUpdateDiffuserPos?: any;
  onSelectDiffuser?: any;
  onRemoveDiffuser?: any;
  selectedDiffuserId?: any;
  showHeatmap?: boolean;
  velocityField?: any;
  dragPreview?: any;
}

const DiffuserCanvas: React.FC<DiffuserCanvasProps> = ({ 
    width, height, physics, isPowerOn, isPlaying, temp, roomTemp, 
    flowType, modelId, showGrid, roomHeight, diffuserHeight, workZoneHeight,
    roomWidth, roomLength, viewMode, placedDiffusers, onUpdateDiffuserPos,
    onSelectDiffuser, onRemoveDiffuser, selectedDiffuserId, showHeatmap,
    velocityField, dragPreview, snapToGrid, gridSnapSize
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const particlesRef = useRef<any[]>([]); 

    const getGlowColor = (t: number) => {
        // Цвет зависит от абсолютной температуры
        if (t <= 18) return `64, 224, 255`; // Cyan for cold
        if (t >= 28) return `255, 99, 132`; // Red for hot
        if (t > 18 && t < 28) return `100, 255, 160`; // Green for comfort
        return `255, 255, 255`;
    };

    useEffect(() => {
        particlesRef.current = [];
    }, [modelId, flowType, physics.spec?.A, diffuserHeight]);

    // Масштаб: Высота канваса = Высота комнаты (для вида сбоку)
    const ppm = height / roomHeight;

    const createParticle = () => {
        if (physics.error) return null;
        const spec = physics.spec;
        if (!spec || !spec.A) return null; 

        const nozzleW = (spec.A / 1000) * ppm;
        const scale = ppm / 1000;
        
        // Позиция диффузора сверху (0 = потолок)
        const diffuserYPos = (roomHeight - diffuserHeight) * ppm;
        const hD = (spec.D || 0) * scale; // Добавил проверку на undefined
        const startY = diffuserYPos + hD;

        // Вылет частиц из диффузора
        const pxSpeed = (physics.v0 || 0) * ppm * 0.8;
        const dtTemp = temp - roomTemp;

        let startX = width / 2;
        let vx = 0, vy = 0;
        let drag = 0.96;
        let waveAmp = 5;
        let waveFreq = 4 + Math.random() * 4;
        let isHorizontal = false;
        let isSuction = false;

        // Архимедова сила
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

    const drawDiffuser = (ctx: CanvasRenderingContext2D, cx: number) => {
        const spec = physics.spec;
        if (!spec || !spec.A) return;

        const scale = ppm / 1000;
        const wA = spec.A * scale;
        const hD = (spec.D || 0) * scale;
        const hC = (spec.C || 0) * scale; 
        const hTotal = hD + hC;
        
        // Положение Y
        const yPos = (roomHeight - diffuserHeight) * ppm;
        
        // Труба к потолку
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - (wA * 0.8)/2, 0, wA * 0.8, yPos);
        
        // Diffuser Body
        ctx.save();
        ctx.translate(0, yPos);
        
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.rect(cx - wA/2, 0, wA, hD); ctx.fill();
        
        // Diffuser Face
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

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        if (!showGrid) return;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        const step = 0.5 * ppm;
        
        ctx.beginPath();
        for (let x = width/2; x < width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let x = width/2; x > 0; x -= step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();
        
        // Рабочая зона
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

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dt = CONSTANTS.BASE_TIME_STEP;

        if (!isPowerOn) {
            drawOffState(ctx, width, height);
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
        ctx.fillRect(0, 0, width, height);

        drawGrid(ctx, width, height);

        if (isPlaying && !physics.error) {
            const maxParticles = 3500; 
            const spawnRate = Math.ceil(5 + (physics.v0 || 0) / 2 * 8);
            
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
                    // Архимедова сила и гравитация
                    if (p.isHorizontal) {
                        if (p.y < (height * 0.15) && Math.abs(p.vx) > 0.3) { p.vy += (0 - p.y) * 5.0 * dt; } 
                        else { p.vy += p.buoyancy * dt * 0.5; }
                    } else {
                        // Для вертикальных струй buoyancy влияет на вертикальное ускорение
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
        drawDiffuser(ctx, width/2);

        requestRef.current = requestAnimationFrame(animate);

    }, [width, height, isPowerOn, isPlaying, physics, temp, roomTemp, flowType, modelId, showGrid, roomHeight, diffuserHeight, workZoneHeight, ppm]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    return (
        <canvas 
            ref={canvasRef} 
            width={width} 
            height={height} 
            className="block w-full h-full touch-none"
            onContextMenu={(e) => e.preventDefault()}
        />
    );
};

export default React.memo(DiffuserCanvas);