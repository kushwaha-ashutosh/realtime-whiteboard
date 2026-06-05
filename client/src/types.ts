export type ShapeType = 'rect' | 'ellipse' | 'line';

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
  // for lines
  points?: number[];
}
