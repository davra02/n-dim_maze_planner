import { Suspense, lazy } from 'react';
import { useStore, recommendViz } from '../../state/store';
import type { VizMode } from '../../types/maze';
import GridEditor2D from '../editor/GridEditor2D';
import GraphView from './GraphView';

// The 3D view pulls in Three.js; load it only when selected.
const View3D = lazy(() => import('./View3D'));

const OPTIONS: { mode: VizMode; label: string }[] = [
  { mode: 'grid', label: 'Grid' },
  { mode: '3d', label: '3D' },
  { mode: 'slices', label: 'Slices' },
  { mode: 'graph', label: 'Grafo' },
];

export default function VizSwitcher() {
  const problem = useStore((s) => s.problem);
  const viz = useStore((s) => s.viz);
  const setViz = useStore((s) => s.setViz);
  const showLabels = useStore((s) => s.showLabels);
  const toggleLabels = useStore((s) => s.toggleLabels);

  const recommended = recommendViz(problem.dimensions);
  const nd = problem.dimensions.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border bg-surface-1">
        <div className="flex items-center gap-1">
          {OPTIONS.map((o) => {
            const isRec = o.mode === recommended;
            const disabled = o.mode === '3d' && nd < 3;
            return (
              <button
                key={o.mode}
                disabled={disabled}
                className={`btn px-2.5 py-1 text-xs ${viz === o.mode ? 'btn-accent' : ''}`}
                title={isRec ? 'Recomendada para esta dimensionalidad' : undefined}
                onClick={() => setViz(o.mode)}
              >
                {o.label}
                {isRec && <span className="text-amber-400">★</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="font-mono">
            {nd}D · {problem.dimensions.join('×')}
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showLabels} onChange={toggleLabels} />
            Etiquetas
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-surface-0">
        {viz === 'grid' && <GridEditor2D />}
        {viz === 'slices' && <GridEditor2D />}
        {viz === '3d' && (
          <Suspense fallback={<div className="p-4 text-sm text-slate-400">Cargando vista 3D…</div>}>
            <View3D />
          </Suspense>
        )}
        {viz === 'graph' && <GraphView />}
      </div>
    </div>
  );
}
