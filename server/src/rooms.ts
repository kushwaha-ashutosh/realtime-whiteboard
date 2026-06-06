import type { Room, WhiteboardShape } from './types';
import { saveRoom } from './db';

const rooms = new Map<string, Room>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { id: roomId, shapes: [], clients: new Set() });
  }
  return rooms.get(roomId)!;
}

// Debounce saves: flush to DB 1.5s after last change
function scheduleSave(roomId: string, shapes: WhiteboardShape[]) {
  const existing = saveTimers.get(roomId);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    roomId,
    setTimeout(() => {
      saveRoom(roomId, shapes).catch(err =>
        console.error(`[db] save failed for room ${roomId}:`, err),
      );
      saveTimers.delete(roomId);
    }, 1500),
  );
}

export function applyShapeAdd(room: Room, shape: WhiteboardShape): void {
  room.shapes.push(shape);
  scheduleSave(room.id, room.shapes);
}

export function applyShapeUpdate(room: Room, shape: WhiteboardShape): void {
  const idx = room.shapes.findIndex(s => s.id === shape.id);
  if (idx !== -1) room.shapes[idx] = shape;
  scheduleSave(room.id, room.shapes);
}

export function applyShapeDelete(room: Room, id: string): void {
  room.shapes = room.shapes.filter(s => s.id !== id);
  scheduleSave(room.id, room.shapes);
}

export function applyClear(room: Room): void {
  room.shapes = [];
  scheduleSave(room.id, room.shapes);
}
