export interface Annotation {
  id: string;
  type: 'text' | 'dimension';
  x: number; // world coordinates
  y: number;
  text: string;
}

export type ToolMode = 'pan' | 'text' | 'dimension';

export interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}
