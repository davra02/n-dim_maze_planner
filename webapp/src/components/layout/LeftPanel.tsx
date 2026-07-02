import { useStore } from '../../state/store';
import { examples } from '../../data/examples';
import { agentColor } from '../../theme';
import ToolPalette from '../editor/ToolPalette';
import Legend from '../editor/Legend';

export default function LeftPanel() {
  const loadExample = useStore((s) => s.loadExample);
  const problem = useStore((s) => s.problem);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setActiveAgent = useStore((s) => s.setActiveAgent);
  const setSelection = useStore((s) => s.setSelection);
  const addAgent = useStore((s) => s.addAgent);

  return (
    <aside className="w-64 shrink-0 border-r border-surface-border bg-surface-0 overflow-auto p-3 space-y-3">
      <div className="panel">
        <div className="panel-header">Ejemplos</div>
        <div className="p-2 space-y-1">
          {examples.map((ex) => (
            <button
              key={ex.id}
              className="tool-btn flex-col items-start gap-0.5"
              onClick={() => loadExample(ex.id)}
              title={ex.description}
            >
              <span className="text-slate-200">{ex.title}</span>
              <span className="text-[11px] text-slate-500 leading-snug">{ex.description}</span>
            </button>
          ))}
        </div>
      </div>

      <ToolPalette />

      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>Agentes</span>
          <button className="text-accent hover:text-accent/80 text-sm" onClick={addAgent} title="Añadir agente">
            +
          </button>
        </div>
        <div className="p-2 space-y-1">
          {problem.agents.map((a) => (
            <button
              key={a.id}
              className={`tool-btn ${activeAgentId === a.id ? 'tool-btn-active' : ''}`}
              onClick={() => {
                setActiveAgent(a.id);
                setSelection({ kind: 'agent', id: a.id });
              }}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: agentColor(problem.agents, a.id) }}
              />
              <span className="font-mono">{a.id}</span>
              <span className="text-[11px] text-slate-500 ml-auto">
                [{a.start.join(',')}]→[{a.goal.join(',')}]
              </span>
            </button>
          ))}
        </div>
      </div>

      <Legend />
    </aside>
  );
}
