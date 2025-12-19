import { PerformanceResult } from '../../../../../types';
import { DIFFUSER_CATALOG } from '../../../../../constants';

export const CONSTANTS = {
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 3500,
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
    waveAngle: number;
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
        y: h / 2 + panY - y2 * factor,
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

/**
 * Spawns a particle with physically derived initial velocity and buoyancy.
 */
export const spawnParticle = (
    p: Particle3D, 
    state: ThreeDViewCanvasProps, 
    PPM: number, 
    offsetX: number, 
    offsetZ: number,
    perf: PerformanceResult,
    sourceModelId: string
) => {
    const { temp, roomTemp, diffuserHeight, roomHeight } = state;
    
    const model = DIFFUSER_CATALOG.find(m => m.id === sourceModelId);
    const flowType = model ? model.modes[0].flowType : state.flowType;

    if (perf.error || !perf.spec) return;
    
    const nozzleW = (perf.spec.A / 1000) * PPM;
    // Y=0 is Ceiling. Spawn at diffuser face.
    const startY = (roomHeight - diffuserHeight) * PPM; 
    
    const pxSpeed = (perf.v0 || 0) * PPM * 0.8;
    const dtTemp = temp - roomTemp;
    
    // Buoyancy Force: F ~ g * (dRho/Rho)
    // Cold (dt < 0) -> Higher density -> Downward force (+Y).
    // Hot (dt > 0) -> Lower density -> Upward force (-Y).
    // Scaling factor 4.0 for visual effect
    const buoyancy = -(dtTemp / 293) * 9.81 * PPM * 4.0;

    let vx = 0, vy = 0, vz = 0, drag = 0.96, waveAmp = 5, waveFreq = 4 + Math.random() * 4, isHorizontal = false, isSuction = false;

    if (flowType === 'suction') {
        isSuction = true;
        // Random spawn in volume
        p.x = (Math.random() - 0.5) * state.roomWidth * PPM;
        p.z = (Math.random() - 0.5) * state.roomLength * PPM;
        p.y = Math.random() * (state.roomHeight * PPM);
        
        // Attraction to source
        const dx = offsetX - p.x; 
        const dy = startY - p.y; 
        const dz = offsetZ - p.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const force = (perf.v0 * 500) / (dist + 10);
        
        vx = (dx/dist)*force; vy = (dy/dist)*force; vz = (dz/dist)*force;
        drag = 1.0; waveAmp = 0; p.life = 3.0; p.color = '150, 150, 150';
    } else {
        const angle = Math.random() * Math.PI * 2; 
        
        if (flowType.includes('horizontal') || flowType.includes('4-way')) {
            isHorizontal = true;
            p.x = offsetX + Math.cos(angle) * (nozzleW * 0.55);
            p.z = offsetZ + Math.sin(angle) * (nozzleW * 0.55);
            
            const spread = (Math.random() - 0.5) * 0.1;
            vx = Math.cos(angle + spread) * pxSpeed * 1.2;
            vz = Math.sin(angle + spread) * pxSpeed * 1.2;
            vy = pxSpeed * 0.15; // Initial downward momentum from nozzle geometry
            
            if (flowType.includes('swirl')) { waveAmp = 15; waveFreq = 8; } else { waveAmp = 3; }

        } else if (sourceModelId === 'dpu-m' && flowType.includes('vertical')) {
            // Conical
            const coneAngle = (35 + Math.random() * 10) * (Math.PI / 180);
            p.x = offsetX + Math.cos(angle) * (nozzleW * 0.45);
            p.z = offsetZ + Math.sin(angle) * (nozzleW * 0.45);
            const vRad = Math.sin(coneAngle) * pxSpeed;
            vx = Math.cos(angle) * vRad;
            vz = Math.sin(angle) * vRad;
            vy = Math.cos(coneAngle) * pxSpeed; 
            waveAmp = 5; drag = 0.95;

        } else if (flowType === 'vertical-swirl') {
            p.x = offsetX + Math.cos(angle) * (nozzleW * 0.5);
            p.z = offsetZ + Math.sin(angle) * (nozzleW * 0.5);
            const spread = (Math.random() - 0.5) * 1.5;
            const vRad = Math.sin(spread) * pxSpeed;
            const vTan = pxSpeed * 0.5;
            vx = Math.cos(angle) * vRad + Math.sin(angle) * vTan;
            vz = Math.sin(angle) * vRad - Math.cos(angle) * vTan;
            vy = Math.cos(spread) * pxSpeed;
            waveAmp = 30; waveFreq = 6; drag = 0.94;

        } else {
            // Standard Vertical
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

/**
 * Updates particle position and velocity based on physical forces:
 * - Drag
 * - Buoyancy (Archimedes)
 * - Coanda Effect (Ceiling attachment)
 * - Wall/Floor Collisions
 */
export const updateParticlePhysics = (
    p: Particle3D, 
    dt: number, 
    ceilingY: number, // Y coord of ceiling (usually 0)
    floorY: number,   // Y coord of floor
    rw: number,       // Room Width (px)
    rl: number        // Room Length (px)
) => {
    p.age += dt;
    
    if (p.isSuction) {
        // Simple linear drift for suction
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    } else {
        // --- COANDA EFFECT ---
        // If horizontal jet is near ceiling, it sticks.
        // We simulate this by suppressing downward buoyancy or applying slight upward force.
        // Y grows downwards. Ceiling is Y=0.
        let effectiveBuoyancy = p.buoyancy;
        
        if (p.isHorizontal && Math.abs(p.y - ceilingY) < 60) {
            // Check if we still have significant horizontal momentum
            const hSpeed = Math.sqrt(p.vx*p.vx + p.vz*p.vz);
            if (hSpeed > 0.5) {
                // If Cold (Buoyancy > 0, down): reduce it to simulate clinging
                if (effectiveBuoyancy > 0) effectiveBuoyancy *= 0.1;
                // Add slight suction force towards ceiling
                p.vy -= 8.0 * dt; 
            }
        }

        p.vy += effectiveBuoyancy * dt;
        
        // Drag
        p.vx *= p.drag; p.vy *= p.drag; p.vz *= p.drag;
        
        // Integration
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        // --- COLLISIONS ---
        const damping = 0.8;
        const turbulence = 2.0;

        // X Walls
        if (p.x < -rw/2) { p.x = -rw/2 + 1; p.vx = Math.abs(p.vx)*0.5 + Math.random()*turbulence; }
        else if (p.x > rw/2) { p.x = rw/2 - 1; p.vx = -Math.abs(p.vx)*0.5 - Math.random()*turbulence; }
        
        // Z Walls
        if (p.z < -rl/2) { p.z = -rl/2 + 1; p.vz = Math.abs(p.vz)*0.5 + Math.random()*turbulence; }
        else if (p.z > rl/2) { p.z = rl/2 - 1; p.vz = -Math.abs(p.vz)*0.5 - Math.random()*turbulence; }

        // Floor
        if (p.y > floorY) {
            p.y = floorY - 1;
            p.vy = 0; // Stick/Spread on floor
            p.vx += (Math.random() - 0.5) * 5; // Spread
            p.vz += (Math.random() - 0.5) * 5;
        }
    }
};