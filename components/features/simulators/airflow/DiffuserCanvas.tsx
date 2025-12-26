import React from 'react';
import { PerformanceResult, PlacedDiffuser } from '../../../../types';
import SideViewCanvas from './views/SideViewCanvas';
import TopViewCanvas from './views/TopViewCanvas';
import ThreeDViewCanvas from './views/ThreeDViewCanvas';
import { PlusCircle, Info } from 'lucide-react';

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
    const hasDiffusers = props.placedDiffusers && props.placedDiffusers.length > 0;

    const EmptyStateOverlay = () => (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-white/10 dark:bg-black/40 backdrop-blur-md border border-dashed border-white/20 p-8 rounded-[32px] flex flex-col items-center text-center shadow-2xl max-w-sm mx-6">
                <div className="p-4 bg-white/5 rounded-full mb-4 ring-1 ring-white/10">
                    <PlusCircle size={32} className="text-blue-400 opacity-80" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Система пуста</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Добавьте устройство через меню слева, чтобы начать моделирование потоков.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg">
                    <Info size={12} />
                    <span>Выберите тип и нажмите "Добавить"</span>
                </div>
            </div>
        </div>
    );

    let viewComponent;
    if (props.viewMode === 'top') {
        viewComponent = (
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
    } else if (props.viewMode === '3d') {
        viewComponent = (
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
            />
        );
    } else {
        viewComponent = (
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
                diffuserHeight={props.diffuserHeight}
                workZoneHeight={props.workZoneHeight}
                placedDiffusers={props.placedDiffusers}
            />
        );
    }

    return (
        <div className="relative w-full h-full">
            {!hasDiffusers && <EmptyStateOverlay />}
            {viewComponent}
        </div>
    );
};

export default React.memo(DiffuserCanvas);