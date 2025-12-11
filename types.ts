import { ReactNode } from 'react';

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

export interface WikiContentBlock {
  type: 'text' | 'custom_formula' | 'variable_list';
  content?: string;
  render?: () => ReactNode;
  items?: { symbol: string; definition: string }[];
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

export type EngineeringData = Record<string, Record<string, Record<string | number, ModePoint[]>>>;
export type SpecMap = Record<string | number, Spec>;