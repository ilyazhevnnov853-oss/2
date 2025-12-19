import React from 'react';

interface ViewCubeProps {
    rotX: number;
    rotY: number;
    setCamera: any;
}

const ViewCube: React.FC<ViewCubeProps> = ({ rotX, rotY, setCamera }) => {
    const size = 60;
    const offset = size / 2;
    
    const rX = rotX * (180 / Math.PI);
    const rY = -rotY * (180 / Math.PI);

    const faceStyle = "absolute inset-0 flex items-center justify-center border border-slate-300/50 bg-white/90 backdrop-blur-md text-[9px] font-extrabold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer select-none uppercase tracking-wider shadow-[inset_0_0_10px_rgba(0,0,0,0.05)]";

    const snap = (rx: number, ry: number) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setCamera((prev: any) => ({ ...prev, rotX: rx, rotY: ry }));
    };

    return (
        <div className="absolute top-6 right-6 w-[60px] h-[60px] z-50 group pointer-events-auto" style={{ perspective: '300px' }}>
            <div className="absolute inset-[-10px] rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div 
                className="relative w-full h-full transform-3d transition-transform duration-100 ease-linear"
                style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: `rotateX(${rX}deg) rotateY(${rY}deg)`
                }}
            >
                <div className={faceStyle} style={{ transform: `translateZ(${offset}px)` }} onClick={snap(0, 0)}>ПЕРЕД</div>
                <div className={faceStyle} style={{ transform: `rotateY(180deg) translateZ(${offset}px)` }} onClick={snap(0, Math.PI)}>ТЫЛ</div>
                <div className={faceStyle} style={{ transform: `rotateY(90deg) translateZ(${offset}px)` }} onClick={snap(0, -Math.PI/2)}>ПРАВО</div>
                <div className={faceStyle} style={{ transform: `rotateY(-90deg) translateZ(${offset}px)` }} onClick={snap(0, Math.PI/2)}>ЛЕВО</div>
                <div className={faceStyle} style={{ transform: `rotateX(90deg) translateZ(${offset}px)` }} onClick={snap(Math.PI/2, 0)}>ВЕРХ</div>
                <div className={faceStyle} style={{ transform: `rotateX(-90deg) translateZ(${offset}px)` }} onClick={snap(-Math.PI/2, 0)}>НИЗ</div>
            </div>
        </div>
    );
};

export default ViewCube;
