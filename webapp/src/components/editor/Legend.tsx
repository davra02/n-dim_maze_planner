import { LEGEND } from '../../theme';

export default function Legend() {
  return (
    <div className="panel">
      <div className="panel-header">Leyenda</div>
      <div className="p-3 grid grid-cols-1 gap-1.5 text-sm">
        {LEGEND.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px]"
              style={{
                background: item.glyph ? 'transparent' : item.color,
                color: item.color,
                border: item.glyph ? 'none' : '1px solid #2a3444',
              }}
            >
              {item.glyph ?? ''}
            </span>
            <span className="text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
