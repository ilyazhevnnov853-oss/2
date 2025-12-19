
import { PerformanceResult } from '@/types';
import { DIFFUSER_CATALOG } from '@/constants';

export const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 3500, // Matching 2D density
  SPAWN_RATE_BASE: 5,
  SPAWN_RATE_MULTIPLIER: 8
};

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
    waveAngle: number; // For volumetric wave oscillation
    isHorizontal: boolean;
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

// Standard 3D Projection
export const project = (
    x: number, y: number, z: number, 
    w: number, h: number, 
    rotX: number, rotY: number, 
    scale: number,
    panX: number, panY: number
) => {
    // Rotation around Y axis
    const cx = Math.cos(rotY); 
    const sx = Math.sin(rotY);
    const x1 = x * cx - z * sx; 
    const z1 = z * cx + x * sx;

    // Rotation around X axis
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
        y: h / 2 + panY - y2 * factor, // Inverted Y for correct screen projection (Up is Up)
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

export const spawnParticle = (
    p: Particle3D, 
    state: ThreeDViewCanvasProps, 
    PPM: number, 
    offsetX: number, 
    offsetZ: number,
    perf: PerformanceResult,
    sourceModelId: string
) => {
    const { temp, roomTemp, diffuserHeight, roomHeight, roomWidth, roomLength } = state;
    
    // Determine flow type for this specific diffuser model
    const model = DIFFUSER_CATALOG.find(m => m.id === sourceModelId);
    const flowType = model ? model.modes[0].flowType : state.flowType;

    if (perf.error || !perf.spec) return;
    
    const nozzleW = (perf.spec.A / 1000) * PPM;
    
    // COORDINATE SYSTEM: Y=0 is CEILING. Y increases DOWNWARDS to Floor.
    // diffuserHeight is height from floor. 
    // So spawn position Y is (RoomHeight - DiffuserHeight).
    const startY = (roomHeight - diffuserHeight) * PPM; 
    
    const pxSpeed = (perf.v0 || 0) * PPM * 0.8;
    const dtTemp = temp - roomTemp;
    
    // Buoyancy: Hot air (-dtTemp negative) moves UP (-Y direction in our coordinate system).
    // Cold air moves DOWN (+Y).
    const buoyancy = -(dtTemp / 293) * 9.81 * PPM * 4.0;

    let vx = 0, vy = 0, vz = 0, drag = 0.96, waveAmp = 5, waveFreq = 4 + Math.random() * 4, isHorizontal = false, isSuction = false;

    if (flowType === 'suction') {
        isSuction = true;
        // Spawn randomly in room volume
        p.x = (Math.random() - 0.5) * roomWidth * PPM;
        p.z = (Math.random() - 0.5) * roomLength * PPM;
        p.y = Math.random() * (roomHeight * PPM);
        
        // Target is the diffuser
        const dx = offsetX - p.x; 
        const dy = startY - p.y; 
        const dz = offsetZ - p.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const force = (perf.v0 * 500) / (dist + 10);
        
        vx = (dx/dist)*force; 
        vy = (dy/dist)*force; 
        vz = (dz/dist)*force;
        
        drag = 1.0; waveAmp = 0; p.life = 3.0; p.color = '150, 150, 150';
    } else {
        const angle = Math.random() * Math.PI * 2; // Radial angle in XZ plane
        
        if (flowType.includes('horizontal')) {
            isHorizontal = true;
            // Radial spread
            p.x = offsetX + Math.cos(angle) * (nozzleW * 0.55);
            p.z = offsetZ + Math.sin(angle) * (nozzleW * 0.55);
            
            const spread = (Math.random() - 0.5) * 0.1;
            // Velocity mainly horizontal
            vx = Math.cos(angle + spread) * pxSpeed * 1.2;
            vz = Math.sin(angle + spread) * pxSpeed * 1.2;
            vy = pxSpeed * 0.2; // Slight downward push
            
            if (flowType.includes('swirl')) { waveAmp = 15; waveFreq = 8; } else { waveAmp = 3; }

        } else if (flowType === '4-way') {
            isHorizontal = true;
            const quad = Math.floor(Math.random() * 4) * (Math.PI / 2);
            p.x = offsetX + Math.cos(quad) * (nozzleW * 0.55);
            p.z = offsetZ + Math.sin(quad) * (nozzleW * 0.55);
            vx = Math.cos(quad) * pxSpeed;
            vz = Math.sin(quad) * pxSpeed;
            vy = pxSpeed * 0.1;

        } else if (sourceModelId === 'dpu-m' && flowType.includes('vertical')) {
            // Conical
            const coneAngle = (35 + Math.random() * 10) * (Math.PI / 180);
            p.x = offsetX + Math.cos(angle) * (nozzleW * 0.45);
            p.z = offsetZ + Math.sin(angle) * (nozzleW * 0.45);
            
            // vRad = sin(cone), vDown = cos(cone)
            const vRad = Math.sin(coneAngle) * pxSpeed;
            vx = Math.cos(angle) * vRad;
            vz = Math.sin(angle) * vRad;
            vy = Math.cos(coneAngle) * pxSpeed; // Positive Y is down
            waveAmp = 5; drag = 0.95;

        } else if (sourceModelId === 'dpu-k' && flowType.includes('vertical')) {
            p.x = offsetX + (Math.random() - 0.5) * nozzleW * 0.95;
            p.z = offsetZ + (Math.random() - 0.5) * nozzleW * 0.95;
            const spreadAngle = (Math.random() - 0.5) * 60 * (Math.PI / 180);
            
            const tilt = Math.sin(spreadAngle);
            vx = Math.cos(angle) * tilt * pxSpeed * 0.8;
            vz = Math.sin(angle) * tilt * pxSpeed * 0.8;
            vy = Math.cos(spreadAngle) * pxSpeed; 
            waveAmp = 8; drag = 0.96;

        } else if (flowType === 'vertical-swirl') {
            p.x = offsetX + Math.cos(angle) * (nozzleW * 0.5);
            p.z = offsetZ + Math.sin(angle) * (nozzleW * 0.5);
            
            const spread = (Math.random() - 0.5) * 1.5;
            // Add tangential component for 3D swirl
            const vRad = Math.sin(spread) * pxSpeed;
            const vTan = pxSpeed * 0.5;
            
            vx = Math.cos(angle) * vRad + Math.sin(angle) * vTan;
            vz = Math.sin(angle) * vRad - Math.cos(angle) * vTan;
            vy = Math.cos(spread) * pxSpeed;
            
            waveAmp = 30 + Math.random() * 10; waveFreq = 6; drag = 0.94;

        } else {
            // Compact
            p.x = offsetX + (Math.random() - 0.5) * nozzleW * 0.95;
            p.z = offsetZ + (Math.random() - 0.5) * nozzleW * 0.95;
            const spread = (Math.random() - 0.5) * 0.05;
            const vRad = Math.sin(spread) * pxSpeed * 0.3;
            
            vx = Math.cos(angle) * vRad;
            vz = Math.sin(angle) * vRad;
            vy = Math.cos(spread) * pxSpeed * 1.3;
            waveAmp = 1; drag = 0.985;
        }

        p.y = startY; 
        p.life = 2.0 + Math.random() * 1.5; 
        p.color = getGlowColor(temp);
    }

    p.vx = vx; p.vy = vy; p.vz = vz; p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
    p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
    p.waveAngle = Math.random() * Math.PI * 2; 
    p.isHorizontal = isHorizontal; p.isSuction = isSuction;
    p.active = true; p.lastHistoryTime = 0; p.history.length = 0; 
};
