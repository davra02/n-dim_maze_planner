import { useMemo } from 'react';
import { useStore } from '../../state/store';
import { CELL, EDGE_COLORS, agentColor } from '../../theme';
import { coordKey, coordsEqual, higherDims } from '../../domain/coords';
import { computePlanPaths } from '../../domain/planPath';
import type { Coord } from '../../types/maze';

const S = 56; // cell size in px

interface Props {
  /** Fixed higher-dimension indices (length = dims - 2). [] for pure 2D. */
  layer: number[];
  interactive?: boolean;
}

function inSlice(coord: Coord, layer: number[]): boolean {
  const hd = higherDims(coord);
  return hd.length === layer.length && hd.every((v, i) => v === layer[i]);
}

function center(coord: Coord): { x: number; y: number } {
  const row = coord[coord.length - 2] ?? 0;
  const col = coord[coord.length - 1] ?? 0;
  return { x: col * S + S / 2, y: row * S + S / 2 };
}

export default function GridSlice({ layer, interactive = true }: Props) {
  const problem = useStore((s) => s.problem);
  const plan = useStore((s) => s.plan);
  const connectAnchor = useStore((s) => s.connectAnchor);
  const showLabels = useStore((s) => s.showLabels);
  const cellAt = useStore((s) => s.cellAt);

  const nd = problem.dimensions.length;
  const rows = problem.dimensions[nd - 2] ?? 1;
  const cols = problem.dimensions[nd - 1] ?? 1;
  const width = cols * S;
  const height = rows * S;

  const walls = useMemo(() => new Set(problem.walls), [problem.walls]);

  const paths = useMemo(
    () => (plan?.found ? computePlanPaths(problem, plan.actions) : null),
    [plan, problem],
  );

  const sliceCoord = (row: number, col: number): Coord => [...layer, row, col];

  const doorEdges = problem.doors;
  const stairEdges = problem.stairs;
  const elevatorEdges = problem.elevators;

  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
      <svg
        viewBox={`-8 -8 ${width + 16} ${height + 16}`}
        className="max-w-full max-h-full"
        style={{ width: Math.min(width + 16, 720) }}
      >
        {/* Cells */}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const coord = sliceCoord(r, c);
            const key = coordKey(coord);
            const isWall = walls.has(key);
            const onPath = paths?.highlighted.has(key);
            const isAnchor = connectAnchor && coordsEqual(connectAnchor, coord);
            return (
              <rect
                key={key}
                x={c * S + 2}
                y={r * S + 2}
                width={S - 4}
                height={S - 4}
                rx={6}
                fill={isWall ? CELL.wall : onPath ? CELL.path : CELL.free}
                stroke={isAnchor ? '#4f9cff' : isWall ? CELL.wallStroke : CELL.freeStroke}
                strokeWidth={isAnchor ? 3 : 1.5}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={interactive ? () => cellAt(coord) : undefined}
              />
            );
          }),
        )}

        {/* Plan path edges within this slice */}
        {paths?.edges
          .filter((e) => inSlice(e.a, layer) && inSlice(e.b, layer))
          .map((e, i) => {
            const p1 = center(e.a);
            const p2 = center(e.b);
            return (
              <line
                key={`pe-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={agentColor(problem.agents, e.agentId)}
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.85}
                pointerEvents="none"
              />
            );
          })}

        {/* Door / stairs / elevator connectors (in-slice) + cross-layer badges */}
        {renderConnections(doorEdges, EDGE_COLORS.door, layer, 'd')}
        {renderConnections(stairEdges, EDGE_COLORS.stairs, layer, 's')}
        {renderConnections(elevatorEdges, EDGE_COLORS.elevator, layer, 'e')}

        {/* Buttons */}
        {problem.buttons
          .filter((b) => inSlice(b.cell, layer))
          .map((b) => {
            const p = center(b.cell);
            return (
              <g key={b.id} pointerEvents="none">
                <circle cx={p.x + S / 2 - 12} cy={p.y - S / 2 + 12} r={8} fill={CELL.button} />
                {showLabels && (
                  <text x={p.x + S / 2 - 12} y={p.y - S / 2 + 15} textAnchor="middle" fontSize={8} fill="#111">
                    {b.id.replace('b', '')}
                  </text>
                )}
              </g>
            );
          })}

        {/* Agent starts and goals */}
        {problem.agents.map((a) => {
          const color = agentColor(problem.agents, a.id);
          const els: JSX.Element[] = [];
          if (inSlice(a.start, layer)) {
            const p = center(a.start);
            els.push(
              <g key={`${a.id}-start`} pointerEvents="none">
                <path
                  d={`M ${p.x - 9} ${p.y - 10} L ${p.x + 11} ${p.y} L ${p.x - 9} ${p.y + 10} Z`}
                  fill={color}
                />
                {showLabels && (
                  <text x={p.x - 2} y={p.y + 22} textAnchor="middle" fontSize={9} fill={color}>
                    {a.id}
                  </text>
                )}
              </g>,
            );
          }
          if (inSlice(a.goal, layer)) {
            const p = center(a.goal);
            els.push(
              <g key={`${a.id}-goal`} pointerEvents="none">
                <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize={22} fill={color}>
                  ★
                </text>
                {showLabels && (
                  <text x={p.x} y={p.y + 22} textAnchor="middle" fontSize={9} fill={color}>
                    {a.id}
                  </text>
                )}
              </g>,
            );
          }
          return els;
        })}

        {/* Coordinate labels */}
        {showLabels &&
          Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const coord = sliceCoord(r, c);
              if (walls.has(coordKey(coord))) return null;
              return (
                <text
                  key={`lbl-${r}-${c}`}
                  x={c * S + 6}
                  y={r * S + 14}
                  fontSize={8}
                  fill="#4a5568"
                  pointerEvents="none"
                >
                  {coord.join(',')}
                </text>
              );
            }),
          )}
      </svg>
    </div>
  );
}

/** Draw an edge inside the slice as a line, or a small directional badge when
 *  the edge leaves the current slice (cross-layer connection). */
function renderConnections(
  edges: { a: Coord; b: Coord; id?: string }[],
  color: string,
  layer: number[],
  prefix: string,
) {
  const out: JSX.Element[] = [];
  edges.forEach((e, i) => {
    const aIn = inSlice(e.a, layer);
    const bIn = inSlice(e.b, layer);
    if (aIn && bIn) {
      const p1 = center(e.a);
      const p2 = center(e.b);
      out.push(
        <line
          key={`${prefix}-${i}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={color}
          strokeWidth={3}
          strokeDasharray={prefix === 'd' ? '6 3' : undefined}
          pointerEvents="none"
        />,
      );
    } else if (aIn || bIn) {
      // Cross-layer: badge on the in-slice endpoint.
      const anchor = aIn ? e.a : e.b;
      const other = aIn ? e.b : e.a;
      const p = center(anchor);
      const otherLayer = higherDims(other).join(',');
      out.push(
        <g key={`${prefix}-x-${i}`} pointerEvents="none">
          <circle cx={p.x - S / 2 + 12} cy={p.y + S / 2 - 12} r={9} fill={color} opacity={0.9} />
          <text
            x={p.x - S / 2 + 12}
            y={p.y + S / 2 - 9}
            textAnchor="middle"
            fontSize={9}
            fill="#0b0e14"
          >
            {prefix === 's' ? '↕' : prefix === 'e' ? '⇕' : '⧉'}
          </text>
          <text x={p.x - S / 2 + 12} y={p.y + S / 2 + 4} textAnchor="middle" fontSize={7} fill={color}>
            →{otherLayer}
          </text>
        </g>,
      );
    }
  });
  return out;
}
