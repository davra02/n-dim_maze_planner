import { useStore } from '../../state/store';
import { TOOLS } from '../../theme';

export default function ToolPalette() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const problem = useStore((s) => s.problem);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setActiveAgent = useStore((s) => s.setActiveAgent);

  return (
    <div className="panel">
      <div className="panel-header">Herramientas</div>
      <div className="p-2 space-y-0.5">
        {TOOLS.map((t) => (
          <button
            key={t.kind}
            className={`tool-btn ${tool === t.kind ? 'tool-btn-active' : ''}`}
            title={t.hint}
            onClick={() => setTool(t.kind)}
          >
            <span className="w-5 text-center text-base">{t.glyph}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      {(tool === 'start' || tool === 'goal') && problem.agents.length > 1 && (
        <div className="px-3 pb-3">
          <label className="text-xs text-slate-400 block mb-1">Agente activo</label>
          <select
            className="w-full bg-surface-2 border border-surface-border rounded px-2 py-1 text-sm"
            value={activeAgentId}
            onChange={(e) => setActiveAgent(e.target.value)}
          >
            {problem.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
