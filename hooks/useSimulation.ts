
import { useMemo } from 'react';
import { SPECS, ENGINEERING_DATA } from '../constants';
import { PerformanceResult, Spec, PlacedDiffuser, ProbeData, Obstacle } from '../types';

// ==========================================
// 4. PHYSICS & SIMULATION LOGIC
// ==========================================

export const interpolate = (val: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
};

// --- GEOMETRY HELPERS ---
const lineIntersectsRect = (p1: {x: number, y: number}, p2: {x: number, y: number}, rect: {x: number, y: number, w: number, h: number}) => {
    // Check if point is inside rect first
    const isInside = (p: {x: number, y: number}, r: any) => 
        p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

    // We only care if the TARGET point is blocked or if the line crosses. 
    // Actually, if the target is inside an obstacle (like a column), velocity is 0.
    if (isInside(p2, rect)) return true;

    // Line intersection test (Liang-Barsky or simpler axis separation for AABB)
    // Simplified: Check intersection with 4 segments of rect
    const segments = [
        [{x: rect.x, y: rect.y}, {x: rect.x + rect.w, y: rect.y}], // Top
        [{x: rect.x + rect.w, y: rect.y}, {x: rect.x + rect.w, y: rect.y + rect.h}], // Right
        [{x: rect.x + rect.w, y: rect.y + rect.h}, {x: rect.x, y: rect.y + rect.h}], // Bottom
        [{x: rect.x, y: rect.y + rect.h}, {x: rect.x, y: rect.y}] // Left
    ];

    const ccw = (A: any, B: any, C: any) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    const intersect = (A: any, B: any, C: any, D: any) => ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);

    for (const seg of segments) {
        if (intersect(p1, p2, seg[0], seg[1])) return true;
    }
    return false;
};

// --- ГЛАВНАЯ ФУНКЦИЯ РАСЧЕТА СКОРОСТИ ---
export const calculateWorkzoneVelocityAndCoverage = (
    v0: number, 
    spec_A: number, // Ak (Effective Area) in mm²
    diffuserHeight: number, 
    workZoneHeight: number,
    m: number = 2.0, // Аэродинамический коэффициент формы
    buoyancyFactor: number = 1.0 
) => {
    const dist = diffuserHeight - workZoneHeight;
    
    // Переводим площадь в метры для физики
    const Ak_m2 = spec_A > 0 ? spec_A / 1000000 : 0; 
    const l0 = Math.sqrt(Ak_m2); 
    const coreZone = 5 * l0; 

    // Если мы прямо в диффузоре
    if (dist <= 0) {
        const initialRadius = Math.sqrt(spec_A) / 2000.0;
        return { workzoneVelocity: v0, coverageRadius: initialRadius };
    }

    let vx = v0;
    
    if (dist < coreZone) {
        // Зона 1: Скорость постоянна
        vx = v0;
    } else {
        // Зона 3: Гиперболическое затухание Vx = (m * V0 * sqrt(Ak)) / x
        if (dist > 0) {
            vx = (m * v0 * l0) / dist;
        }
    }

    // --- ПРИМЕНЯЕМ ВЛИЯНИЕ ТЕМПЕРАТУРЫ ---
    vx = vx * buoyancyFactor;

    // Физические ограничения
    vx = Math.max(0.05, vx); 

    // Расчет радиуса (линейное расширение)
    const initialRadius = Math.sqrt(spec_A) / 2000.0; 
    const coverageRadius = initialRadius + dist * 0.2; 
    
    return { workzoneVelocity: vx, coverageRadius };
};

export const calculatePerformance = (modelId: string, flowType: string, diameter: string | number, volume: number): Partial<PerformanceResult> | null => {
    const spec = SPECS[diameter];
    if (!spec) return null;

    // Исключения для несовместимых моделей
    if (modelId === 'dpu-s' && diameter === 100) return null;
    if (modelId === 'dpu-v' && diameter === 250) return null;
    if ((modelId === 'amn-adn' || modelId === '4ap') && typeof diameter === 'number') return null;
    if (modelId.includes('dpu') && typeof diameter === 'string') return null; 

    const modelData = ENGINEERING_DATA[modelId];
    if (!modelData) return null;

    let modePoints = [];
    if (modelData[flowType] && modelData[flowType][diameter]) {
        modePoints = modelData[flowType][diameter];
    } else {
        return null;
    }
    
    // Интерполяция табличных данных
    let pressure = 0, noise = 0, throwDist = 0;
    if (modePoints.length > 0) {
        let p1 = modePoints[0];
        let p2 = modePoints[modePoints.length - 1];
        
        for (let i = 0; i < modePoints.length - 1; i++) {
            if (volume >= modePoints[i].vol && volume <= modePoints[i+1].vol) {
                p1 = modePoints[i];
                p2 = modePoints[i+1];
                break;
            }
        }
        
        pressure = interpolate(volume, p1.vol, p2.vol, p1.pa, p2.pa);
        noise = interpolate(volume, p1.vol, p2.vol, p1.db, p2.db);
        throwDist = interpolate(volume, p1.vol, p2.vol, p1.throw, p2.throw);
    }

    // Расчет начальной скорости V0 через эффективное сечение
    const Ak = spec.f0; 
    const v0 = Ak > 0 ? volume / (3600 * Ak) : 0;

    if (throwDist === 0 && flowType === 'suction') {
         throwDist = Math.sqrt(v0 / 2.0); 
    }

    return { v0, pressure, noise, throwDist, spec };
};

export const useScientificSimulation = (
    modelId: string, 
    flowType: string, 
    diameter: string | number, 
    volume: number, 
    temp: number, 
    roomTemp: number, 
    diffuserHeight: number, 
    workZoneHeight: number
): PerformanceResult => {
    return useMemo(() => {
        const perf = calculatePerformance(modelId, flowType, diameter, volume);
        const fallbackSpec: Spec = { f0: 0, A: 0, B: 0, C: 0, D: 0, min: 0, max: 0 };

        if (!perf || !perf.spec) return { 
            error: 'Типоразмер не производится', 
            spec: SPECS[diameter] || fallbackSpec, 
            v0:0, throwDist:0, pressure:0, noise:0,
            workzoneVelocity: 0, coverageRadius: 0, Ar: 0
        };

        const { v0 = 0, pressure = 0, noise = 0, throwDist = 0, spec } = perf;

        // --- ФИЗИЧЕСКИЙ ДВИЖОК ---
        
        const g = 9.81;
        const T_ref = 273.15 + roomTemp; 
        const beta = 1 / T_ref; 
        const dt = temp - roomTemp; 
        const l0 = Math.sqrt(spec.f0); 

        const Ar = v0 > 0.1 ? (g * beta * dt * l0) / (v0 * v0) : 0;

        let k_archimedes = 1.0;
        const VISUAL_GAIN = 15.0; 

        if (Math.abs(Ar) > 0.00001) {
            k_archimedes = 1.0 - (VISUAL_GAIN * Ar); 
            k_archimedes = Math.max(0.1, Math.min(3.0, k_archimedes));
        }

        const finalThrow = Math.max(0, throwDist * k_archimedes);
        const Ak_mm2 = spec.f0 * 1000000; 
        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, Ak_mm2, diffuserHeight, workZoneHeight, 2.0, k_archimedes 
        );

        return {
            v0: Math.max(0, v0),
            pressure: Math.max(0, pressure),
            noise: Math.max(0, noise),
            throwDist: finalThrow,
            workzoneVelocity: Math.max(0, workzoneVelocity),
            coverageRadius: Math.max(0, coverageRadius),
            spec,
            Ar, 
            error: null
        };
    }, [modelId, flowType, diameter, volume, temp, roomTemp, diffuserHeight, workZoneHeight]);
};

// --- PROBE PHYSICS ---
export const calculateProbeData = (
    x: number, 
    y: number, 
    diffusers: PlacedDiffuser[], 
    roomTemp: number, 
    supplyTemp: number,
    obstacles: Obstacle[] = []
): ProbeData => {
    let maxV = 0;
    let dominantDiffuser: PlacedDiffuser | null = null;

    // 1. Calculate Velocity & Direction
    diffusers.forEach(d => {
        // Line of Sight Check
        let isBlocked = false;
        for (const obs of obstacles) {
            if (lineIntersectsRect(
                {x: d.x, y: d.y}, 
                {x, y}, 
                {x: obs.x - obs.width/2, y: obs.y - obs.height/2, w: obs.width, h: obs.height}
            )) {
                isBlocked = true;
                break;
            }
        }

        if (isBlocked) return; // Velocity from this diffuser is 0

        const dist = Math.sqrt(Math.pow(d.x - x, 2) + Math.pow(d.y - y, 2));
        const radius = d.performance.coverageRadius;
        
        if (dist <= radius) {
            // Simplified Schlichting profile
            const vCore = d.performance.workzoneVelocity;
            const vPoint = vCore * Math.max(0, 1 - Math.pow(dist / radius, 1.5));
            
            if (vPoint > maxV) {
                maxV = vPoint;
                dominantDiffuser = d;
            }
        }
    });

    const angle = dominantDiffuser 
        ? Math.atan2(y - dominantDiffuser.y, x - dominantDiffuser.x)
        : 0;

    // 2. Calculate Temperature (Mixing Model)
    // Simple mixing: if v is high, t -> supplyTemp. If v is low, t -> roomTemp.
    // Max practical velocity in work zone is usually around 0.5-1.0 m/s
    const mixingFactor = Math.min(1, maxV / 0.8); 
    const t = roomTemp + (supplyTemp - roomTemp) * mixingFactor;

    // 3. Calculate Draft Rating (ISO 7730)
    // DR = (34 - t) * (v - 0.05)^0.62 * (0.37 * v * Tu + 3.14)
    // Assume Turbulence Intensity (Tu) = 40% (0.4) for air jets
    let dr = 0;
    const vCalc = Math.max(0.05, maxV); // Threshold for formula validity
    const tu = 0.4; 
    
    if (vCalc > 0.05) {
        const term1 = (34 - t);
        const term2 = Math.pow(vCalc - 0.05, 0.62);
        const term3 = (0.37 * vCalc * tu * 100) + 3.14; // Tu in percent for formula (usually) or decimal? 
        // Standard ISO 7730: Tu is percentage (e.g., 40). 
        // 0.37 * v * Tu + 3.14
        
        dr = term1 * term2 * (0.37 * vCalc * 40 + 3.14);
    }
    
    return {
        v: maxV,
        t: t,
        angle: angle,
        dr: Math.min(100, Math.max(0, dr))
    };
};

// --- VISUALIZATION HELPERS ---

export const calculateVelocityField = (
    roomWidth: number, roomLength: number, placedDiffusers: any[], 
    diffuserHeight: number, workZoneHeight: number, gridStep: number = 0.5,
    obstacles: Obstacle[] = []
): number[][] => {
    const cols = Math.ceil(roomWidth / gridStep);
    const rows = Math.ceil(roomLength / gridStep);
    const field: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * gridStep + gridStep / 2;
            const y = r * gridStep + gridStep / 2;
            
            let maxV = 0;
            placedDiffusers.forEach(d => {
                // Obstacle Check
                let isBlocked = false;
                for (const obs of obstacles) {
                    // Quick AABB check for point inside obstacle
                    if (x >= obs.x - obs.width/2 && x <= obs.x + obs.width/2 && 
                        y >= obs.y - obs.height/2 && y <= obs.y + obs.height/2) {
                        isBlocked = true; 
                        break;
                    }
                    
                    // Line of Sight
                    if (lineIntersectsRect(
                        {x: d.x, y: d.y}, 
                        {x, y}, 
                        {x: obs.x - obs.width/2, y: obs.y - obs.height/2, w: obs.width, h: obs.height}
                    )) {
                        isBlocked = true;
                        break;
                    }
                }

                if (!isBlocked) {
                    const dist = Math.sqrt(Math.pow(x - d.x, 2) + Math.pow(y - d.y, 2));
                    const radius = d.performance.coverageRadius;
                    if (dist <= radius) {
                        const vCore = d.performance.workzoneVelocity;
                        const vPoint = vCore * Math.max(0, 1 - Math.pow(dist / radius, 1.5));
                        if (vPoint > maxV) maxV = vPoint;
                    }
                }
            });
            field[r][c] = maxV;
        }
    }
    return field; 
};

export const analyzeCoverage = (velocityField: number[][]) => {
    let totalPoints = 0;
    let coveredPoints = 0;
    let totalVelocity = 0;
    let comfortZones = 0; // 0.1 - 0.25 m/s
    let warningZones = 0; // 0.25 - 0.5 m/s
    let draftZones = 0;   // > 0.5 m/s
    let deadZones = 0;    // < 0.1 m/s

    velocityField.forEach(row => {
        row.forEach(v => {
            totalPoints++;
            if (v > 0.05) coveredPoints++; 
            totalVelocity += v;

            if (v < 0.1) deadZones++;
            else if (v >= 0.1 && v <= 0.25) comfortZones++;
            else if (v > 0.25 && v <= 0.5) warningZones++;
            else if (v > 0.5) draftZones++;
        });
    });

    if (totalPoints === 0) {
        return {
            totalCoverage: 0, avgVelocity: 0, comfortZones: 0,
            warningZones: 0, draftZones: 0, deadZones: 0
        };
    }

    return {
        totalCoverage: (coveredPoints / totalPoints) * 100,
        avgVelocity: totalVelocity / totalPoints,
        comfortZones,
        warningZones,
        draftZones,
        deadZones
    };
};
