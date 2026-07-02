import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text, Grid } from '@react-three/drei';
import { useStore } from '../../state/store';
import { allCoords, coordKey } from '../../domain/coords';
import { computePlanPaths } from '../../domain/planPath';
import { agentColor, EDGE_COLORS } from '../../theme';
import type { Coord, MazeProblem } from '../../types/maze';

// Interactive 3D visualization (rotate / zoom via OrbitControls). Cells are
// translucent boxes; the plan path is drawn as colored lines. Best for 3D; for
// 4D+ it renders the 3D sub-volume at the current higher-dim slice.

function useGeometry(problem: MazeProblem) {
  const nd = problem.dimensions.length;
  const depth = problem.dimensions[nd - 3] ?? 1;
  const rows = problem.dimensions[nd - 2] ?? 1;
  const cols = problem.dimensions[nd - 1] ?? 1;
  return { nd, depth, rows, cols };
}

/** Map a coordinate to a 3D position (centered), or null if outside the
 *  current sub-volume defined by leading dims === layer. */
function pos3d(
  coord: Coord,
  problem: MazeProblem,
  layer: number[],
): [number, number, number] | null {
  const nd = problem.dimensions.length;
  const leading = nd - 3; // number of dims mapped to the slice selectors
  for (let i = 0; i < leading; i++) if (coord[i] !== (layer[i] ?? 0)) return null;
  const zc = coord[nd - 3] ?? 0;
  const row = coord[nd - 2] ?? 0;
  const col = coord[nd - 1] ?? 0;
  const rows = problem.dimensions[nd - 2] ?? 1;
  const cols = problem.dimensions[nd - 1] ?? 1;
  return [col - (cols - 1) / 2, zc, (rows - 1) / 2 - row];
}

function Scene() {
  const problem = useStore((s) => s.problem);
  const plan = useStore((s) => s.plan);
  const layer = useStore((s) => s.layer);
  const showLabels = useStore((s) => s.showLabels);
  const { rows, cols } = useGeometry(problem);

  const walls = useMemo(() => new Set(problem.walls), [problem.walls]);
  const paths = useMemo(
    () => (plan?.found ? computePlanPaths(problem, plan.actions) : null),
    [plan, problem],
  );

  const cells = useMemo(
    () => allCoords(problem.dimensions).map((c) => ({ c, p: pos3d(c, problem, layer) })),
    [problem, layer],
  );

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 10, 6]} intensity={0.7} />
      <Grid
        args={[cols + 2, rows + 2]}
        cellColor="#2a3444"
        sectionColor="#33465f"
        position={[0, -0.55, 0]}
        infiniteGrid={false}
      />

      {/* Cells */}
      {cells.map(({ c, p }) => {
        if (!p) return null;
        const key = coordKey(c);
        const isWall = walls.has(key);
        const onPath = paths?.highlighted.has(key);
        if (isWall) return null; // omit walls for clarity (implicit)
        return (
          <mesh key={key} position={p}>
            <boxGeometry args={[0.82, 0.82, 0.82]} />
            <meshStandardMaterial
              color={onPath ? '#3b6ea5' : '#26324a'}
              transparent
              opacity={onPath ? 0.55 : 0.22}
            />
          </mesh>
        );
      })}

      {/* Cross-layer connectors (stairs/elevators) inside sub-volume */}
      {problem.stairs.map((e, i) => {
        const a = pos3d(e.a, problem, layer);
        const b = pos3d(e.b, problem, layer);
        if (!a || !b) return null;
        return <Line key={`s${i}`} points={[a, b]} color={EDGE_COLORS.stairs} lineWidth={2} dashed />;
      })}
      {problem.elevators.map((e, i) => {
        const a = pos3d(e.a, problem, layer);
        const b = pos3d(e.b, problem, layer);
        if (!a || !b) return null;
        return <Line key={`e${i}`} points={[a, b]} color={EDGE_COLORS.elevator} lineWidth={2} />;
      })}
      {problem.doors.map((d, i) => {
        const a = pos3d(d.a, problem, layer);
        const b = pos3d(d.b, problem, layer);
        if (!a || !b) return null;
        return <Line key={`d${i}`} points={[a, b]} color={EDGE_COLORS.door} lineWidth={2} dashed />;
      })}

      {/* Plan path edges */}
      {paths?.edges.map((e, i) => {
        const a = pos3d(e.a, problem, layer);
        const b = pos3d(e.b, problem, layer);
        if (!a || !b) return null;
        return (
          <Line
            key={`pe${i}`}
            points={[a, b]}
            color={agentColor(problem.agents, e.agentId)}
            lineWidth={4}
          />
        );
      })}

      {/* Agent starts / goals */}
      {problem.agents.map((ag) => {
        const color = agentColor(problem.agents, ag.id);
        const start = pos3d(ag.start, problem, layer);
        const goal = pos3d(ag.goal, problem, layer);
        return (
          <group key={ag.id}>
            {start && (
              <mesh position={start}>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshStandardMaterial color={color} />
              </mesh>
            )}
            {goal && (
              <mesh position={goal} rotation={[0, Math.PI / 4, 0]}>
                <octahedronGeometry args={[0.28]} />
                <meshStandardMaterial color={color} wireframe />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Buttons */}
      {problem.buttons.map((b) => {
        const p = pos3d(b.cell, problem, layer);
        if (!p) return null;
        return (
          <mesh key={b.id} position={[p[0], p[1] + 0.3, p[2]]}>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
            <meshStandardMaterial color="#f2c14e" />
          </mesh>
        );
      })}

      {/* Step labels along the path */}
      {showLabels &&
        paths &&
        [...paths.byAgent.entries()].flatMap(([agId, seq]) =>
          seq.map((c, i) => {
            const p = pos3d(c, problem, layer);
            if (!p || i === 0) return null;
            return (
              <Text
                key={`${agId}-t${i}`}
                position={[p[0], p[1] + 0.5, p[2]]}
                fontSize={0.22}
                color={agentColor(problem.agents, agId)}
                anchorX="center"
              >
                {i}
              </Text>
            );
          }),
        )}
    </>
  );
}

export default function View3D() {
  const problem = useStore((s) => s.problem);
  const { depth, rows, cols } = useGeometry(problem);
  const dist = Math.max(rows, cols, depth) * 1.8 + 4;
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [dist, dist * 0.8, dist], fov: 45 }}>
        <Scene />
        <OrbitControls enableDamping makeDefault />
      </Canvas>
    </div>
  );
}
