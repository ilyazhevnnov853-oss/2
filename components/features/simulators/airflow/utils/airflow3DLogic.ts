import { PerformanceResult } from '../../../../../types';

export const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 2000, 
  SPAWN_RATE_BASE: 5,
  SPAWN_RATE_MULTIPLIER: 8
};

// --- TYPES ---
export interface Particle3D {
    active: boolean;
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    buoyancy: number; 
    drag: number; 
    age: number; 
    life: number; 
    lastHistoryTime: number; 
    history: {x: number, y: number, z: number, age: number}[]; 
    color: string; 
    waveFreq: number; 
    wavePhase: number; 
    waveAmp: number;
    isSuction: boolean;
}

export interface ThreeDViewCanvasProps {
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
export const project = (
    x: number, y: number, z: number, 
    w: number, h: number, 
    rotX: number, rotY: number, 
    scale: number,
    panX: number, panY: number
) => {
    const cx = Math.cos(rotY);
    const sx = Math.sin(rotY);
    const x1 = x * cx - z * sx;
    const z1 = z * cx + x * sx;

    const cy = Math.cos(rotX);
    const sy = Math.sin(rotX);
    const y2 = y * cy - z1 * sy;
    const z2 = z1 * cy + y * sy;

    const fov = 1000;
    const cameraDist = 1500; 
    
    const depth = cameraDist + z2;
    if (depth < 10) return { x: -10000, y: -10000, s: 0, z: z2 }; 

    const factor = (fov / depth) * scale;

    return {
        x: w / 2 + panX + x1 * factor,
        y: h / 2 + panY + y2 * factor, 
        s: factor,
        z: z2 
    };
};

export const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`; 
    if (t >= 28) return `255, 99, 132`; 
    if (t > 18 && t < 28) return `100, 255, 160`; 
    return `255, 255, 255`;
};

// --- PHYSICS SPAWN LOGIC ---
export const spawnParticle = (p: Particle3D, state: ThreeDViewCanvasProps, PPM: number) => {
    const { physics, temp, flowType, modelId, roomHeight, diffuserHeight } = state;
    
    if (physics.error) return;
    const spec = physics.spec;
    if (!spec || !spec.A) return;
    
    const nozzleW = (spec.A / 1000) * PPM;
    const startY = (diffuserHeight * PPM); 
    
    const pxSpeed = (physics.v0 || 0) * PPM * 0.8;

    let startX = 0, startZ = 0;
    let vx = 0, vy = 0, vz = 0;
    let drag = 0.96;
    let waveAmp = 5;
    let waveFreq = 4 + Math.random() * 4;
    let isSuction = false;

    const physicsAr = physics.Ar || 0; 
    const visualGain = 50.0; 
    const buoyancy = physicsAr * (physics.v0 * physics.v0) * PPM * visualGain;

    if (flowType === 'suction') {
        isSuction = true;
        startX = (Math.random() - 0.5) * state.roomWidth * PPM;
        startZ = (Math.random() - 0.5) * state.roomLength * PPM;
        const spawnH = Math.random() * startY;
        
        p.x = startX; p.y = spawnH; p.z = startZ;
        
        const dx = 0 - startX;
        const dy = startY - spawnH;
        const dz = 0 - startZ;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const force = ((physics.v0 || 0) * 500) / (dist + 10);
        
        p.vx = (dx / dist) * force;
        p.vy = (dy / dist) * force;
        p.vz = (dz / dist) * force;
        
        drag = 1.0; waveAmp = 0;
        p.life = 3.0; 
        p.color = '150, 150, 150';
    } else {
        let angle = Math.random() * Math.PI * 2; 
        let radSpeed = 0;
        let vertSpeed = 0;

        if (flowType.includes('horizontal') || flowType === '4-way') {
            if (flowType === '4-way') {
                const quad = Math.floor(Math.random() * 4);
                const baseAngle = quad * (Math.PI / 2);
                const spread = (Math.random() - 0.5) * 0.2; 
                angle = baseAngle + spread;
                radSpeed = pxSpeed * 1.0;
                vertSpeed = -pxSpeed * 0.1;
            } else {
                radSpeed = pxSpeed * 1.2;
                vertSpeed = -pxSpeed * 0.2;
            }
            
            startX = Math.cos(angle) * (nozzleW * 0.55);
            startZ = Math.sin(angle) * (nozzleW * 0.55);
            
            if (flowType.includes('swirl')) { 
                waveAmp = 15; waveFreq = 8; 
            } else { 
                waveAmp = 3; 
            }

        } else if (modelId === 'dpu-m' && flowType.includes('vertical')) {
            const coneAngle = (35 + Math.random() * 10) * (Math.PI / 180);
            const speed = pxSpeed;
            radSpeed = Math.sin(coneAngle) * speed;
            vertSpeed = -Math.cos(coneAngle) * speed;
            waveAmp = 5; drag = 0.95;

        } else if (modelId === 'dpu-k' && flowType.includes('vertical')) {
            const spreadAngle = (Math.random() - 0.5) * 60 * (Math.PI / 180);
            startX = (Math.random() - 0.5) * nozzleW * 0.95; 
            startZ = (Math.random() - 0.5) * nozzleW * 0.95;
            const rSpd = Math.sin(spreadAngle) * pxSpeed * 0.8; 
            radSpeed = Math.abs(rSpd);
            vertSpeed = -Math.cos(spreadAngle) * pxSpeed;
            waveAmp = 8; drag = 0.96;

        } else if (flowType === 'vertical-swirl') {
            startX = (Math.random() - 0.5) * nozzleW * 0.9;
            startZ = (Math.random() - 0.5) * nozzleW * 0.9;
            const spread = (Math.random() - 0.5) * 1.5;
            radSpeed = Math.sin(spread) * pxSpeed * 0.5;
            vertSpeed = -Math.cos(spread) * pxSpeed;
            waveAmp = 30 + Math.random() * 10; waveFreq = 6; drag = 0.94;
        } else {
            startX = (Math.random() - 0.5) * nozzleW * 0.95;
            startZ = (Math.random() - 0.5) * nozzleW * 0.95;
            const spread = (Math.random() - 0.5) * 0.05;
            radSpeed = Math.sin(spread) * pxSpeed * 0.3;
            vertSpeed = -Math.cos(spread) * pxSpeed * 1.3;
            waveAmp = 1; drag = 0.985;
        }

        vx = Math.cos(angle) * radSpeed;
        vz = Math.sin(angle) * radSpeed;
        vy = vertSpeed;

        if (flowType.includes('swirl')) {
            const swirlSpeed = pxSpeed * 0.5;
            vx += -Math.sin(angle) * swirlSpeed;
            vz += Math.cos(angle) * swirlSpeed;
        }

        p.x = startX; p.y = startY; p.z = startZ;
        // Give particles enough life so the distance check (throwDist) clips them instead of time
        p.life = 10.0 + Math.random() * 2.0;
        p.color = getGlowColor(temp);
    }

    p.vx = vx; p.vy = vy; p.vz = vz;
    p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
    p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
    p.isSuction = isSuction;
    p.active = true;
    p.lastHistoryTime = 0;
    p.history.length = 0; 
};