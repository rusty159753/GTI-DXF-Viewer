export interface Annotation {
  id: string;
  type: 'text' | 'dimension';
  x: number; // world coordinates
  y: number;
  text: string;
}

export type ToolMode = 'pan' | 'text' | 'dimension' | 'move';

export interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number; // radians, clockwise
}
