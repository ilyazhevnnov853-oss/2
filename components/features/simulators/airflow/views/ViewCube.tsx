import React, { useRef, useState, useEffect } from 'react';

interface ViewCubeProps {
    rotX: number;
    rotY: number;
    onViewChange: (rx: number, ry: number, smooth: boolean) => void;
}

const ViewCube = ({ rotX, rotY, onViewChange }: ViewCubeProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const cubeRef = useRef<HTMLDivElement>(null);
    const lastMouse = useRef({ x: 0, y: 0 });

    const size = 80;
    const offset = size / 2;
    const cornerSize = 24;
    const edgeThickness = 16;
    
    // Invert rotations for CSS visual matching with Canvas projection
    const rX = rotX * (180 / Math.PI);
    const rY = -rotY * (180 / Math.PI); 

    // Helper for snapping camera (Smooth)
    const snap = (rx: number, ry: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent drag start
        if (isDragging) return;
        onViewChange(rx, ry, true);
    };

    // --- DRAG LOGIC ---
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
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
            // Calculate new rotation
            const newRotY = rotY + dx * 0.005;
            const newRotX = Math.max(-1.5, Math.min(1.5, rotX + dy * 0.005));
            
            // Instant update during drag
            onViewChange(newRotX, newRotY, false); 
            
            lastMouse.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        setTimeout(() => setIsDragging(false), 50);
    };

    // Styles
    const faceClass = "absolute inset-0 flex items-center justify-center border border-slate-400/20 bg-[#f0f2f5] text-[10px] font-bold text-slate-500 hover:bg-[#dbeafe] hover:text-blue-600 transition-colors cursor-pointer select-none uppercase shadow-sm opacity-90 hover:opacity-100 backface-hidden";
    
    // Interactive Zones (Corners/Edges) - Enhanced hover effects
    const highlightClass = "absolute bg-transparent hover:bg-blue-500/80 hover:border-2 hover:border-white/80 hover:shadow-[0_0_15px_rgba(59,130,246,0.8)] cursor-pointer z-50 transition-all duration-200 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm backdrop-blur-[1px]";

    // Isometric Angle (approx 35.264 degrees elevation)
    const isoX = Math.atan(1 / Math.sqrt(2));
    const iso45 = Math.PI / 4;

    return (
        <div className="absolute top-8 right-8 z-50 w-24 h-24 flex items-center justify-center group perspective-800"
             onMouseDown={handleMouseDown}>
            
            {/* Compass Ring */}
            <div className="absolute w-28 h-28 rounded-full border-2 border-slate-300/30 flex items-center justify-center pointer-events-none transition-transform duration-75 ease-linear"
                 style={{ transform: `rotateX(70deg) rotateZ(${rY}deg)` }}>
                <span className="absolute -top-4 font-bold text-[8px] text-slate-400">N</span>
                <span className="absolute -bottom-4 font-bold text-[8px] text-slate-400">S</span>
                <span className="absolute -right-3 font-bold text-[8px] text-slate-400">E</span>
                <span className="absolute -left-3 font-bold text-[8px] text-slate-400">W</span>
                <div className="w-full h-full rounded-full bg-slate-500/5"></div>
            </div>

            {/* Cube Container */}
            <div 
                ref={cubeRef}
                className="relative w-16 h-16 transform-3d shadow-2xl"
                style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: `rotateX(${rX}deg) rotateY(${rY}deg)`,
                    // Disable CSS transition to prevent jitter during JS-driven animation (Lerp)
                    transition: 'none'
                }}
            >
                {/* --- FACES (6) --- */}
                <div className={faceClass} style={{ transform: `translateZ(${offset}px)` }} onClick={(e) => snap(0, 0, e)}>FRONT</div>
                <div className={faceClass} style={{ transform: `rotateY(180deg) translateZ(${offset}px)` }} onClick={(e) => snap(0, Math.PI, e)}>BACK</div>
                <div className={faceClass} style={{ transform: `rotateY(90deg) translateZ(${offset}px)` }} onClick={(e) => snap(0, -Math.PI/2, e)}>RIGHT</div>
                <div className={faceClass} style={{ transform: `rotateY(-90deg) translateZ(${offset}px)` }} onClick={(e) => snap(0, Math.PI/2, e)}>LEFT</div>
                <div className={faceClass} style={{ transform: `rotateX(90deg) translateZ(${offset}px)` }} onClick={(e) => snap(Math.PI/2, 0, e)}>TOP</div>
                <div className={faceClass} style={{ transform: `rotateX(-90deg) translateZ(${offset}px)` }} onClick={(e) => snap(-Math.PI/2, 0, e)}>BOTTOM</div>

                {/* --- CORNERS (8) --- */}
                {/* Top Corners */}
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset}px, ${-offset}px, ${offset}px)` }} onClick={(e) => snap(isoX, -iso45, e)} title="Top Front Right" />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset}px, ${-offset}px, ${offset}px)` }} onClick={(e) => snap(isoX, iso45, e)} title="Top Front Left" />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset}px, ${-offset}px, ${-offset}px)` }} onClick={(e) => snap(isoX, -iso45 - Math.PI/2, e)} title="Top Back Right" />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset}px, ${-offset}px, ${-offset}px)` }} onClick={(e) => snap(isoX, iso45 + Math.PI/2, e)} title="Top Back Left" />
                
                {/* Bottom Corners */}
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset}px, ${offset}px, ${offset}px)` }} onClick={(e) => snap(-isoX, -iso45, e)} title="Bottom Front Right" />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset}px, ${offset}px, ${offset}px)` }} onClick={(e) => snap(-isoX, iso45, e)} title="Bottom Front Left" />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset}px, ${offset}px, ${-offset}px)` }} onClick={(e) => snap(-isoX, -iso45 - Math.PI/2, e)} title="Bottom Back Right" />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset}px, ${offset}px, ${-offset}px)` }} onClick={(e) => snap(-isoX, iso45 + Math.PI/2, e)} title="Bottom Back Left" />

                {/* --- EDGES (12) --- */}
                {/* Top Edges Ring */}
                <div className={highlightClass} style={{ width: size - cornerSize, height: edgeThickness, transform: `translate3d(0, ${-offset}px, ${offset}px) rotateX(45deg)` }} onClick={(e) => snap(iso45, 0, e)} title="Top Front" />
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${offset}px, ${-offset}px, 0) rotateZ(45deg) rotateY(90deg)` }} onClick={(e) => snap(iso45, -Math.PI/2, e)} title="Top Right" />
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${-offset}px, ${-offset}px, 0) rotateZ(-45deg) rotateY(90deg)` }} onClick={(e) => snap(iso45, Math.PI/2, e)} title="Top Left" />
                <div className={highlightClass} style={{ width: size - cornerSize, height: edgeThickness, transform: `translate3d(0, ${-offset}px, ${-offset}px) rotateX(-45deg)` }} onClick={(e) => snap(iso45, Math.PI, e)} title="Top Back" />

                {/* Bottom Edges Ring */}
                <div className={highlightClass} style={{ width: size - cornerSize, height: edgeThickness, transform: `translate3d(0, ${offset}px, ${offset}px) rotateX(-45deg)` }} onClick={(e) => snap(-iso45, 0, e)} title="Bottom Front" />
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${offset}px, ${offset}px, 0) rotateZ(-45deg) rotateY(90deg)` }} onClick={(e) => snap(-iso45, -Math.PI/2, e)} title="Bottom Right" />
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${-offset}px, ${offset}px, 0) rotateZ(45deg) rotateY(90deg)` }} onClick={(e) => snap(-iso45, Math.PI/2, e)} title="Bottom Left" />
                <div className={highlightClass} style={{ width: size - cornerSize, height: edgeThickness, transform: `translate3d(0, ${offset}px, ${-offset}px) rotateX(45deg)` }} onClick={(e) => snap(-iso45, Math.PI, e)} title="Bottom Back" />

                {/* Vertical Edges */}
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${offset}px, 0, ${offset}px) rotateY(-45deg)` }} onClick={(e) => snap(0, -iso45, e)} title="Front Right" />
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${-offset}px, 0, ${offset}px) rotateY(45deg)` }} onClick={(e) => snap(0, iso45, e)} title="Front Left" />
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${offset}px, 0, ${-offset}px) rotateY(45deg)` }} onClick={(e) => snap(0, -iso45 - Math.PI/2, e)} title="Back Right" />
                <div className={highlightClass} style={{ width: edgeThickness, height: size - cornerSize, transform: `translate3d(${-offset}px, 0, ${-offset}px) rotateY(-45deg)` }} onClick={(e) => snap(0, iso45 + Math.PI/2, e)} title="Back Left" />

            </div>
        </div>
    );
};

export default ViewCube;