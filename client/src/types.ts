export type ShapeType = 'rect' | 'ellipse' | 'line' | 'pen' | 'arrow' | 'text' | 'sticky';

export interface WhiteboardShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  points?: number[];
  text?: string;
  fontSize?: number;
}
