import React from 'react';
import { PerformanceResult, PlacedDiffuser } from '../../../../types';
import SideViewCanvas from './views/SideViewCanvas';
import TopViewCanvas from './views/TopViewCanvas';
import ThreeDViewCanvas from './views/ThreeDViewCanvas';

interface DiffuserCanvasProps {
  width: number; 
  height: number;
  physics: PerformanceResult;
  isPowerOn: boolean; 
  isPlaying: boolean;
  temp: number; 
  roomTemp: number;
  flowType: string; 
  modelId: string;
  showGrid: boolean;
  roomHeight: number; 
  diffuserHeight: number; 
  workZoneHeight: number;
  roomWidth?: number;
  roomLength?: number;
  viewMode?: 'side' | 'top' | '3d';
  viewAxis?: 'front' | 'side';
  placedDiffusers?: PlacedDiffuser[];
  onUpdateDiffuserPos?: (id: string, x: number, y: number) => void;
  onSelectDiffuser?: (id: string) => void;
  onRemoveDiffuser?: (id: string) => void;
  onDuplicateDiffuser?: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  selectedDiffuserId?: string | null;
  showHeatmap?: boolean;
  velocityField?: number[][];
  dragPreview?: {x: number, y: number, width: number, height: number} | null;
  snapToGrid?: boolean;
  gridSnapSize?: number;
  gridStep?: number;
}

const DiffuserCanvas: React.FC<DiffuserCanvasProps> = (props) => {
    if (props.viewMode === 'top') {
        return (
            <TopViewCanvas 
                width={props.width}
                height={props.height}
                roomWidth={props.roomWidth || 6}
                roomLength={props.roomLength || 6}
                roomHeight={props.roomHeight}
                placedDiffusers={props.placedDiffusers}
                selectedDiffuserId={props.selectedDiffuserId}
                showGrid={props.showGrid}
                showHeatmap={props.showHeatmap || false}
                velocityField={props.velocityField}
                snapToGrid={props.snapToGrid}
                gridSnapSize={props.gridSnapSize}
                gridStep={props.gridStep}
                dragPreview={props.dragPreview}
                onUpdateDiffuserPos={props.onUpdateDiffuserPos}
                onSelectDiffuser={props.onSelectDiffuser}
                onRemoveDiffuser={props.onRemoveDiffuser}
                onDuplicateDiffuser={props.onDuplicateDiffuser}
                onDragStart={props.onDragStart}
                onDragEnd={props.onDragEnd}
            />
        );
    }

    if (props.viewMode === '3d') {
        return (
            <ThreeDViewCanvas 
                width={props.width}
                height={props.height}
                physics={props.physics}
                isPowerOn={props.isPowerOn}
                isPlaying={props.isPlaying}
                temp={props.temp}
                roomTemp={props.roomTemp}
                flowType={props.flowType}
                modelId={props.modelId}
                roomHeight={props.roomHeight}
                roomWidth={props.roomWidth || 6}
                roomLength={props.roomLength || 6}
                diffuserHeight={props.diffuserHeight}
                workZoneHeight={props.workZoneHeight}
                placedDiffusers={props.placedDiffusers}
                selectedDiffuserId={props.selectedDiffuserId}
            />
        );
    }

    return (
        <SideViewCanvas 
            width={props.width}
            height={props.height}
            physics={props.physics}
            isPowerOn={props.isPowerOn}
            isPlaying={props.isPlaying}
            temp={props.temp}
            roomTemp={props.roomTemp}
            flowType={props.flowType}
            modelId={props.modelId}
            showGrid={props.showGrid}
            roomHeight={props.roomHeight}
            roomWidth={props.roomWidth || 6}
            roomLength={props.roomLength || 6}
            diffuserHeight={props.diffuserHeight}
            workZoneHeight={props.workZoneHeight}
            placedDiffusers={props.placedDiffusers}
            selectedDiffuserId={props.selectedDiffuserId}
            viewAxis={props.viewAxis || 'front'}
        />
    );
};

export default React.memo(DiffuserCanvas);