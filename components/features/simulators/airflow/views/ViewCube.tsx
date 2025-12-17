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
    // Canvas RotY is Azimuth (Orbit around Y). CSS rotateY is similar but often inverted depending on the engine.
    // Here we match the previous logic: rX = rotX, rY = -rotY
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
            // Sensitivity 0.005 is typical for 1px movement
            const newRotY = rotY + dx * 0.005;
            const newRotX = Math.max(-1.5, Math.min(1.5, rotX + dy * 0.005));
            
            onViewChange(newRotX, newRotY, false); // False = Instant (no smoothing)
            
            lastMouse.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        // Small delay to prevent click events firing after a drag
        setTimeout(() => setIsDragging(false), 50);
    };

    // Styles
    const faceClass = "absolute inset-0 flex items-center justify-center border border-slate-400/20 bg-[#f0f2f5] text-[10px] font-bold text-slate-500 hover:bg-[#dbeafe] hover:text-blue-600 transition-colors cursor-pointer select-none uppercase shadow-sm opacity-90 hover:opacity-100";
    const highlightClass = "absolute bg-transparent hover:bg-blue-500/60 cursor-pointer z-50 transition-colors";

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
                    transition: isDragging ? 'none' : 'transform 0.1s linear' // CSS transition mainly for slight smoothing, logic handles the rest
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
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset-cornerSize/2}px, ${-offset+cornerSize/2}px, ${offset}px)` }} onClick={(e) => snap(isoX, -iso45, e)} />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset+cornerSize/2}px, ${-offset+cornerSize/2}px, ${offset}px)` }} onClick={(e) => snap(isoX, iso45, e)} />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset-cornerSize/2}px, ${-offset+cornerSize/2}px, ${-offset}px)` }} onClick={(e) => snap(isoX, -iso45 - Math.PI/2, e)} />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset+cornerSize/2}px, ${-offset+cornerSize/2}px, ${-offset}px)` }} onClick={(e) => snap(isoX, iso45 + Math.PI/2, e)} />
                
                {/* Bottom Corners */}
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset-cornerSize/2}px, ${offset-cornerSize/2}px, ${offset}px)` }} onClick={(e) => snap(-isoX, -iso45, e)} />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset+cornerSize/2}px, ${offset-cornerSize/2}px, ${offset}px)` }} onClick={(e) => snap(-isoX, iso45, e)} />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${offset-cornerSize/2}px, ${offset-cornerSize/2}px, ${-offset}px)` }} onClick={(e) => snap(-isoX, -iso45 - Math.PI/2, e)} />
                <div className={highlightClass} style={{ width: cornerSize, height: cornerSize, transform: `translate3d(${-offset+cornerSize/2}px, ${offset-cornerSize/2}px, ${-offset}px)` }} onClick={(e) => snap(-isoX, iso45 + Math.PI/2, e)} />

                {/* --- EDGES (12) --- */}
                {/* Top Edges */}
                <div className={highlightClass} style={{ width: size-cornerSize, height: edgeThickness, transform: `rotateX(90deg) translate3d(0, ${-offset}px, ${offset}px)` }} onClick={(e) => snap(iso45, 0, e)} />
                <div className={highlightClass} style={{ width: edgeThickness, height: size-cornerSize, transform: `rotateY(90deg) translate3d(0, ${-offset+size/2}px, ${offset}px)` }} onClick={(e) => snap(iso45, -Math.PI/2, e)} />
                <div className={highlightClass} style={{ width: edgeThickness, height: size-cornerSize, transform: `rotateY(-90deg) translate3d(0, ${-offset+size/2}px, ${offset}px)` }} onClick={(e) => snap(iso45, Math.PI/2, e)} />
                <div className={highlightClass} style={{ width: size-cornerSize, height: edgeThickness, transform: `rotateX(-90deg) translate3d(0, ${-offset}px, ${-offset}px)` }} onClick={(e) => snap(iso45, Math.PI, e)} />

                {/* Vertical Edges */}
                <div className={highlightClass} style={{ width: edgeThickness, height: size-cornerSize, transform: `translate3d(${offset}px, 0, ${offset}px) rotateY(45deg)` }} onClick={(e) => snap(0, -iso45, e)} />
                <div className={highlightClass} style={{ width: edgeThickness, height: size-cornerSize, transform: `translate3d(${-offset}px, 0, ${offset}px) rotateY(-45deg)` }} onClick={(e) => snap(0, iso45, e)} />
                <div className={highlightClass} style={{ width: edgeThickness, height: size-cornerSize, transform: `translate3d(${offset}px, 0, ${-offset}px) rotateY(-45deg)` }} onClick={(e) => snap(0, -iso45 - Math.PI/2, e)} />
                <div className={highlightClass} style={{ width: edgeThickness, height: size-cornerSize, transform: `translate3d(${-offset}px, 0, ${-offset}px) rotateY(45deg)` }} onClick={(e) => snap(0, iso45 + Math.PI/2, e)} />

            </div>
        </div>
    );
};

export default ViewCube;