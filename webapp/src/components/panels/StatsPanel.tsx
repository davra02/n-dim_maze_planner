import { useStore } from '../../state/store';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-3">
      <div className="text-2xl font-mono text-slate-100">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
      {hint && <div className="text-[10px] text-slate-600 mt-0.5">{hint}</div>}
    </div>
  );
}

export default function StatsPanel() {
  const plan = useStore((s) => s.plan);
  const service = 'Mock planner (in-browser)';

  if (!plan) {
    return <div className="p-4 text-sm text-slate-500">Genera un plan para ver las estadísticas.</div>;
  }
  if (!plan.found) {
    return (
      <div className="p-4 text-sm text-amber-400">
        No se encontró plan · estados evaluados: {plan.stats.statesEvaluated ?? '—'}
      </div>
    );
  }

  const s = plan.stats;
  const fmt = (n?: number, suffix = '') => (n == null ? '—' : `${n}${suffix}`);

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Stat label="Makespan" value={fmt(s.makespan)} hint="max(inicio + duración)" />
        <Stat label="Coste / metric" value={fmt(s.cost ?? s.metric)} hint="minimize (total-cost)" />
        <Stat label="Nº acciones" value={fmt(s.actions)} />
        <Stat label="Estados evaluados" value={fmt(s.statesEvaluated)} />
        <Stat label="Tiempo planificador" value={fmt(s.plannerTimeSeconds, ' s')} />
        <Stat label="Tiempo total (wall)" value={fmt(s.wallSeconds, ' s')} />
      </div>
      <p className="text-[11px] text-slate-600 mt-3">
        Fuente: {service}. El esquema replica el <span className="font-mono">stats.json</span> de{' '}
        <span className="font-mono">scripts/run_optic.py</span>; un backend real de OPTIC devolvería
        estos mismos campos.
      </p>
    </div>
  );
}
