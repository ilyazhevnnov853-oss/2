import { useMemo } from 'react';
import { SPECS, ENGINEERING_DATA } from '../constants';
import { PerformanceResult, Spec } from '../types';

// ==========================================
// 4. PHYSICS & SIMULATION LOGIC
// ==========================================

const V_TERMINAL = 0.2; // м/с - комфортная скорость в рабочей зоне
const C_EXPANSION = 0.2; // Коэффициент расширения струи (тангенс угла расширения)

export const interpolate = (val: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
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

    // Линейное затухание скорости от v0 до V_TERMINAL на дистанции finalThrow
    const decay_factor = 1.0 - (distanceToWorkzone / finalThrow);
    const workzoneVelocity = V_TERMINAL + (v0 - V_TERMINAL) * decay_factor;
    
    // Расчет радиуса охвата (Расширение струи)
    const r0 = spec_A / 2000.0; // Начальный радиус (A в мм -> м)
    const coverageRadius = r0 + distanceToWorkzone * C_EXPANSION;
    
    return { workzoneVelocity, coverageRadius };
};

export const calculatePerformance = (modelId: string, flowType: string, diameter: string | number, volume: number): Partial<PerformanceResult> | null => {
    // SPECS и ENGINEERING_DATA должны быть доступны в области видимости
    const spec = SPECS[diameter];
    if (!spec) return null;

    // Exclusions
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
            workzoneVelocity: 0, coverageRadius: 0
        };

        const { v0 = 0, pressure = 0, noise = 0, throwDist = 0, spec } = perf;

        // Добавляем расчет скорости и области захвата в рабочей зоне
        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, throwDist, spec.A, diffuserHeight, workZoneHeight
        );

        // Научный расчет влияния температуры (Архимедова сила)
        const dt = temp - roomTemp;
        let kArchimedes = 1.0;
        
        if (flowType.includes('vertical')) {
             if (dt > 0) {
                 // Теплый воздух всплывает -> струя гаснет быстрее
                 kArchimedes = Math.max(0.4, 1.0 - (dt * 0.05));
             } else {
                 // Холодный воздух падает -> струя разгоняется
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

// --- Вспомогательные функции (Top View logic preserved) ---

export const calculateVelocityField = (
    roomWidth: number, roomLength: number, placedDiffusers: any[], 
    diffuserHeight: number, workZoneHeight: number, gridStep: number = 0.5
): number[][] => {
    // Рассчитываем сетку скоростей для Heatmap
    const cols = Math.ceil(roomWidth / gridStep);
    const rows = Math.ceil(roomLength / gridStep);
    const field: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * gridStep + gridStep / 2;
            const y = r * gridStep + gridStep / 2;
            
            let maxV = 0;
            
            // Находим максимальную скорость от всех диффузоров в этой точке (суперпозицию упрощаем до max)
            placedDiffusers.forEach(d => {
                const dist = Math.sqrt(Math.pow(x - d.x, 2) + Math.pow(y - d.y, 2));
                const radius = d.performance.coverageRadius;
                
                if (dist <= radius) {
                    // Упрощенный профиль скорости: макс в центре, падает к краям
                    const vCore = d.performance.workzoneVelocity;
                    // Профиль Шлихтинга (упрощенно):
                    const vPoint = vCore * Math.max(0, 1 - Math.pow(dist / radius, 1.5));
                    if (vPoint > maxV) maxV = vPoint;
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