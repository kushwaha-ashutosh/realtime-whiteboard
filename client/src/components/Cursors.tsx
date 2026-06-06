interface CursorState {
  x: number;
  y: number;
  name: string;
  color: string;
}

interface Props {
  cursors: Map<number, CursorState>;
  myClientId: number;
  offsetX?: number;
  offsetY?: number;
}

const COLORS = ['#f97316','#eab308','#22c55e','#06b6d4','#8b5cf6','#ec4899','#ef4444'];

export function colorForId(id: number): string {
  return COLORS[id % COLORS.length];
}

export default function Cursors({ cursors, myClientId, offsetX = 0, offsetY = 0 }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {Array.from(cursors.entries()).map(([id, state]) => {
        if (id === myClientId) return null;
        return (
          <div key={id} style={{
            position: 'absolute',
            left: state.x + offsetX,
            top: state.y + offsetY,
            transform: 'translate(8px, 8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', left: -8, top: -8,
              width: 12, height: 12, borderRadius: '50%',
              background: state.color, border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }} />
            <div style={{
              background: state.color, color: '#fff',
              borderRadius: 6, padding: '2px 7px',
              fontSize: 12, fontWeight: 600, fontFamily: 'sans-serif',
              whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}>
              {state.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
