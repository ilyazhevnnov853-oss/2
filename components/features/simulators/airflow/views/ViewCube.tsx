import React, { useRef, useState } from 'react';

// --- REVIT-STYLE VIEW CUBE ---
const ViewCube = ({ rotX, rotY, setCamera }: { rotX: number, rotY: number, setCamera: any }) => {
    const [isDragging, setIsDragging] = useState(false);
    const cubeRef = useRef<HTMLDivElement>(null);
    const lastMouse = useRef({ x: 0, y: 0 });

    const size = 80;
    const offset = size / 2;
    
    // Invert rotations for CSS visual matching with Canvas projection
    // Canvas RotY is Azimuth (Orbit around Y). CSS rotateY is similar.
    // Canvas RotX is Elevation (Orbit around X).
    const rX = rotX * (180 / Math.PI);
    const rY = -rotY * (180 / Math.PI); 

    // Helper for snapping camera
    const snap = (rx: number, ry: number) => {
        if (isDragging) return;
        setCamera((prev: any) => ({ ...prev, rotX: rx, rotY: ry }));
    };

    // Drag Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(false);
        lastMouse.current = { x: e.clientX, y: e.clientY };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;

        if (!isDragging && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
            setIsDragging(true);
        }

        if (isDragging || Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            setCamera((prev: any) => ({
                ...prev,
                rotY: prev.rotY + dx * 0.005,
                rotX: Math.max(-1.5, Math.min(1.5, prev.rotX + dy * 0.005))
            }));
            lastMouse.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        setTimeout(() => setIsDragging(false), 50);
    };

    // Styling Constants
    const baseFace = "absolute inset-0 flex items-center justify-center border border-slate-400/30 bg-[#f0f2f5] text-[10px] font-extrabold text-slate-500 transition-colors select-none uppercase tracking-wider";
    const hoverFace = "hover:bg-blue-100 hover:text-blue-600 cursor-pointer";
    const highlight = "absolute bg-transparent hover:bg-blue-500/40 z-50 cursor-pointer transition-colors";

    // Isometric Calculation
    const isoEle = Math.atan(1 / Math.sqrt(2)); // ~35.26 deg
    const iso45 = Math.PI / 4;

    return (
        <div className="absolute top-12 right-12 z-50 w-24 h-24 flex items-center justify-center group perspective-800"
             onMouseDown={handleMouseDown}>
            
            {/* Compass Ring (Stationary-ish, rotates with Azimuth) */}
            <div className="absolute w-28 h-28 rounded-full border-2 border-slate-200/50 flex items-center justify-center pointer-events-none transition-transform duration-75"
                 style={{ transform: `rotateX(70deg) rotateZ(${rY}deg)` }}>
                <div className="absolute top-1 font-bold text-[9px] text-slate-400">N</div>
                <div className="absolute bottom-1 font-bold text-[9px] text-slate-400">S</div>
                <div className="absolute right-1 font-bold text-[9px] text-slate-400">E</div>
                <div className="absolute left-1 font-bold text-[9px] text-slate-400">W</div>
                <div className="w-full h-full rounded-full bg-slate-200/5"></div>
            </div>

            {/* The Cube */}
            <div 
                ref={cubeRef}
                className="relative w-20 h-20 transform-3d shadow-2xl"
                style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: `rotateX(${rX}deg) rotateY(${rY}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.1, 0.6, 0.2, 1)'
                }}
            >
                {/* --- FACES (6) --- */}
                <div className={`${baseFace} ${hoverFace}`} style={{ transform: `translateZ(${offset}px)` }} onClick={() => snap(0, 0)}>ПЕРЕД</div>
                <div className={`${baseFace} ${hoverFace}`} style={{ transform: `rotateY(180deg) translateZ(${offset}px)` }} onClick={() => snap(0, Math.PI)}>СЗАДИ</div>
                <div className={`${baseFace} ${hoverFace}`} style={{ transform: `rotateY(90deg) translateZ(${offset}px)` }} onClick={() => snap(0, -Math.PI/2)}>ПРАВО</div>
                <div className={`${baseFace} ${hoverFace}`} style={{ transform: `rotateY(-90deg) translateZ(${offset}px)` }} onClick={() => snap(0, Math.PI/2)}>ЛЕВО</div>
                <div className={`${baseFace} ${hoverFace}`} style={{ transform: `rotateX(90deg) translateZ(${offset}px)` }} onClick={() => snap(Math.PI/2, 0)}>ВЕРХ</div>
                <div className={`${baseFace} ${hoverFace}`} style={{ transform: `rotateX(-90deg) translateZ(${offset}px)` }} onClick={() => snap(-Math.PI/2, 0)}>НИЗ</div>

                {/* --- CORNERS (8) - Click Targets --- */}
                {/* Top Corners */}
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${offset-12}px, ${-offset+12}px, ${offset}px)` }} onClick={() => snap(isoEle, -iso45)} />
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${-offset+12}px, ${-offset+12}px, ${offset}px)` }} onClick={() => snap(isoEle, iso45)} />
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${offset-12}px, ${-offset+12}px, ${-offset}px)` }} onClick={() => snap(isoEle, -iso45 - Math.PI/2)} />
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${-offset+12}px, ${-offset+12}px, ${-offset}px)` }} onClick={() => snap(isoEle, iso45 + Math.PI/2)} />
                
                {/* Bottom Corners */}
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${offset-12}px, ${offset-12}px, ${offset}px)` }} onClick={() => snap(-isoEle, -iso45)} />
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${-offset+12}px, ${offset-12}px, ${offset}px)` }} onClick={() => snap(-isoEle, iso45)} />
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${-offset+12}px, ${offset-12}px, ${-offset}px)` }} onClick={() => snap(-isoEle, -iso45 - Math.PI/2)} />
                <div className={highlight} style={{ width: 24, height: 24, transform: `translate3d(${-offset+12}px, ${offset-12}px, ${-offset}px)` }} onClick={() => snap(-isoEle, iso45 + Math.PI/2)} />

                {/* --- EDGES (12) - Click Targets --- */}
                {/* Top Edges */}
                <div className={highlight} style={{ width: size-24, height: 16, transform: `rotateX(90deg) translate3d(0, ${-offset}px, ${offset}px)` }} onClick={() => snap(Math.PI/4, 0)} />
                <div className={highlight} style={{ width: 16, height: size-24, transform: `rotateY(90deg) translate3d(0, ${-offset+size/2}px, ${offset}px)` }} onClick={() => snap(Math.PI/4, -Math.PI/2)} />
                <div className={highlight} style={{ width: 16, height: size-24, transform: `rotateY(-90deg) translate3d(0, ${-offset+size/2}px, ${offset}px)` }} onClick={() => snap(Math.PI/4, Math.PI/2)} />
                <div className={highlight} style={{ width: size-24, height: 16, transform: `rotateX(-90deg) translate3d(0, ${-offset}px, ${-offset}px)` }} onClick={() => snap(Math.PI/4, Math.PI)} />

                {/* Vertical Edges */}
                <div className={highlight} style={{ width: 16, height: size-24, transform: `translate3d(${offset}px, 0, ${offset}px) rotateY(45deg)` }} onClick={() => snap(0, -Math.PI/4)} />
                <div className={highlight} style={{ width: 16, height: size-24, transform: `translate3d(${-offset}px, 0, ${offset}px) rotateY(-45deg)` }} onClick={() => snap(0, Math.PI/4)} />
                <div className={highlight} style={{ width: 16, height: size-24, transform: `translate3d(${offset}px, 0, ${-offset}px) rotateY(-45deg)` }} onClick={() => snap(0, -Math.PI*0.75)} />
                <div className={highlight} style={{ width: 16, height: size-24, transform: `translate3d(${-offset}px, 0, ${-offset}px) rotateY(45deg)` }} onClick={() => snap(0, Math.PI*0.75)} />
            </div>
        </div>
    );
};

export default ViewCube;