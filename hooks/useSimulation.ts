import { useMemo } from 'react';
import { SPECS, ENGINEERING_DATA } from '../constants';
import { PerformanceResult, Spec } from '../types';

// ==========================================
// 4. PHYSICS & SIMULATION LOGIC
// ==========================================

export const interpolate = (val: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
};

// --- ГЛАВНАЯ ФУНКЦИЯ РАСЧЕТА СКОРОСТИ ---
// Теперь принимает buoyancyFactor, чтобы температура влияла на результат
export const calculateWorkzoneVelocityAndCoverage = (
    v0: number, 
    spec_A: number, // Ak (Effective Area) in mm²
    diffuserHeight: number, 
    workZoneHeight: number,
    m: number = 2.0, // Аэродинамический коэффициент формы
    buoyancyFactor: number = 1.0 // <--- НОВЫЙ ПАРАМЕТР: Влияние температуры
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
    // Здесь мы замыкаем круг: Температура -> Ar -> buoyancyFactor -> Скорость
    vx = vx * buoyancyFactor;

    // Физические ограничения (скорость не может быть отрицательной)
    // Разрешаем скорости расти выше v0 в случае сильного "падения" холодного воздуха
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
        // Перевод температур в Кельвины для расчета плотности
        const T_ref = 273.15 + roomTemp; 
        const beta = 1 / T_ref; // Коэффициент объемного расширения
        const dt = temp - roomTemp; // Разница температур (Приток - Комната)
        const l0 = Math.sqrt(spec.f0); // Характерный размер

        // 1. Число Архимеда (Ar)
        // Характеризует борьбу инерции (v0) и плавучести (dt)
        const Ar = v0 > 0.1 
            ? (g * beta * dt * l0) / (v0 * v0) 
            : 0;

        // 2. Коэффициент влияния Архимеда (k_archimedes)
        // Этот коэффициент показывает, как меняется импульс струи из-за температуры
        let k_archimedes = 1.0;
        
        // --- УСИЛЕНИЕ ЭФФЕКТА (GAIN) ---
        // Реальный Ar очень мал (~0.001). Чтобы пользователь увидел эффект в UI,
        // мы применяем коэффициент усиления.
        // VISUAL_GAIN = 15.0 (вместо теоретического 1.5)
        const VISUAL_GAIN = 15.0; 

        if (Math.abs(Ar) > 0.00001) {
            // Ar > 0 (нагрев): сила Архимеда направлена вверх, против движения струи -> торможение
            // Ar < 0 (охлаждение): сила Архимеда направлена вниз, по движению -> ускорение
            k_archimedes = 1.0 - (VISUAL_GAIN * Ar); 
            
            // Ограничители реальности
            k_archimedes = Math.max(0.1, Math.min(3.0, k_archimedes));
        }

        // 3. Применяем коэффициент ко всем параметрам
        
        // Дальнобойность меняется
        const finalThrow = Math.max(0, throwDist * k_archimedes);

        // Скорость в рабочей зоне меняется!
        const Ak_mm2 = spec.f0 * 1000000; 
        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, 
            Ak_mm2, 
            diffuserHeight, 
            workZoneHeight,
            2.0,          // m (форма струи)
            k_archimedes  // <--- ВОТ ОНО: Передаем влияние температуры в расчет скорости
        );

        return {
            v0: Math.max(0, v0),
            pressure: Math.max(0, pressure),
            noise: Math.max(0, noise),
            throwDist: finalThrow,
            workzoneVelocity: Math.max(0, workzoneVelocity),
            coverageRadius: Math.max(0, coverageRadius),
            spec,
            Ar, // Нужно для визуализации частиц в Canvas
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