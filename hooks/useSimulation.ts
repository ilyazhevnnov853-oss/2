import { useMemo } from 'react';
import { SPECS, ENGINEERING_DATA } from '../constants';
import { PerformanceResult, Spec } from '../types';

// Характеристики струй (Коэффициент затухания K и Расширения C)
// K_decay: чем больше, тем медленнее падает скорость (дальнобойная струя)
// C_expansion: чем больше, тем шире раскрывается факел
const getJetCharacteristics = (flowType: string) => {
    switch (flowType) {
        case 'vertical-compact':
        case 'horizontal-compact': 
             // Компактная струя (сопло): малое расширение, высокая дальнобойность
             return { K_decay: 6.5, C_expansion: 0.22 }; 
        case 'vertical-conical':
             // Коническая струя (стандартная): среднее расширение
             return { K_decay: 4.5, C_expansion: 0.55 }; 
        case 'vertical-swirl':
             // Вихревая струя: сильное расширение, быстрое падение скорости
             return { K_decay: 2.2, C_expansion: 1.1 }; 
        case '4-way':
             return { K_decay: 3.5, C_expansion: 0.8 };
        case 'suction':
             // Всасывание: очень быстрое падение скорости (спектр стока)
             return { K_decay: 1.5, C_expansion: 1.0 };
        default:
             return { K_decay: 5.0, C_expansion: 0.2 }; 
    }
};

export const interpolate = (val: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
};

export const calculatePerformance = (modelId: string, flowType: string, diameter: string | number, volume: number): Partial<PerformanceResult> | null => {
    const spec = SPECS[diameter];
    if (!spec) return null;
    
    // Валидация
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

    if (throwDist === 0 && flowType === 'suction') {
         const v0 = volume / (3600 * spec.f0);
         throwDist = Math.sqrt(v0 / 2.0); 
    }

    const v0 = volume / (3600 * spec.f0);
    return { v0, pressure, noise, throwDist, spec };
};

// --- ОСНОВНОЙ ФИЗИЧЕСКИЙ РАСЧЕТ ---
export const calculateWorkzoneVelocityAndCoverage = (
    v0: number, 
    spec_A: number, 
    diffuserHeight: number, 
    workZoneHeight: number,
    flowType: string
) => {
    // Дистанция полета струи до рабочей зоны
    const distanceToWorkzone = Math.max(0, diffuserHeight - workZoneHeight);
    
    // Приведенный диаметр (D0) в метрах
    const d0 = spec_A / 1000.0; 
    const r0 = d0 / 2.0;

    const { K_decay, C_expansion } = getJetCharacteristics(flowType);
    
    // 1. ГЕОМЕТРИЯ (РАДИУС): 
    // Линейное расширение струи: R = R0 + L * k
    const coverageRadius = r0 + (distanceToWorkzone * C_expansion);
    
    // 2. СКОРОСТЬ (ФИЗИКА):
    // Формула Шепелева/Абрамовича для затухания осевой скорости турбулентной струи
    let workzoneVelocity = v0;
    
    // Начальный участок струи (обычно 3-5 калибров), где скорость = V0.
    const initialSectionLength = 3.0 * d0; 

    if (distanceToWorkzone > initialSectionLength) {
        // Основной участок струи
        const decayFactor = (K_decay * d0) / distanceToWorkzone;
        workzoneVelocity = v0 * decayFactor;
    }
    
    if (workzoneVelocity < 0.02) workzoneVelocity = 0;

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
            v0: 0, throwDist: 0, pressure: 0, noise: 0,
            workzoneVelocity: 0, coverageRadius: 0
        };

        const { v0 = 0, pressure = 0, noise = 0, throwDist = 0, spec } = perf;

        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, 
            spec.A, 
            diffuserHeight, 
            workZoneHeight,
            flowType
        );

        // Учет Архимедовой силы
        const dt = temp - roomTemp;
        let kArchimedes = 1.0;
        
        if (flowType.includes('vertical')) {
             if (dt > 0) kArchimedes = Math.max(0.4, 1.0 - (dt * 0.05)); // Теплый воздух всплывает
             else kArchimedes = 1.0 + (Math.abs(dt) * 0.03); // Холодный падает быстрее
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

// --- Вспомогательные функции (ВОССТАНОВЛЕННЫЙ ФУНКЦИОНАЛ) ---

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