
import { PerformanceResult, PlacedDiffuser, Obstacle, Probe } from '../../../../../types';
import { DIFFUSER_CATALOG } from '../../../../../constants';

export const CONSTANTS = {
  BASE_TIME_STEP: 1/60,
  HISTORY_RECORD_INTERVAL: 0.015,
  MAX_PARTICLES: 5000,
  SPAWN_RATE_BASE: 5,
  SPAWN_RATE_MULTIPLIER: 8,
};

export interface Particle3D {
    active: boolean;
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    buoyancy: number; drag: number;
    age: number; life: number;
    lastHistoryTime: number;
    history: {x: number, y: number, z: number, age: number}[];
    color: string;
    waveFreq: number; wavePhase: number; waveAmp: number; waveAngle: number;
    isHorizontal: boolean; isSuction: boolean;
}

export interface ThreeDViewCanvasProps {
  width: number;
  height: number;
  physics: PerformanceResult;
  placedDiffusers?: PlacedDiffuser[];
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
  // Added Props
  obstacles?: Obstacle[];
  probes?: Probe[];
}

export const getGlowColor = (t: number) => {
    if (t <= 18) return `64, 224, 255`;
    if (t >= 28) return `255, 99, 132`;
    if (t > 18 && t < 28) return `100, 255, 160`;
    return `255, 255, 255`;
};

// 3D Projection Logic
export const project = (x: number, y: number, z: number, width: number, height: number, rotX: number, rotY: number, scale: number, panX: number, panY: number) => {
    // Rotation Y
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = z * cosY + x * sinY;

    // Rotation X
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = z1 * cosX + y * sinX;

    // Simple Perspective Projection
    const fov = 1000;
    const cameraDist = 1500;
    
    const depth = cameraDist + z2;
    if (depth < 10) return { x: -10000, y: -10000, s: 0, z: z2 }; // Clipped

    const factor = (fov / depth) * scale;

    return {
        x: width / 2 + panX + x1 * factor,
        y: height / 2 + panY + y2 * factor, 
        s: factor,
        z: z2 
    };
};

export const spawnParticle = (
    p: Particle3D, 
    state: ThreeDViewCanvasProps, 
    ppm: number
) => {
    // Select Source Diffuser
    let activeDiffuser: {
        x: number, y: number, // Top View Coordinates in meters
        performance: PerformanceResult,
        modelId: string
    };

    if (state.placedDiffusers && state.placedDiffusers.length > 0) {
        // Pick a random diffuser to spawn from
        const idx = Math.floor(Math.random() * state.placedDiffusers.length);
        const d = state.placedDiffusers[idx];
        activeDiffuser = {
            x: d.x,
            y: d.y,
            performance: d.performance,
            modelId: d.modelId
        };
    } else {
        // If no diffusers are placed, do not spawn particles.
        return;
    }

    const { performance: physics, modelId } = activeDiffuser;
    const { temp, roomHeight, diffuserHeight, roomWidth, roomLength } = state;
        
    if (physics.error) return;
    const spec = physics.spec;
    if (!spec || !spec.A) return;
    
    // Convert Position to 3D Space centered at (0,0,0)
    // 3D Coords: x (width), y (height), z (length)
    const centerX = (activeDiffuser.x - roomWidth / 2) * ppm;
    const centerZ = (activeDiffuser.y - roomLength / 2) * ppm;

    const nozzleW = (spec.A / 1000) * ppm;
    const startY = (diffuserHeight * ppm); 
    
    const pxSpeed = (physics.v0 || 0) * ppm * 0.8;

    // Determine Flow Type from Model
    const catalogItem = DIFFUSER_CATALOG.find(c => c.id === modelId);
    const flowType = catalogItem ? catalogItem.modes[0].flowType : state.flowType;

    let startX = 0, startZ = 0;
    let vx = 0, vy = 0, vz = 0;
    let drag = 0.96;
    let waveAmp = 5;
    let waveFreq = 4 + Math.random() * 4;
    let isSuction = false;

    const physicsAr = physics.Ar || 0; 
    const visualGain = 50.0; 
    const buoyancy = physicsAr * (physics.v0 * physics.v0) * ppm * visualGain;

    if (flowType === 'suction') {
        isSuction = true;
        // Random position in room
        const randX = (Math.random() - 0.5) * state.roomWidth * ppm;
        const randZ = (Math.random() - 0.5) * state.roomLength * ppm;
        const randY = Math.random() * startY;
        
        p.x = randX; p.y = randY; p.z = randZ;
        
        // Target is the specific diffuser
        const dx = centerX - randX;
        const dy = startY - randY;
        const dz = centerZ - randZ;
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
            
            startX = centerX + Math.cos(angle) * (nozzleW * 0.55);
            startZ = centerZ + Math.sin(angle) * (nozzleW * 0.55);
            
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
            startX = centerX; startZ = centerZ;

        } else if (modelId === 'dpu-k' && flowType.includes('vertical')) {
            const spreadAngle = (Math.random() - 0.5) * 60 * (Math.PI / 180);
            startX = centerX + (Math.random() - 0.5) * nozzleW * 0.95; 
            startZ = centerZ + (Math.random() - 0.5) * nozzleW * 0.95;
            const rSpd = Math.sin(spreadAngle) * pxSpeed * 0.8; 
            radSpeed = Math.abs(rSpd);
            vertSpeed = -Math.cos(spreadAngle) * pxSpeed;
            waveAmp = 8; drag = 0.96;

        } else if (flowType === 'vertical-swirl') {
            startX = centerX + (Math.random() - 0.5) * nozzleW * 0.9;
            startZ = centerZ + (Math.random() - 0.5) * nozzleW * 0.9;
            const spread = (Math.random() - 0.5) * 1.5;
            radSpeed = Math.sin(spread) * pxSpeed * 0.5;
            vertSpeed = -Math.cos(spread) * pxSpeed;
            waveAmp = 30 + Math.random() * 10; waveFreq = 6; drag = 0.94;
        } else {
            // Default/Compact
            startX = centerX + (Math.random() - 0.5) * nozzleW * 0.95;
            startZ = centerZ + (Math.random() - 0.5) * nozzleW * 0.95;
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
        p.life = 2.0 + Math.random() * 1.5;
        p.color = getGlowColor(temp);
    }

    p.vx = vx; p.vy = vy; p.vz = vz;
    p.buoyancy = buoyancy; p.drag = drag; p.age = 0; 
    p.waveFreq = waveFreq; p.wavePhase = Math.random() * Math.PI * 2; p.waveAmp = waveAmp;
    p.isSuction = isSuction;
    p.active = true;
    p.lastHistoryTime = 0;
    p.history = [];
};

export const updateParticlePhysics = (
    p: Particle3D, 
    dt: number, 
    state: ThreeDViewCanvasProps,
    ppm: number
) => {
    const rh = state.roomHeight * ppm;
    const rw = state.roomWidth * ppm;
    const rl = state.roomLength * ppm;
    const diffY = state.diffuserHeight * ppm;

    if (p.isSuction) {
        // Simplified suction physics: particles travel based on initial vector towards source
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        
        // Kill if close to ceiling/diffuser level
        if (p.y > diffY - 10) p.active = false;

    } else {
        p.vy += p.buoyancy * dt; 
        p.vx *= p.drag; p.vy *= p.drag; p.vz *= p.drag;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    
    // Bounds check with walls
    if (p.y < 0 || p.y > rh || Math.abs(p.x) > rw/2 || Math.abs(p.z) > rl/2) {
        p.active = false;
    }

    // Collision Check with Obstacles
    if (state.obstacles && p.active) {
        // Coordinates in state.obstacles are relative to Top-Left of Room.
        // Particle coordinates (p.x, p.z) are centered at (0,0) of room.
        // Need to convert to same space.
        
        // Convert particle to 0-based coords (like Obstacles)
        // Particle X range: [-rw/2, rw/2] -> [0, rw]
        const pX_abs = p.x + rw / 2;
        const pZ_abs = p.z + rl / 2;
        const pY_abs = p.y; // Height from floor 0 to ceiling rh

        for (const obs of state.obstacles) {
            // Obstacle Plan coords (meters) -> Pixels
            const obsX = obs.x * ppm;
            const obsZ = obs.y * ppm; // "y" in obstacle is Length/Z
            const obsW = obs.width * ppm;
            const obsL = obs.height * ppm; // "height" in obstacle type is Length/Z
            
            // Obstacle Vertical Height
            // furniture = 1.0m, wall_block = roomHeight
            const obsH = (obs.type === 'wall_block' ? state.roomHeight : 1.0) * ppm;

            // Check Collision (AABB)
            // Obstacle is centered at obsX, obsZ
            if (
                pX_abs >= obsX - obsW/2 && pX_abs <= obsX + obsW/2 &&
                pZ_abs >= obsZ - obsL/2 && pZ_abs <= obsZ + obsL/2 &&
                pY_abs >= 0 && pY_abs <= obsH
            ) {
                p.active = false;
                break;
            }
        }
    }
};
