import { useStore } from '../../state/store';
import type { Coord } from '../../types/maze';

function CoordInput({
  value,
  dims,
  onChange,
}: {
  value: Coord;
  dims: number[];
  onChange: (c: Coord) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((v, i) => (
        <input
          key={i}
          type="number"
          min={0}
          max={dims[i] - 1}
          className="w-12 bg-surface-2 border border-surface-border rounded px-1.5 py-1 text-sm font-mono"
          value={v}
          onChange={(e) => {
            const next = [...value];
            next[i] = Math.max(0, Math.min(dims[i] - 1, Number(e.target.value)));
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <div className="text-xs text-slate-400">{label}</div>
    {children}
  </div>
);

export default function PropertiesPanel() {
  const selection = useStore((s) => s.selection);
  const problem = useStore((s) => s.problem);
  const dims = problem.dimensions;

  const updateAgent = useStore((s) => s.updateAgent);
  const removeAgent = useStore((s) => s.removeAgent);
  const updateButton = useStore((s) => s.updateButton);
  const removeButton = useStore((s) => s.removeButton);
  const updateDoor = useStore((s) => s.updateDoor);
  const removeDoor = useStore((s) => s.removeDoor);
  const removeElevator = useStore((s) => s.removeElevator);
  const removeStairs = useStore((s) => s.removeStairs);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">Propiedades</div>
      <div className="p-3 space-y-4 overflow-auto text-sm">
        {!selection && (
          <p className="text-slate-500 text-xs leading-relaxed">
            Selecciona un elemento en el editor (herramienta «Seleccionar») para editar sus
            propiedades: agentes, botones, puertas, escaleras y ascensores.
          </p>
        )}

        {selection?.kind === 'cell' && (
          <div className="space-y-2">
            <Field label="Celda">
              <span className="font-mono text-slate-200">[{selection.coord.join(',')}]</span>
            </Field>
            <p className="text-xs text-slate-500">
              {problem.walls.includes(selection.coord.join(','))
                ? 'Celda bloqueada (pared).'
                : 'Celda libre.'}
            </p>
          </div>
        )}

        {selection?.kind === 'agent' &&
          (() => {
            const a = problem.agents.find((x) => x.id === selection.id);
            if (!a) return null;
            return (
              <div className="space-y-3">
                <Field label="Agente">
                  <span className="font-mono text-accent">{a.id}</span>
                </Field>
                <Field label="Inicio">
                  <CoordInput value={a.start} dims={dims} onChange={(c) => updateAgent(a.id, { start: c })} />
                </Field>
                <Field label="Meta">
                  <CoordInput value={a.goal} dims={dims} onChange={(c) => updateAgent(a.id, { goal: c })} />
                </Field>
                <button className="btn text-red-400 border-red-500/40" onClick={() => removeAgent(a.id)}>
                  Eliminar agente
                </button>
              </div>
            );
          })()}

        {selection?.kind === 'button' &&
          (() => {
            const b = problem.buttons.find((x) => x.id === selection.id);
            if (!b) return null;
            return (
              <div className="space-y-3">
                <Field label="Botón">
                  <span className="font-mono text-amber-400">{b.id}</span>
                </Field>
                <Field label="Celda">
                  <CoordInput value={b.cell} dims={dims} onChange={(c) => updateButton(b.id, { cell: c })} />
                </Field>
                <Field label="Abre puerta">
                  <select
                    className="w-full bg-surface-2 border border-surface-border rounded px-2 py-1"
                    value={b.opensDoor ?? ''}
                    onChange={(e) => updateButton(b.id, { opensDoor: e.target.value || undefined })}
                  >
                    <option value="">—</option>
                    {problem.doors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Activa ascensor">
                  <select
                    className="w-full bg-surface-2 border border-surface-border rounded px-2 py-1"
                    value={b.activatesElevator ?? ''}
                    onChange={(e) =>
                      updateButton(b.id, { activatesElevator: e.target.value || undefined })
                    }
                  >
                    <option value="">—</option>
                    {problem.elevators.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className="btn text-red-400 border-red-500/40" onClick={() => removeButton(b.id)}>
                  Eliminar botón
                </button>
              </div>
            );
          })()}

        {selection?.kind === 'door' &&
          (() => {
            const d = problem.doors.find((x) => x.id === selection.id);
            if (!d) return null;
            const openedBy = problem.buttons.filter((b) => b.opensDoor === d.id).map((b) => b.id);
            const win = d.timedWindows?.[0];
            return (
              <div className="space-y-3">
                <Field label="Puerta">
                  <span className="font-mono text-red-400">{d.id}</span>
                </Field>
                <Field label="Conecta">
                  <div className="font-mono text-xs text-slate-300">
                    [{d.a.join(',')}] ↔ [{d.b.join(',')}]
                  </div>
                </Field>
                <Field label="Control">
                  <div className="text-xs text-slate-400">
                    {openedBy.length ? `Botón: ${openedBy.join(', ')}` : 'Sin botón'} ·{' '}
                    {win ? `Temporal: abre ${win.open}${win.close != null ? `, cierra ${win.close}` : ''}` : 'No temporal'}
                  </div>
                </Field>
                <Field label="Puerta temporal (initial literals)">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">abre</label>
                    <input
                      type="number"
                      min={0}
                      className="w-16 bg-surface-2 border border-surface-border rounded px-1.5 py-1 text-sm"
                      value={win?.open ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const open = Number(e.target.value);
                        updateDoor(d.id, {
                          timedWindows: e.target.value === '' ? undefined : [{ open, close: win?.close }],
                          control: e.target.value === '' ? (openedBy.length ? 'button' : 'none') : openedBy.length ? 'both' : 'timed',
                        });
                      }}
                    />
                    <label className="text-xs text-slate-400">cierra</label>
                    <input
                      type="number"
                      min={0}
                      className="w-16 bg-surface-2 border border-surface-border rounded px-1.5 py-1 text-sm"
                      value={win?.close ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const close = e.target.value === '' ? undefined : Number(e.target.value);
                        updateDoor(d.id, { timedWindows: [{ open: win?.open ?? 0, close }] });
                      }}
                    />
                  </div>
                </Field>
                <button className="btn text-red-400 border-red-500/40" onClick={() => removeDoor(d.id)}>
                  Eliminar puerta
                </button>
              </div>
            );
          })()}

        {selection?.kind === 'elevator' &&
          (() => {
            const el = problem.elevators.find((x) => x.id === selection.id);
            if (!el) return null;
            const activatedBy = problem.buttons
              .filter((b) => b.activatesElevator === el.id)
              .map((b) => b.id);
            return (
              <div className="space-y-3">
                <Field label="Ascensor">
                  <span className="font-mono text-accent">{el.id}</span>
                </Field>
                <Field label="Conecta">
                  <div className="font-mono text-xs text-slate-300">
                    [{el.a.join(',')}] ↔ [{el.b.join(',')}]
                  </div>
                </Field>
                <Field label="Activado por">
                  <div className="text-xs text-slate-400">
                    {activatedBy.length ? activatedBy.join(', ') : 'Ningún botón (inactivo)'}
                  </div>
                </Field>
                <button className="btn text-red-400 border-red-500/40" onClick={() => removeElevator(el.id)}>
                  Eliminar ascensor
                </button>
              </div>
            );
          })()}

        {selection?.kind === 'stairs' &&
          (() => {
            const s = problem.stairs[selection.index];
            if (!s) return null;
            return (
              <div className="space-y-3">
                <Field label="Escalera">
                  <div className="font-mono text-xs text-slate-300">
                    [{s.a.join(',')}] ↔ [{s.b.join(',')}]
                  </div>
                </Field>
                <p className="text-xs text-slate-500">Coste/duración: 3 (sin activación).</p>
                <button
                  className="btn text-red-400 border-red-500/40"
                  onClick={() => removeStairs(selection.index)}
                >
                  Eliminar escalera
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
