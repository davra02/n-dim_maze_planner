import { useStore } from '../../state/store';
import { ACTION_LABEL, agentColor } from '../../theme';

export default function PlanPanel() {
  const plan = useStore((s) => s.plan);
  const planning = useStore((s) => s.planning);
  const problem = useStore((s) => s.problem);
  const run = useStore((s) => s.runPlanner);

  if (planning) {
    return <div className="p-4 text-sm text-slate-400">Planificando…</div>;
  }

  if (!plan) {
    return (
      <div className="p-4 text-sm text-slate-400 space-y-3">
        <p>Aún no se ha generado ningún plan.</p>
        <button className="btn btn-accent" onClick={run}>
          ▶ Generar plan
        </button>
      </div>
    );
  }

  if (!plan.found) {
    return (
      <div className="p-4 text-sm space-y-2">
        <p className="text-amber-400">Sin solución</p>
        <p className="text-slate-400 text-xs">{plan.note}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 border-b border-surface-border text-xs text-slate-400 flex items-center gap-3">
        <span>{plan.actions.length} acciones</span>
        <span>·</span>
        <span>makespan {plan.stats.makespan}</span>
        <span>·</span>
        <span>coste {plan.stats.cost}</span>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-surface-1 text-slate-500">
            <tr className="text-left">
              <th className="px-3 py-1.5 font-medium">#</th>
              <th className="px-3 py-1.5 font-medium">t</th>
              <th className="px-3 py-1.5 font-medium">dur</th>
              <th className="px-3 py-1.5 font-medium">agente</th>
              <th className="px-3 py-1.5 font-medium">acción</th>
              <th className="px-3 py-1.5 font-medium">detalle</th>
            </tr>
          </thead>
          <tbody>
            {plan.actions.map((a, i) => (
              <tr key={i} className="border-t border-surface-border/60 hover:bg-surface-2">
                <td className="px-3 py-1 text-slate-500">{i + 1}</td>
                <td className="px-3 py-1">{a.start.toFixed(3)}</td>
                <td className="px-3 py-1 text-slate-500">{a.duration}</td>
                <td className="px-3 py-1" style={{ color: agentColor(problem.agents, a.agent) }}>
                  {a.agent}
                </td>
                <td className="px-3 py-1">{ACTION_LABEL[a.type] ?? a.type}</td>
                <td className="px-3 py-1 text-slate-400">
                  {a.from && a.to && `${a.from} → ${a.to}`}
                  {a.door && ` · ${a.door}`}
                  {a.elevator && ` · ${a.elevator}`}
                  {a.button && !a.from && `${a.button}`}
                  {a.cell && ` @ ${a.cell}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
