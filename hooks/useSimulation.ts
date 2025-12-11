import { useMemo } from 'react';
import { SPECS, ENGINEERING_DATA } from '../constants';
import { PerformanceResult, Spec } from '../types';

const V_TERMINAL = 0.2; // m/s
const C_EXPANSION = 0.2; // Jet expansion coefficient

export const interpolate = (val: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
};

export const calculatePerformance = (modelId: string, flowType: string, diameter: string | number, volume: number): Partial<PerformanceResult> | null => {
    const spec = SPECS[diameter];
    if (!spec) return null;
    
    // Exclusions based on model constraints
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

    // Physics fallback
    if (throwDist === 0 && flowType === 'suction') {
         const v0 = volume / (3600 * spec.f0);
         throwDist = Math.sqrt(v0 / 2.0); 
    }

    const v0 = volume / (3600 * spec.f0);
    return { v0, pressure, noise, throwDist, spec };
};

export const calculateWorkzoneVelocityAndCoverage = (v0: number, finalThrow: number, spec_A: number, diffuserHeight: number, workZoneHeight: number) => {
    const distanceToWorkzone = diffuserHeight - workZoneHeight;
    
    if (distanceToWorkzone <= 0) {
        const workzoneVelocity = v0;
        const coverageRadius = spec_A / 2000.0;
        return { workzoneVelocity, coverageRadius };
    }
    
    if (distanceToWorkzone > finalThrow) {
        return { workzoneVelocity: V_TERMINAL, coverageRadius: 0.0 };
    }

    // Linear decay model for jet centerline velocity
    const decay_factor = 1.0 - (distanceToWorkzone / finalThrow);
    const workzoneVelocity = V_TERMINAL + (v0 - V_TERMINAL) * decay_factor;
    
    const r0 = spec_A / 2000.0;
    const coverageRadius = r0 + distanceToWorkzone * C_EXPANSION;
    
    return { workzoneVelocity, coverageRadius };
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
            v0: 0, 
            throwDist: 0, 
            pressure: 0, 
            noise: 0,
            workzoneVelocity: 0,
            coverageRadius: 0
        };

        const { v0 = 0, pressure = 0, noise = 0, throwDist = 0, spec } = perf;

        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, 
            throwDist, 
            spec.A, 
            diffuserHeight, 
            workZoneHeight
        );

        const dt = temp - roomTemp;
        let kArchimedes = 1.0;
        
        if (flowType.includes('vertical')) {
             if (dt > 0) {
                 kArchimedes = Math.max(0.4, 1.0 - (dt * 0.05)); 
             } else {
                 kArchimedes = 1.0 + (Math.abs(dt) * 0.03);
             }
        }

        const finalThrow = throwDist * kArchimedes;

        return {
            v0: Math.max(0, v0),
            pressure: Math.max(0, pressure),
            noise: Math.max(0, noise),
            throwDist: Math.max(0, finalThrow),
            workzoneVelocity: Math.max(0, workzoneVelocity),
            coverageRadius: Math.max(0, coverageRadius),
            spec,
            error: null
        };
    }, [modelId, flowType, diameter, volume, temp, roomTemp, diffuserHeight, workZoneHeight]);
};
// ==========================================
// ВЗАИМНОЕ ВЛИЯНИЕ ДИФФУЗОРОВ
// ==========================================

/**
 * Рассчитывает вклад одного диффузора в скорость в заданной точке
 */
export const calculateVelocityAtPoint = (
    point: { x: number, y: number },
    diffuser: any, // PlacedDiffuser
    diffuserHeight: number,
    workZoneHeight: number
): { vx: number, vy: number, magnitude: number } => {
    const dx = point.x - diffuser.x;
    const dy = point.y - diffuser.y;
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Вертикальное расстояние от диффузора до рабочей зоны
    const verticalDistance = Math.abs(diffuserHeight - workZoneHeight);
    
    // Полное расстояние
    const totalDistance = Math.sqrt(
        horizontalDistance * horizontalDistance + 
        verticalDistance * verticalDistance
    );
    
    // Если точка вне зоны влияния
    if (horizontalDistance > diffuser.performance.coverageRadius) {
        return { vx: 0, vy: 0, magnitude: 0 };
    }
    
    // Расчет скорости на расстоянии (упрощенная модель)
    // v = v0 * (x0 / x)^n, где n - коэффициент затухания
    const v0 = diffuser.performance.v0 || 0;
    const throwDist = diffuser.performance.throwDist || 1;
    const decayFactor = 0.5; // Коэффициент затухания
    
    const velocityMagnitude = v0 * Math.pow(
        Math.max(0.1, throwDist / Math.max(0.1, totalDistance)),
        decayFactor
    );
    
    // Направление потока (от диффузора к точке)
    const angle = Math.atan2(dy, dx);
    const vx = velocityMagnitude * Math.cos(angle);
    const vy = velocityMagnitude * Math.sin(angle);
    
    return { vx, vy, magnitude: velocityMagnitude };
};

/**
 * Рассчитывает суммарную скорость от всех диффузоров в заданной точке
 */
export const calculateTotalVelocityAtPoint = (
    point: { x: number, y: number },
    placedDiffusers: any[], // PlacedDiffuser[]
    diffuserHeight: number,
    workZoneHeight: number
): { velocity: number, vx: number, vy: number } => {
    let totalVx = 0;
    let totalVy = 0;
    
    placedDiffusers.forEach(diffuser => {
        const { vx, vy } = calculateVelocityAtPoint(
            point, 
            diffuser, 
            diffuserHeight, 
            workZoneHeight
        );
        totalVx += vx;
        totalVy += vy;
    });
    
    const velocity = Math.sqrt(totalVx * totalVx + totalVy * totalVy);
    
    return { velocity, vx: totalVx, vy: totalVy };
};

/**
 * Рассчитывает поле скоростей для всего помещения
 */
export const calculateVelocityField = (
    roomWidth: number,
    roomLength: number,
    placedDiffusers: any[],
    diffuserHeight: number,
    workZoneHeight: number,
    gridStep: number = 0.5
): number[][] => {
    const cols = Math.ceil(roomWidth / gridStep);
    const rows = Math.ceil(roomLength / gridStep);
    
    const field: number[][] = [];
    
    for (let row = 0; row < rows; row++) {
        field[row] = [];
        for (let col = 0; col < cols; col++) {
            const x = col * gridStep;
            const y = row * gridStep;
            
            const { velocity } = calculateTotalVelocityAtPoint(
                { x, y },
                placedDiffusers,
                diffuserHeight,
                workZoneHeight
            );
            
            field[row][col] = velocity;
        }
    }
    
    return field;
};

/**
 * Анализирует покрытие помещения
 */
export const analyzeCoverage = (
    velocityField: number[][]
): {
    totalCoverage: number;
    avgVelocity: number;
    comfortZones: number;
    warningZones: number;
    draftZones: number;
    deadZones: number;
} => {
    if (!velocityField || velocityField.length === 0) {
        return {
            totalCoverage: 0,
            avgVelocity: 0,
            comfortZones: 0,
            warningZones: 0,
            draftZones: 0,
            deadZones: 0
        };
    }
    
    let totalCells = 0;
    let coveredCells = 0;
    let sumVelocity = 0;
    let comfort = 0;
    let warning = 0;
    let draft = 0;
    let dead = 0;
    
    velocityField.forEach(row => {
        row.forEach(velocity => {
            totalCells++;
            
            if (velocity > 0.05) {
                coveredCells++;
                sumVelocity += velocity;
                
                if (velocity < 0.2) {
                    comfort++;
                } else if (velocity < 0.5) {
                    warning++;
                } else {
                    draft++;
                }
            } else {
                dead++;
            }
        });
    });
    
    return {
        totalCoverage: totalCells > 0 ? (coveredCells / totalCells * 100) : 0,
        avgVelocity: coveredCells > 0 ? (sumVelocity / coveredCells) : 0,
        comfortZones: comfort,
        warningZones: warning,
        draftZones: draft,
        deadZones: dead
    };
};