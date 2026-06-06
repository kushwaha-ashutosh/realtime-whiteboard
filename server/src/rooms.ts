import type { Room, WhiteboardShape } from './types';

const rooms = new Map<string, Room>();

export function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { id: roomId, shapes: [], clients: new Set() });
  }
  return rooms.get(roomId)!;
}

export function applyShapeAdd(room: Room, shape: WhiteboardShape): void {
  room.shapes.push(shape);
}

export function applyShapeUpdate(room: Room, shape: WhiteboardShape): void {
  const idx = room.shapes.findIndex(s => s.id === shape.id);
  if (idx !== -1) room.shapes[idx] = shape;
}

export function applyShapeDelete(room: Room, id: string): void {
  room.shapes = room.shapes.filter(s => s.id !== id);
}

export function applyClear(room: Room): void {
  room.shapes = [];
}
