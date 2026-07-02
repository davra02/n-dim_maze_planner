import { useStore } from '../../state/store';
import PddlPanel from '../panels/PddlPanel';
import PlanPanel from '../panels/PlanPanel';
import StatsPanel from '../panels/StatsPanel';

const TABS: { id: 'pddl' | 'plan' | 'stats'; label: string }[] = [
  { id: 'pddl', label: 'PDDL generado' },
  { id: 'plan', label: 'Plan' },
  { id: 'stats', label: 'Estadísticas' },
];

export default function BottomTabs() {
  const tab = useStore((s) => s.bottomTab);
  const setTab = useStore((s) => s.setBottomTab);
  const plan = useStore((s) => s.plan);

  return (
    <div className="flex flex-col h-full panel overflow-hidden">
      <div className="flex items-center border-b border-surface-border bg-surface-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'plan' && plan?.found && (
              <span className="ml-1.5 text-[10px] text-slate-500">({plan.actions.length})</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'pddl' && <PddlPanel />}
        {tab === 'plan' && <PlanPanel />}
        {tab === 'stats' && <StatsPanel />}
      </div>
    </div>
  );
}
