import { useState } from 'react';
import { useStore } from '../../state/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewProblemDialog({ open, onClose }: Props) {
  const newProblem = useStore((s) => s.newProblem);
  const [name, setName] = useState('nuevo-problema');
  const [ndims, setNdims] = useState(2);
  const [sizes, setSizes] = useState<number[]>([5, 5]);
  const [agents, setAgents] = useState(1);

  if (!open) return null;

  const setDims = (n: number) => {
    setNdims(n);
    setSizes((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(3);
      return next.slice(0, n);
    });
  };

  const create = () => {
    const dims = sizes.slice(0, ndims).map((s) => Math.max(1, Math.min(12, Math.round(s))));
    newProblem({ name, dimensions: dims, agents: Math.max(1, Math.min(8, agents)) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="panel w-[440px] max-w-[90vw] bg-surface-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header flex items-center justify-between">
          <span>Nuevo problema</span>
          <button className="text-slate-400 hover:text-slate-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Nombre</label>
            <input
              className="w-full bg-surface-2 border border-surface-border rounded px-2 py-1.5 text-sm font-mono"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Dimensiones</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`btn px-3 py-1 text-sm ${ndims === n ? 'btn-accent' : ''}`}
                  onClick={() => setDims(n)}
                >
                  {n === 5 ? '5+' : n}D
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Tamaño por dimensión</label>
            <div className="flex flex-wrap gap-2">
              {sizes.slice(0, ndims).map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 font-mono">d{i}</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="w-16 bg-surface-2 border border-surface-border rounded px-2 py-1 text-sm"
                    value={s}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSizes((prev) => prev.map((p, idx) => (idx === i ? v : p)));
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Los dos últimos ejes son el plano editable (fila × columna).
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Número de agentes</label>
            <input
              type="number"
              min={1}
              max={8}
              className="w-20 bg-surface-2 border border-surface-border rounded px-2 py-1 text-sm"
              value={agents}
              onChange={(e) => setAgents(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-3 border-t border-surface-border">
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-accent" onClick={create}>
            Crear problema
          </button>
        </div>
      </div>
    </div>
  );
}
