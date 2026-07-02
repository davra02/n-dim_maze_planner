import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { generatePddl } from '../../domain/pddlGenerator';

export default function PddlPanel() {
  const problem = useStore((s) => s.problem);
  const applyPddl = useStore((s) => s.applyPddl);

  const generated = generatePddl(problem);
  const [draft, setDraft] = useState(generated);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Resync when the model changes (unless the user is mid-edit).
  useEffect(() => {
    if (!dirty) setDraft(generated);
  }, [generated, dirty]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  const apply = () => {
    const res = applyPddl(draft);
    if (res.error) setError(res.error);
    else {
      setError(null);
      setDirty(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-surface-border">
        <span className="text-xs text-slate-400">
          Problema PDDL generado ·{' '}
          <span className="font-mono">(:domain temporal-maze)</span>
        </span>
        <div className="ml-auto flex gap-2">
          {dirty && (
            <button className="btn btn-accent py-1 text-xs" onClick={apply}>
              Aplicar cambios
            </button>
          )}
          {dirty && (
            <button
              className="btn py-1 text-xs"
              onClick={() => {
                setDraft(generated);
                setDirty(false);
                setError(null);
              }}
            >
              Revertir
            </button>
          )}
          <button className="btn py-1 text-xs" onClick={copy}>
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>
      </div>
      {error && (
        <div className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border-b border-surface-border">
          {error}
        </div>
      )}
      <textarea
        spellCheck={false}
        className="flex-1 w-full bg-surface-0 text-slate-200 font-mono text-xs p-3 resize-none outline-none leading-relaxed"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
      />
    </div>
  );
}
