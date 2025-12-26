
import { ReactNode } from 'react';

export type ToolMode = 'select' | 'probe' | 'measure' | 'obstacle' | 'pipette';
export type VisualizationMode = 'velocity' | 'adpi';

export interface Obstacle {
  id: string;
  x: number; // Center X (meters)
  y: number; // Center Y (meters)
  width: number; // Dimension X (meters)
  length: number; // Dimension Y (meters) - Replaces 2D height
  z: number; // Elevation from floor (meters)
  height: number; // Thickness/Vertical Height (meters)
  type: 'furniture' | 'wall_block';
  rotation: number; // Degrees
}

export interface GridPoint {
  v: number;   // Velocity Magnitude
  t: number;   // Temperature
  edt: number; // Effective Draft Temperature
  turbulence: number; // Turbulence intensity (0 to ~2.0+)
}

export interface Spec {
  f0: number;
  A: number;
  B: number;
  C: number;
  D: number;
  min: number;
  max: number;
}

export interface ModePoint {
  vol: number;
  pa: number;
  db: number;
  throw: number;
}

export interface DiffuserMode {
  id: string;
  name: string;
  subtitle: string;
  b_text: string;
  flowType: string;
  icon: ReactNode;
}

export interface DiffuserModel {
  id: string;
  series: string;
  name: string;
  modes: DiffuserMode[];
}

export interface SimulationParams {
  diameter: number | string;
  volume: number;
  temperature: number;
  roomTemp: number;
  modelId: string;
  modeIdx: number;
  roomHeight: number;
  roomWidth: number;
  roomLength: number;
  diffuserHeight: number;
  isCeilingMounted: boolean;
  workZoneHeight: number;
}

export interface PerformanceResult {
  v0: number;
  pressure: number;
  noise: number;
  throwDist: number;
  spec: Spec;
  error?: string | null;
  workzoneVelocity: number;
  coverageRadius: number;
  Ar?: number; // Archimedes number for buoyancy
}

export interface PlacedDiffuser {
  id: string;
  index: number;
  x: number; // meters from left
  y: number; // meters from top
  modelId: string;
  diameter: number | string;
  volume: number;
  performance: PerformanceResult;
}

export interface Probe {
  id: string;
  x: number; // Position X (meters)
  y: number; // Position Y (meters)
  z: number; // Position Z (height in meters)
}

export interface ProbeData {
  v: number;    // Velocity m/s
  t: number;    // Temperature C
  angle: number; // Flow direction in radians
  dr: number;   // Draft Rating %
}

export interface WikiContentBlock {
  type: 'text' | 'custom_formula' | 'variable_list';
  content?: string;
  render?: () => ReactNode;
  items?: { symbol: ReactNode; definition: string }[];
}

export interface WikiItem {
  id: string;
  category: string;
  title: string;
  content_blocks: WikiContentBlock[];
}

export interface NormItem {
  code: string;
  title: string;
  status: string;
  desc: string;
}

export interface SymbolItem {
  id: string;
  category: string;
  title: string;
  desc: string;
  draw: () => ReactNode;
}

export type EngineeringData = Record<string, Record<string, Record<string | number, ModePoint[]>>>;
export type SpecMap = Record<string | number, Spec>;
