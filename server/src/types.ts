export interface WhiteboardShape {
  id: string;
  type: 'rect' | 'ellipse' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  points?: number[];
}

export interface Room {
  id: string;
  shapes: WhiteboardShape[];
  clients: Set<import('ws').WebSocket>;
}

// WebSocket message types
export type ClientMsg =
  | { type: 'join'; roomId: string }
  | { type: 'shape_add'; shape: WhiteboardShape }
  | { type: 'shape_update'; shape: WhiteboardShape }
  | { type: 'shape_delete'; id: string }
  | { type: 'clear' };

export type ServerMsg =
  | { type: 'init'; shapes: WhiteboardShape[] }
  | { type: 'shape_add'; shape: WhiteboardShape }
  | { type: 'shape_update'; shape: WhiteboardShape }
  | { type: 'shape_delete'; id: string }
  | { type: 'clear' };
