import { useMemo } from 'react';
import { useStore } from '../../state/store';
import { deriveAdjacency } from '../../domain/adjacency';
import { allCoords, coordKey, higherDims, coordsEqual } from '../../domain/coords';
import { computePlanPaths } from '../../domain/planPath';
import { EDGE_COLORS, CELL, agentColor } from '../../theme';
import type { Coord, MazeProblem } from '../../types/maze';

// Graph view: nodes are cells, edges are typed connections. Cells are grouped
// into blocks by their higher dimensions (one block per z / (w,x) layer), so
// the alternative view scales to any dimensionality.

const STEP = 44;
const GAP = 40;
const R = 12;

interface Layout {
  pos: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
  blocks: { key: string; x: number; y: number; label: string }[];
}

function buildLayout(problem: MazeProblem): Layout {
  const nd = problem.dimensions.length;
  const rows = problem.dimensions[nd - 2] ?? 1;
  const cols = problem.dimensions[nd - 1] ?? 1;
  const walls = new Set(problem.walls);

  const groups = new Map<string, Coord[]>();
  for (const c of allCoords(problem.dimensions)) {
    if (walls.has(coordKey(c))) continue;
    const hk = higherDims(c).join(',');
    (groups.get(hk) ?? groups.set(hk, []).get(hk)!).push(c);
  }
  const keys = [...groups.keys()].sort();
  const perRow = Math.ceil(Math.sqrt(keys.length));
  const blockW = cols * STEP + GAP;
  const blockH = rows * STEP + GAP + 18;

  const pos = new Map<string, { x: number; y: number }>();
  const blocks: Layout['blocks'] = [];
  keys.forEach((hk, gi) => {
    const bc = gi % perRow;
    const br = Math.floor(gi / perRow);
    const ox = bc * blockW + GAP;
    const oy = br * blockH + GAP + 18;
    blocks.push({ key: hk, x: ox, y: oy - 22, label: hk === '' ? '2D' : `capa ${hk}` });
    for (const c of groups.get(hk)!) {
      const row = c[nd - 2] ?? 0;
      const col = c[nd - 1] ?? 0;
      pos.set(coordKey(c), { x: ox + col * STEP, y: oy + row * STEP });
    }
  });

  const width = perRow * blockW + GAP;
  const height = Math.ceil(keys.length / perRow) * blockH + GAP;
  return { pos, width, height, blocks };
}

export default function GraphView() {
  const problem = useStore((s) => s.problem);
  const plan = useStore((s) => s.plan);
  const showLabels = useStore((s) => s.showLabels);
  const cellAt = useStore((s) => s.cellAt);
  const tool = useStore((s) => s.tool);

  const layout = useMemo(() => buildLayout(problem), [problem]);
  const adjacency = useMemo(() => deriveAdjacency(problem), [problem]);
  const paths = useMemo(
    () => (plan?.found ? computePlanPaths(problem, plan.actions) : null),
    [plan, problem],
  );

  const line = (a: Coord, b: Coord, color: string, key: string, dashed = false, w = 1.5) => {
    const pa = layout.pos.get(coordKey(a));
    const pb = layout.pos.get(coordKey(b));
    if (!pa || !pb) return null;
    return (
      <line
        key={key}
        x1={pa.x}
        y1={pa.y}
        x2={pb.x}
        y2={pb.y}
        stroke={color}
        strokeWidth={w}
        strokeDasharray={dashed ? '5 3' : undefined}
        opacity={0.85}
      />
    );
  };

  return (
    <div className="w-full h-full overflow-auto p-4">
      <svg width={layout.width} height={layout.height} className="min-w-full">
        {/* Block labels */}
        {layout.blocks.map((b) => (
          <text key={b.key} x={b.x} y={b.y} fontSize={11} fill="#64748b" fontFamily="monospace">
            {b.label}
          </text>
        ))}

        {/* Edges */}
        {adjacency.map((e, i) => line(e.a, e.b, EDGE_COLORS.adjacent, `adj${i}`))}
        {problem.stairs.map((e, i) => line(e.a, e.b, EDGE_COLORS.stairs, `st${i}`, true, 2))}
        {problem.elevators.map((e, i) => line(e.a, e.b, EDGE_COLORS.elevator, `el${i}`, false, 2))}
        {problem.doors.map((e, i) => line(e.a, e.b, EDGE_COLORS.door, `dr${i}`, true, 2))}
        {paths?.edges.map((e, i) =>
          line(e.a, e.b, agentColor(problem.agents, e.agentId), `pe${i}`, false, 4),
        )}

        {/* Nodes */}
        {[...layout.pos.entries()].map(([key, p]) => {
          const coord = key.split(',').map(Number);
          const isStart = problem.agents.find((a) => coordsEqual(a.start, coord));
          const isGoal = problem.agents.find((a) => coordsEqual(a.goal, coord));
          const isButton = problem.buttons.find((b) => coordsEqual(b.cell, coord));
          const onPath = paths?.highlighted.has(key);
          const fill = isStart
            ? agentColor(problem.agents, isStart.id)
            : isGoal
              ? agentColor(problem.agents, isGoal.id)
              : isButton
                ? CELL.button
                : onPath
                  ? CELL.path
                  : CELL.free;
          return (
            <g key={key} onClick={() => tool === 'select' && cellAt(coord)} style={{ cursor: 'pointer' }}>
              <circle
                cx={p.x}
                cy={p.y}
                r={R}
                fill={fill}
                stroke={isGoal ? '#fff' : CELL.freeStroke}
                strokeWidth={isGoal ? 2 : 1}
              />
              {isStart && (
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fill="#0b0e14">
                  ▶
                </text>
              )}
              {isGoal && !isStart && (
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fill="#0b0e14">
                  ★
                </text>
              )}
              {showLabels && (
                <text x={p.x} y={p.y - R - 3} textAnchor="middle" fontSize={8} fill="#64748b">
                  {coord.join(',')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
