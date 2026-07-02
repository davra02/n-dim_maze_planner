import { useState } from 'react';
import { useStore } from '../../state/store';
import NewProblemDialog from '../editor/NewProblemDialog';

export default function TopBar() {
  const problem = useStore((s) => s.problem);
  const run = useStore((s) => s.runPlanner);
  const planning = useStore((s) => s.planning);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <header className="flex items-center gap-4 px-4 h-14 border-b border-surface-border bg-surface-1">
      <div className="flex items-center gap-2">
        <span className="text-accent text-lg">◆</span>
        <div className="leading-tight">
          <div className="font-semibold text-slate-100">n-dim maze planner</div>
          <div className="text-[11px] text-slate-500">
            Editor PDDL temporal · dominio <span className="font-mono">temporal-maze</span> · OPTIC
          </div>
        </div>
      </div>

      <div className="ml-4 text-xs text-slate-400 font-mono hidden md:block">
        {problem.name} · {problem.dimensions.length}D {problem.dimensions.join('×')} ·{' '}
        {problem.agents.length} agente{problem.agents.length > 1 ? 's' : ''}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="btn" onClick={() => setDialogOpen(true)}>
          + Nuevo problema
        </button>
        <button className="btn btn-accent" onClick={run} disabled={planning}>
          {planning ? 'Planificando…' : '▶ Generar plan'}
        </button>
      </div>

      <NewProblemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </header>
  );
}
