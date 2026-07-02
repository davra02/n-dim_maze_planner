import { useStore } from '../../state/store';
import GridSlice from './GridSlice';

// General slice editor: renders the last-two-dimension plane at the currently
// selected higher-dimension indices. Works for 2D (no selectors), 3D (one
// level selector) and 4D+ (one selector per higher dimension).

const DIM_NAMES = ['w', 'x', 'y', 'z'];

function axisName(index: number, nd: number): string {
  // Map the leading coordinate axes to friendly names when nd <= 4.
  if (nd <= 4) return DIM_NAMES[index] ?? `d${index}`;
  return `d${index}`;
}

export default function GridEditor2D() {
  const problem = useStore((s) => s.problem);
  const layer = useStore((s) => s.layer);
  const setLayerAt = useStore((s) => s.setLayerAt);
  const connectAnchor = useStore((s) => s.connectAnchor);
  const tool = useStore((s) => s.tool);

  const nd = problem.dimensions.length;
  const higherCount = Math.max(0, nd - 2);

  return (
    <div className="flex flex-col h-full">
      {higherCount > 0 && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-surface-border bg-surface-1 text-sm">
          <span className="text-slate-400">Corte:</span>
          {Array.from({ length: higherCount }).map((_, i) => (
            <label key={i} className="flex items-center gap-2">
              <span className="text-slate-300 font-mono">{axisName(i, nd)} =</span>
              <select
                className="bg-surface-2 border border-surface-border rounded px-2 py-1"
                value={layer[i] ?? 0}
                onChange={(e) => setLayerAt(i, Number(e.target.value))}
              >
                {Array.from({ length: problem.dimensions[i] }).map((__, v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <span className="text-slate-500 text-xs">
            plano fila×col = ejes {nd - 2}, {nd - 1}
          </span>
        </div>
      )}

      {connectAnchor && (tool === 'door' || tool === 'stairs' || tool === 'elevator') && (
        <div className="px-4 py-1.5 text-xs text-accent bg-accent/10 border-b border-surface-border">
          Ancla fijada en [{connectAnchor.join(',')}] — haz clic en la segunda celda para crear la
          conexión ({tool}). Clic en la misma celda para cancelar.
        </div>
      )}

      <div className="flex-1 min-h-0">
        <GridSlice layer={layer} interactive />
      </div>
    </div>
  );
}
