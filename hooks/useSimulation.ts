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

export const calculateWorkzoneVelocityAndCoverage = (
    v0: number, 
    spec_A: number, // Ak (Effective Area) in mm²
    diffuserHeight: number, 
    workZoneHeight: number,
    m: number = 2.0 // Аэродинамический коэффициент формы (для решеток ~2-3, для сопел ~5-6)
) => {
    const dist = diffuserHeight - workZoneHeight;
    
    // Эффективный диаметр (характерный размер)
    // spec_A приходит в mm², переводим в м² для расчета l0 (в метрах)
    const Ak_m2 = spec_A > 0 ? spec_A / 1000000 : 0; 
    const l0 = Math.sqrt(Ak_m2); 
    const coreZone = 5 * l0; // Длина начального участка примерно 5 калибров

    if (dist <= 0) {
        // Внутри диффузора или выше
        const initialRadius = Math.sqrt(spec_A) / 2000.0; // Примерный радиус в метрах
        return { workzoneVelocity: v0, coverageRadius: initialRadius };
    }

    let vx = v0;
    
    if (dist < coreZone) {
        // Зона 1: Скорость постоянна на начальном участке
        vx = v0;
    } else {
        // Зона 3: Гиперболическое затухание Vx = (m * V0 * sqrt(Ak)) / x
        if (dist > 0) {
            vx = (m * v0 * l0) / dist;
        }
    }

    // Ограничиваем, чтобы не уходила в бесконечность и не была меньше подвижности воздуха
    vx = Math.min(v0, Math.max(0.1, vx));

    // Расчет радиуса (линейное расширение)
    // r = r0 + x * tan(alpha)
    const initialRadius = Math.sqrt(spec_A) / 2000.0; 
    const coverageRadius = initialRadius + dist * 0.2; // 0.2 ~ tan(11.3 градуса)
    
    return { workzoneVelocity: vx, coverageRadius };
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

    // --- 1. Внедрение коэффициента эффективной площади (Ak) ---
    // spec.f0 - это живое сечение (м²) из базы данных
    const Ak = spec.f0; 
    const v0 = Ak > 0 ? volume / (3600 * Ak) : 0;

    // Physics fallback if throwDist missing from data
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

        // Добавляем расчет скорости и области захвата в рабочей зоне (с гиперболическим затуханием)
        // Для spec.A используется геометрический параметр, для расчета физики используем f0 (Ak) если возможно, или приближаем
        // В базе A часто сторона или диаметр в мм. Преобразуем f0 (м2) в мм2 для функции
        const Ak_mm2 = spec.f0 * 1000000; 
        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, Ak_mm2, diffuserHeight, workZoneHeight
        );

        // --- 2. Внедрение числа Архимеда (Ar) ---
        // Ar = (g * beta * dt * sqrt(Ak)) / v0^2
        const g = 9.81;
        const T_ref = 273.15 + roomTemp; // Абсолютная температура (K)
        const beta = 1 / T_ref;
        const dt = temp - roomTemp;
        const l0 = Math.sqrt(spec.f0); // Характерный размер (корень из площади)

        // Защита от деления на ноль
        const Ar = v0 > 0.1 
            ? (g * beta * dt * l0) / (v0 * v0) 
            : 0;

        // Используем Ar для корректировки дальнобойности (throwDist)
        // Для неизотермических струй: x_noniso = x_iso * k_noniso
        let k_archimedes = 1.0;
        
        if (flowType.includes('vertical')) {
             if (Math.abs(Ar) > 0.001) {
                // Если Ar > 0 (нагрев, всплывает) -> струя тормозится быстрее
                // Если Ar < 0 (охлаждение, падает) -> струя разгоняется
                k_archimedes = 1.0 - 1.5 * Ar; 
             }
        }

        const finalThrow = Math.max(0, throwDist * k_archimedes);

        return {
            v0: Math.max(0, v0),
            pressure: Math.max(0, pressure),
            noise: Math.max(0, noise),
            throwDist: finalThrow,
            workzoneVelocity: Math.max(0, workzoneVelocity),
            coverageRadius: Math.max(0, coverageRadius),
            spec,
            Ar, // Возвращаем Ar для визуализации
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