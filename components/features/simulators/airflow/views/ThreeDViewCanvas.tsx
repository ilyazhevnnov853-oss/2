
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CONSTANTS, Particle3D, ThreeDViewCanvasProps, spawnParticle, updateParticlePhysics } from '../utils/airflow3DLogic';
import ViewCube from './ViewCube';

// --- SHADERS ---

const VS_SOURCE = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec4 a_color;

uniform vec2 u_resolution;
uniform vec2 u_rotation; // x = rotX, y = rotY
uniform vec2 u_pan;
uniform float u_zoom;

out vec4 v_color;

void main() {
    float x = a_position.x;
    float y = a_position.y;
    float z = a_position.z;

    // Rotation Y (Horizontal)
    float cosY = cos(u_rotation.y);
    float sinY = sin(u_rotation.y);
    float x1 = x * cosY - z * sinY;
    float z1 = z * cosY + x * sinY;

    // Rotation X (Vertical)
    float cosX = cos(u_rotation.x);
    float sinX = sin(u_rotation.x);
    // Y is usually passed as negative for screen coords in 2D, 
    // but here we work in 3D space. We'll handle orientation logic here.
    float y1 = y; 
    float y2 = y1 * cosX - z1 * sinX;
    float z2 = z1 * cosX + y1 * sinX;

    // Perspective Projection
    float fov = 1000.0;
    float cameraDist = 1500.0;
    float depth = cameraDist + z2;
    
    // Simple clipping for near plane
    if (depth < 10.0) {
        gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float factor = (fov / depth) * u_zoom;

    // Project to Screen Space (Centered)
    float screenX = x1 * factor + u_pan.x;
    float screenY = y2 * factor + u_pan.y;

    // Convert to Clip Space (-1.0 to 1.0)
    // WebGL coordinate system: (0,0) is center.
    // We adjust by resolution.
    
    float clipX = screenX / (u_resolution.x / 2.0);
    float clipY = -screenY / (u_resolution.y / 2.0); // Flip Y to match Canvas coords

    gl_Position = vec4(clipX, clipY, 0.0, 1.0);
    v_color = a_color;
}
`;

const FS_SOURCE = `#version 300 es
precision mediump float;

in vec4 v_color;
out vec4 outColor;

void main() {
    outColor = v_color;
}
`;

const MAX_PARTICLES = 5000;
const HISTORY_LENGTH = 20;
// Estimate Max Vertices: 
// Particles: 5000 * 20 segments * 2 verts = 200,000
// Static geometry ~ 5000
const MAX_VERTICES = 250000; 
const FLOATS_PER_VERTEX = 7; // x, y, z, r, g, b, a

const ThreeDViewCanvas: React.FC<ThreeDViewCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textCanvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const simulationRef = useRef(props);
    const particlesRef = useRef<Particle3D[]>([]);
    
    // WebGL Context Refs
    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
    const bufferRef = useRef<WebGLBuffer | null>(null);
    const vertexDataRef = useRef<Float32Array>(new Float32Array(MAX_VERTICES * FLOATS_PER_VERTEX));

    // Camera State
    const [camera, setCamera] = useState({ 
        rotX: 0.3, 
        rotY: -0.6, 
        panX: 0, 
        panY: 0, 
        zoom: 1.0 
    });
    
    const isDragging = useRef(false);
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    // Initialize Particles
    useEffect(() => {
        if (particlesRef.current.length === 0) {
            for (let i = 0; i < CONSTANTS.MAX_PARTICLES; i++) {
                particlesRef.current.push({
                    active: false,
                    x: 0, y: 0, z: 0,
                    vx: 0, vy: 0, vz: 0,
                    buoyancy: 0, drag: 0, age: 0, life: 0,
                    lastHistoryTime: 0,
                    history: [], 
                    color: '255,255,255',
                    waveFreq: 0, wavePhase: 0, waveAmp: 0, waveAngle: 0,
                    isHorizontal: false, isSuction: false
                });
            }
        }
    }, []);

    useEffect(() => { simulationRef.current = props; }, [props]);

    // --- WEBGL INITIALIZATION ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
        if (!gl) { console.error("WebGL2 not supported"); return; }
        glRef.current = gl;

        // Compile Shaders
        const createShader = (type: number, source: string) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
        const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);
        if (!vs || !fs) return;

        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return;
        }
        programRef.current = program;

        // Setup Buffers
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        vaoRef.current = vao;

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        // Pre-allocate buffer
        gl.bufferData(gl.ARRAY_BUFFER, vertexDataRef.current.byteLength, gl.DYNAMIC_DRAW);
        bufferRef.current = buffer;

        // Attributes
        // a_position (vec3)
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);
        
        // a_color (vec4)
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 3 * 4);

        // GL Settings
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for cool effects
        // Or standard: gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST); // Wireframes don't strictly need depth sorting for this style
        gl.clearColor(0.012, 0.012, 0.016, 1.0); // #030304

    }, []);

    // --- GEOMETRY BUILDERS ---
    const addLine = (data: Float32Array, offset: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, r: number, g: number, b: number, a: number) => {
        let i = offset;
        // Vert 1
        data[i++] = x1; data[i++] = y1; data[i++] = z1;
        data[i++] = r; data[i++] = g; data[i++] = b; data[i++] = a;
        // Vert 2
        data[i++] = x2; data[i++] = y2; data[i++] = z2;
        data[i++] = r; data[i++] = g; data[i++] = b; data[i++] = a;
        return i;
    };

    const addCircle = (data: Float32Array, offset: number, cx: number, cy: number, cz: number, radius: number, segments: number, r: number, g: number, b: number, a: number) => {
        let i = offset;
        for (let s = 0; s < segments; s++) {
            const angle1 = (s / segments) * Math.PI * 2;
            const angle2 = ((s + 1) / segments) * Math.PI * 2;
            
            const x1 = cx + Math.cos(angle1) * radius;
            const z1 = cz + Math.sin(angle1) * radius;
            
            const x2 = cx + Math.cos(angle2) * radius;
            const z2 = cz + Math.sin(angle2) * radius;
            
            i = addLine(data, i, x1, cy, z1, x2, cy, z2, r, g, b, a);
        }
        return i;
    };

    // --- ANIMATION LOOP ---
    const animate = useCallback(() => {
        const gl = glRef.current;
        const program = programRef.current;
        const state = simulationRef.current;
        
        if (!gl || !program || !state) {
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        const { width, height, isPowerOn, isPlaying, roomHeight, roomWidth, roomLength, workZoneHeight, placedDiffusers, obstacles, probes } = state;

        // Resize Canvas
        if (gl.canvas.width !== width || gl.canvas.height !== height) {
            gl.canvas.width = width;
            gl.canvas.height = height;
            gl.viewport(0, 0, width, height);
            
            // Sync Text Canvas
            if (textCanvasRef.current) {
                textCanvasRef.current.width = width;
                textCanvasRef.current.height = height;
            }
        }

        // Clear
        gl.clearColor(0.012, 0.012, 0.016, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Update Text Canvas (2D Overlay)
        const ctx = textCanvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '10px Inter';
            ctx.fillText(`ЛКМ: Вращение | ПКМ: Сдвиг | Колесо: Зум`, 20, height - 20);
        }

        gl.useProgram(program);

        // Set Uniforms
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height);
        gl.uniform2f(gl.getUniformLocation(program, 'u_rotation'), camera.rotX, camera.rotY);
        gl.uniform2f(gl.getUniformLocation(program, 'u_pan'), camera.panX, camera.panY);
        
        // Dynamic Zoom/Scale
        const PPM = (height / roomHeight) || 50; 
        const rw = roomWidth * PPM;
        const rl = roomLength * PPM;
        const rh = roomHeight * PPM;
        const maxDim = Math.max(rw, rl, rh);
        const fitScale = (Math.min(width, height) / maxDim) * 0.65;
        const finalScale = fitScale * camera.zoom;
        gl.uniform1f(gl.getUniformLocation(program, 'u_zoom'), finalScale);

        // --- POPULATE VERTEX BUFFER ---
        const data = vertexDataRef.current;
        let offset = 0;

        // Offset Y so room is centered vertically roughly
        const yOffset = -rh / 2;

        const transformY = (y: number) => -(y + yOffset);

        // 1. Room Wireframe
        if (isPowerOn) {
            const rx = rw/2; const rz = rl/2;
            const y0 = transformY(0);
            const y1 = transformY(rh);
            
            // Floor
            offset = addLine(data, offset, -rx, y0, -rz, rx, y0, -rz, 1,1,1,0.1);
            offset = addLine(data, offset, rx, y0, -rz, rx, y0, rz, 1,1,1,0.1);
            offset = addLine(data, offset, rx, y0, rz, -rx, y0, rz, 1,1,1,0.1);
            offset = addLine(data, offset, -rx, y0, rz, -rx, y0, -rz, 1,1,1,0.1);
            
            // Ceiling
            offset = addLine(data, offset, -rx, y1, -rz, rx, y1, -rz, 1,1,1,0.1);
            offset = addLine(data, offset, rx, y1, -rz, rx, y1, rz, 1,1,1,0.1);
            offset = addLine(data, offset, rx, y1, rz, -rx, y1, rz, 1,1,1,0.1);
            offset = addLine(data, offset, -rx, y1, rz, -rx, y1, -rz, 1,1,1,0.1);

            // Pillars
            offset = addLine(data, offset, -rx, y0, -rz, -rx, y1, -rz, 1,1,1,0.1);
            offset = addLine(data, offset, rx, y0, -rz, rx, y1, -rz, 1,1,1,0.1);
            offset = addLine(data, offset, rx, y0, rz, rx, y1, rz, 1,1,1,0.1);
            offset = addLine(data, offset, -rx, y0, rz, -rx, y1, rz, 1,1,1,0.1);

            // Workzone
            if (workZoneHeight > 0) {
                const wy = transformY(workZoneHeight * PPM);
                offset = addLine(data, offset, -rx, wy, -rz, rx, wy, -rz, 1, 0.8, 0, 0.2);
                offset = addLine(data, offset, rx, wy, -rz, rx, wy, rz, 1, 0.8, 0, 0.2);
                offset = addLine(data, offset, rx, wy, rz, -rx, wy, rz, 1, 0.8, 0, 0.2);
                offset = addLine(data, offset, -rx, wy, rz, -rx, wy, -rz, 1, 0.8, 0, 0.2);
            }

            // Obstacles
            if (obstacles) {
                obstacles.forEach(obs => {
                    const cx = (obs.x - roomWidth/2) * PPM;
                    const cz = (obs.y - roomLength/2) * PPM;
                    const w = obs.width * PPM;
                    const l = obs.height * PPM; 
                    const h = (obs.type === 'wall_block' ? roomHeight : 1.0) * PPM;
                    
                    const minX = cx - w/2;
                    const maxX = cx + w/2;
                    const minZ = cz - l/2;
                    const maxZ = cz + l/2;
                    const minY = transformY(obs.z * PPM);
                    const maxY = transformY((obs.z * PPM) + h);

                    const R = 0.4, G = 0.5, B = 0.6, A = 0.5;

                    // Bottom
                    offset = addLine(data, offset, minX, minY, minZ, maxX, minY, minZ, R,G,B,A);
                    offset = addLine(data, offset, maxX, minY, minZ, maxX, minY, maxZ, R,G,B,A);
                    offset = addLine(data, offset, maxX, minY, maxZ, minX, minY, maxZ, R,G,B,A);
                    offset = addLine(data, offset, minX, minY, maxZ, minX, minY, minZ, R,G,B,A);
                    // Top
                    offset = addLine(data, offset, minX, maxY, minZ, maxX, maxY, minZ, R,G,B,A);
                    offset = addLine(data, offset, maxX, maxY, minZ, maxX, maxY, maxZ, R,G,B,A);
                    offset = addLine(data, offset, maxX, maxY, maxZ, minX, maxY, maxZ, R,G,B,A);
                    offset = addLine(data, offset, minX, maxY, maxZ, minX, maxY, minZ, R,G,B,A);
                    // Sides
                    offset = addLine(data, offset, minX, minY, minZ, minX, maxY, minZ, R,G,B,A);
                    offset = addLine(data, offset, maxX, minY, minZ, maxX, maxY, minZ, R,G,B,A);
                    offset = addLine(data, offset, maxX, minY, maxZ, maxX, maxY, maxZ, R,G,B,A);
                    offset = addLine(data, offset, minX, minY, maxZ, minX, maxY, maxZ, R,G,B,A);
                });
            }

            // Probes
            if (probes) {
                probes.forEach(p => {
                    const px = (p.x - roomWidth/2) * PPM;
                    const pz = (p.y - roomLength/2) * PPM;
                    const py = transformY(p.z * PPM);
                    // Draw Cross
                    const sz = 5;
                    offset = addLine(data, offset, px-sz, py, pz, px+sz, py, pz, 0.2, 1, 0.6, 1);
                    offset = addLine(data, offset, px, py-sz, pz, px, py+sz, pz, 0.2, 1, 0.6, 1);
                    offset = addLine(data, offset, px, py, pz-sz, px, py, pz+sz, 0.2, 1, 0.6, 1);
                });
            }

            // Diffusers
            const sources = (placedDiffusers && placedDiffusers.length > 0) ? placedDiffusers : [{
                x: state.roomWidth / 2, y: state.roomLength / 2, performance: state.physics, modelId: state.modelId
            }];
            const diffY = transformY(state.diffuserHeight * PPM);
            sources.forEach(d => {
                const cx = (d.x - roomWidth/2) * PPM;
                const cz = (d.y - roomLength/2) * PPM;
                const r = (d.performance.spec.A ? Math.sqrt(d.performance.spec.A)/50 : 0.15) * PPM;
                offset = addCircle(data, offset, cx, diffY, cz, r, 16, 0.8, 0.8, 0.9, 0.8);
            });
        }

        // 2. Particles & Trails
        const pool = particlesRef.current;
        const dt = CONSTANTS.BASE_TIME_STEP;

        // Spawn Logic
        const maxV0 = state.placedDiffusers?.length 
            ? Math.max(...state.placedDiffusers.map(d => d.performance.v0 || 0))
            : (state.physics.v0 || 0);

        if (isPowerOn && isPlaying && maxV0 > 0) {
            const diffusersCount = state.placedDiffusers?.length || 1;
            const baseRate = CONSTANTS.SPAWN_RATE_BASE + maxV0 / 2 * CONSTANTS.SPAWN_RATE_MULTIPLIER;
            const spawnRate = Math.ceil(baseRate * diffusersCount);
            
            let spawnedCount = 0;
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i].active) {
                    spawnParticle(pool[i], state, PPM);
                    spawnedCount++;
                    if (spawnedCount >= spawnRate) break;
                }
            }
        }

        // Draw Trails Loop
        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;

            if (isPowerOn && isPlaying) {
                p.age += dt;
                updateParticlePhysics(p, dt, state, PPM);
                if (p.age > p.life) p.active = false;

                if (p.age - p.lastHistoryTime >= CONSTANTS.HISTORY_RECORD_INTERVAL) {
                    if (p.history.length > HISTORY_LENGTH) p.history.shift();
                    p.history.push({ x: p.x, y: p.y, z: p.z, age: p.age });
                    p.lastHistoryTime = p.age;
                }
            }

            // Extract Color from string "255,255,255"
            const colParts = p.color.split(',').map(Number);
            const R = colParts[0]/255; 
            const G = colParts[1]/255; 
            const B = colParts[2]/255;

            // Render current segment to last history
            if (p.history.length > 0) {
                const last = p.history[p.history.length - 1];
                
                const waveVal = Math.sin(p.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(p.age, 1.0);
                let wx = 0, wy = 0, wz = 0;
                if (!p.isSuction) {
                    if (Math.abs(p.vy) > Math.abs(p.vx) + Math.abs(p.vz)) {
                        wx = waveVal * Math.cos(p.wavePhase); 
                        wz = waveVal * Math.sin(p.wavePhase);
                    } else { wy = waveVal; }
                }

                // Current Pos
                const cx = p.x + wx; 
                const cy = transformY(p.y + wy); 
                const cz = p.z + wz;

                // Last History Pos
                const hWave = Math.sin(last.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(last.age, 1.0);
                let hwx = 0, hwy = 0, hwz = 0;
                if (!p.isSuction) {
                    if (Math.abs(p.vy) > Math.abs(p.vx) + Math.abs(p.vz)) {
                        hwx = hWave * Math.cos(p.wavePhase);
                        hwz = hWave * Math.sin(p.wavePhase);
                    } else { hwy = hWave; }
                }
                const lx = last.x + hwx; 
                const ly = transformY(last.y + hwy); 
                const lz = last.z + hwz;

                offset = addLine(data, offset, cx, cy, cz, lx, ly, lz, R, G, B, 1.0);

                // History Segments
                for (let j = p.history.length - 1; j > 0; j--) {
                    const h1 = p.history[j];
                    const h2 = p.history[j-1];
                    const alpha = (j / p.history.length);
                    
                    const w1 = Math.sin(h1.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(h1.age, 1.0);
                    const w2 = Math.sin(h2.age * p.waveFreq + p.wavePhase) * p.waveAmp * Math.min(h2.age, 1.0);
                    
                    // Simple logic for wave direction (optimized)
                    let off1x=0, off1y=0, off1z=0;
                    let off2x=0, off2y=0, off2z=0;
                    
                    if (!p.isSuction && Math.abs(p.vy) <= Math.abs(p.vx) + Math.abs(p.vz)) {
                        off1y = w1; off2y = w2;
                    } 

                    offset = addLine(data, offset, 
                        h1.x+off1x, transformY(h1.y+off1y), h1.z+off1z, 
                        h2.x+off2x, transformY(h2.y+off2y), h2.z+off2z, 
                        R, G, B, alpha
                    );
                }
            }
        }

        // Draw Call
        const vertexCount = offset / FLOATS_PER_VERTEX;
        if (vertexCount > 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
            // Upload only used portion? Or full? 
            // SubData is faster if we track range, but BufferData with view is also ok for this size.
            // Using subarray to upload only valid data
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, offset));
            
            gl.bindVertexArray(vaoRef.current);
            gl.drawArrays(gl.LINES, 0, vertexCount);
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [camera]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [animate]);

    // Input Handling
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = -Math.sign(e.deltaY) * 0.1;
        setCamera(prev => ({ ...prev, zoom: Math.max(0.1, Math.min(5, prev.zoom + delta)) }));
    }, []);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
            isDragging.current = true;
        } else {
            clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY;
            if ((e as React.MouseEvent).button === 1 || (e as React.MouseEvent).shiftKey) isPanning.current = true;
            else isDragging.current = true;
        }
        lastMouse.current = { x: clientX, y: clientY };
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging.current && !isPanning.current) return;
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY;
        }
        const dx = clientX - lastMouse.current.x;
        const dy = clientY - lastMouse.current.y;
        
        if (isDragging.current) {
            setCamera(prev => ({
                ...prev,
                rotY: prev.rotY + dx * 0.005,
                rotX: Math.max(-1.5, Math.min(1.5, prev.rotX + dy * 0.005))
            }));
        } else if (isPanning.current) {
            setCamera(prev => ({
                ...prev,
                panX: prev.panX + dx,
                panY: prev.panY - dy // Flip Y for pan intuition
            }));
        }
        lastMouse.current = { x: clientX, y: clientY };
    };

    const handleEnd = () => { isDragging.current = false; isPanning.current = false; };

    return (
        <div 
            className="relative w-full h-full cursor-move bg-[#030304]"
            onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
            onWheel={handleWheel} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        >
            <ViewCube rotX={camera.rotX} rotY={camera.rotY} setCamera={setCamera} />
            
            {/* Main WebGL Canvas */}
            <canvas 
                ref={canvasRef} 
                width={props.width} 
                height={props.height} 
                className="absolute inset-0 w-full h-full" 
            />
            
            {/* Overlay Text Canvas */}
            <canvas 
                ref={textCanvasRef}
                width={props.width}
                height={props.height}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />
        </div>
    );
};

export default React.memo(ThreeDViewCanvas);
