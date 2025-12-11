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
    // Это значение будет использоваться для отрисовки круга на виде сверху.
    // Оно точно соответствует ширине конуса на данной высоте.
    const coverageRadius = r0 + (distanceToWorkzone * C_expansion);
    
    // 2. СКОРОСТЬ (ФИЗИКА):
    // Формула Шепелева/Абрамовича для затухания осевой скорости турбулентной струи:
    // Vx = V0 * (K * D0 / X)
    // Мы НЕ ограничиваем расчет "дальнобойностью". Скорость считается честно на любом расстоянии.
    
    let workzoneVelocity = v0;
    
    // Начальный участок струи (обычно 3-5 калибров), где скорость = V0.
    // После него скорость начинает падать обратно пропорционально расстоянию.
    const initialSectionLength = 3.0 * d0; // Упрощенно 3 диаметра

    if (distanceToWorkzone > initialSectionLength) {
        // Основной участок струи
        const decayFactor = (K_decay * d0) / distanceToWorkzone;
        workzoneVelocity = v0 * decayFactor;
    }
    
    // Техническое ограничение: совсем микроскопические скорости считаем нулем, чтобы не шуметь
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

        // Передаем flowType, чтобы учесть форму струи
        const { workzoneVelocity, coverageRadius } = calculateWorkzoneVelocityAndCoverage(
            v0, 
            spec.A, 
            diffuserHeight, 
            workZoneHeight,
            flowType
        );

        // Учет Архимедовой силы (всплытие теплого / падение холодного воздуха)
        // Влияет на "эффективную" дальнобойность в справочнике, но V_workzone мы считаем по осевой формуле выше
        const dt = temp - roomTemp;
        let kArchimedes = 1.0;
        
        if (flowType.includes('vertical')) {
             if (dt > 0) kArchimedes = Math.max(0.4, 1.0 - (dt * 0.05)); // Теплый воздух всплывает, дальнобойность падает
             else kArchimedes = 1.0 + (Math.abs(dt) * 0.03); // Холодный падает быстрее
        }

        const finalThrow = throwDist * kArchimedes;

        return {
            v0: Math.max(0, v0),
            pressure: Math.max(0, pressure),
            noise: Math.max(0, noise),
            throwDist: Math.max(0, finalThrow),
            workzoneVelocity: Math.max(0, workzoneVelocity), // Реальная расчетная скорость
            coverageRadius: Math.max(0, coverageRadius),     // Реальный геометрический радиус
            spec,
            error: null
        };
    }, [modelId, flowType, diameter, volume, temp, roomTemp, diffuserHeight, workZoneHeight]);
};

// --- Вспомогательные функции для совместимости ---
export const calculateVelocityField = (
    roomWidth: number, roomLength: number, placedDiffusers: any[], 
    diffuserHeight: number, workZoneHeight: number, gridStep: number = 0.5
): number[][] => {
    // Возвращаем пустой массив для отключения Heatmap (для оптимизации), 
    // или раскомментируйте старую логику, если она нужна
    return []; 
};
export const analyzeCoverage = (velocityField: number[][]) => ({
    totalCoverage: 0, avgVelocity: 0, comfortZones: 0,
    warningZones: 0, draftZones: 0, deadZones: 0
});