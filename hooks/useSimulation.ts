
import { useMemo } from 'react';
import { SPECS, ENGINEERING_DATA } from '../constants';
import { PerformanceResult, Spec, PlacedDiffuser } from '../types';

// ==========================================
// 4. PHYSICS & SIMULATION LOGIC
// ==========================================

export const interpolate = (val: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
};

// --- ENGINEERING CALCULATIONS ---

/**
 * Calculates velocity in the occupied zone (Work Zone) using jet theory.
 * Includes corrections for:
 * - Coanda Effect (Surface attachment)
 * - Archimedes Number (Buoyancy/Non-isothermal effects)
 * - Trajectory Path Length (Horizontal throw + Vertical drop)
 */
export const calculateWorkzoneVelocityAndCoverage = (
    v0: number, 
    spec_A_mm2: number, // Ak (Effective Area) in mm²
    diffuserHeight: number, 
    workZoneHeight: number,
    isCeilingMounted: boolean,
    flowType: string,
    dt: number, // T_supply - T_room
    roomWidth: number = 5
) => {
    // 1. Constants & Geometry
    const Ak_m2 = spec_A_mm2 / 1e6; // m²
    const D_eq = Math.sqrt((4 * Ak_m2) / Math.PI); // Equivalent diameter
    const g = 9.81;
    const beta = 1 / 293; // Thermal expansion coeff (approx at 20°C)

    // 2. Archimedes Number (Ar)
    // Characterizes the ratio of buoyant forces to inertial forces.
    // Ar > 0: Heating (Lift), Ar < 0: Cooling (Drop) (assuming dt = T_sup - T_room)
    // Note: Standard Ar def uses abs(dt), sign handled by logic.
    const Ar = v0 > 0.05 ? (g * beta * dt * Math.sqrt(Ak_m2)) / (v0 * v0) : 0;

    // 3. Decay Constant (K)
    // Standard compact jet K ~ 5.0. 
    // Coanda Effect: Jet attaches to ceiling, entrainment is restricted (half-jet), 
    // resulting in slower velocity decay (longer throw).
    // K_coanda ≈ K_free * sqrt(2) ≈ 1.4 * K_free.
    let K = 5.0; 
    const isHorizontal = flowType.includes('horizontal') || flowType.includes('4-way') || flowType.includes('swirl');
    
    if (isCeilingMounted && isHorizontal) {
        K = 7.0; // Confinement coefficient applied
    }

    // 4. Trajectory & Path Length (L)
    const verticalDist = Math.max(0.1, diffuserHeight - workZoneHeight);
    let L = verticalDist;

    if (isHorizontal) {
        // Path = Horizontal Run + Vertical Drop
        // The horizontal distance the jet travels before turning into the work zone
        // is dependent on buoyancy (Ar) and room geometry.
        
        let horizontalRun = roomWidth / 3.0; // Characteristic length to occupied zone

        if (Ar < -0.001) {
            // Cooling: Jet drops due to negative buoyancy.
            // Separation distance x_s is proportional to Ar^-1/3.
            // Strong cooling (large neg Ar) -> Short horizontal run.
            const dropFactor = Math.min(1.0, 0.15 / Math.abs(Ar)); 
            horizontalRun *= dropFactor;
        } else if (Ar > 0.001) {
            // Heating: Jet lifts/sticks to ceiling.
            // Path length effectively increases as it overshoots or mixes at ceiling.
            horizontalRun *= 1.5;
        }

        // Total streamlines path length approximation
        L = horizontalRun + verticalDist;
    } else {
        // Vertical Jet
        // If Heating (Ar > 0): Jet fights buoyancy, velocity decays faster.
        // If Cooling (Ar < 0): Jet accelerates/maintains velocity due to gravity.
        if (Ar > 0) L *= 1.4; // Effective path longer (more decay)
        if (Ar < 0) L *= 0.8; // Effective path shorter (less decay/acceleration)
    }

    // 5. Centerline Velocity Decay
    // Formula: V(x) = K * (V0 * sqrt(Ak) / x)
    let vx = (K * v0 * Math.sqrt(Ak_m2)) / Math.max(0.5, L);

    // 6. Limits
    vx = Math.min(vx, v0); // Conservation of energy (simplified)
    vx = Math.max(0.05, vx); // Minimum air movement

    // 7. Coverage Radius
    // Based on jet spreading angle α ≈ 22°. tan(11°) ≈ 0.2.
    // r = distance * 0.2
    const coverageRadius = L * 0.22;

    return { workzoneVelocity: vx, coverageRadius, Ar };
};

export const calculatePerformance = (modelId: string, flowType: string, diameter: string | number, volume: number): Partial<PerformanceResult> | null => {
    const spec = SPECS[diameter];
    if (!spec) return null;

    // Constraints
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
    
    // Linear Interpolation
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

    // Initial Velocity V0 calculation based on Effective Area (f0)
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
    workZoneHeight: number,
    roomWidth: number = 5 // Added for path calc
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

        const dt = temp - roomTemp;
        const Ak_mm2 = perf.spec.f0 * 1e6;
        
        // Calculate Physics-Based Velocity in Work Zone
        const { workzoneVelocity, coverageRadius, Ar } = calculateWorkzoneVelocityAndCoverage(
            perf.v0 || 0,
            Ak_mm2,
            diffuserHeight,
            workZoneHeight,
            true, // Assuming ceiling mounted for simulator default
            flowType,
            dt,
            roomWidth
        );

        // Adjust Throw Distance based on Buoyancy for UI display
        // Cold jets drop (shorter effective throw before hitting zone), Hot jets float (longer)
        let finalThrow = perf.throwDist || 0;
        if (Ar < 0) finalThrow *= 0.8; 
        else if (Ar > 0) finalThrow *= 1.2;

        return {
            v0: perf.v0 || 0,
            pressure: perf.pressure || 0,
            noise: perf.noise || 0,
            throwDist: finalThrow,
            workzoneVelocity,
            coverageRadius,
            spec: perf.spec,
            Ar,
            error: null
        };
    }, [modelId, flowType, diameter, volume, temp, roomTemp, diffuserHeight, workZoneHeight, roomWidth]);
};

// --- FIELD CALCULATIONS ---

/**
 * Calculates the 2D velocity field at Work Zone height using Superposition.
 * Uses Root Mean Square (RMS) summation for energy conservation: V_res = sqrt(sum(V_i^2)).
 * Applies Schlichting jet profile for radial decay.
 */
export const calculateVelocityField = (
    roomWidth: number, roomLength: number, placedDiffusers: PlacedDiffuser[], 
    diffuserHeight: number, workZoneHeight: number, gridStep: number = 0.5
): number[][] => {
    const cols = Math.ceil(roomWidth / gridStep);
    const rows = Math.ceil(roomLength / gridStep);
    const field: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * gridStep + gridStep / 2;
            const y = r * gridStep + gridStep / 2;
            
            let sumV2 = 0; // Sum of squares
            
            for (const d of placedDiffusers) {
                const dx = x - d.x;
                const dy = y - d.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Get core velocity and radius at the workplane intersection
                const vCore = d.performance.workzoneVelocity;
                const radius = d.performance.coverageRadius;
                
                // Schlichting Velocity Profile: V(r) = Vc * (1 - (r/R)^1.5)^2
                if (dist <= radius) {
                    const profileFactor = Math.pow(1 - Math.pow(dist / radius, 1.5), 2);
                    const vLocal = vCore * profileFactor;
                    sumV2 += vLocal * vLocal;
                }
            }
            
            // RMS Superposition
            field[r][c] = Math.sqrt(sumV2);
        }
    }
    return field; 
};

export const analyzeCoverage = (velocityField: number[][]) => {
    let totalPoints = 0;
    let coveredPoints = 0;
    let totalVelocity = 0;
    let comfortZones = 0; // 0.1 - 0.25 m/s (ISO 7730 Category A/B)
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
