import type { MazeProblem, Coord } from '../types/maze';
import { coordKey, higherDims, planeOf } from './coords';

// ---------------------------------------------------------------------------
// Adjacency is DERIVED, not stored. Two cells are adjacent when:
//   - both are free (not walls),
//   - they share the same higher dimensions (same z/w layer),
//   - they differ by exactly 1 in exactly one of the last two coords
//     (the editable row/col plane), and
//   - no door connects them (a door replaces the free edge).
//
// Vertical travel between layers is expressed only via stairs / elevators.
// ---------------------------------------------------------------------------

function unorderedPairKey(a: Coord, b: Coord): string {
  const ka = coordKey(a);
  const kb = coordKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/** Set of unordered cell-pair keys that are linked by a door. */
export function doorPairSet(problem: MazeProblem): Set<string> {
  const s = new Set<string>();
  for (const d of problem.doors) s.add(unorderedPairKey(d.a, d.b));
  return s;
}

export interface DerivedEdge {
  a: Coord;
  b: Coord;
}

/** All undirected adjacency edges between free neighboring cells. */
export function deriveAdjacency(problem: MazeProblem): DerivedEdge[] {
  const walls = new Set(problem.walls);
  const doors = doorPairSet(problem);
  const dims = problem.dimensions;
  const edges: DerivedEdge[] = [];
  const seen = new Set<string>();

  const isFree = (c: Coord) => !walls.has(coordKey(c));
  const inBounds = (c: Coord) => c.every((v, i) => v >= 0 && v < dims[i]);

  // Only step in the last two dimensions (the grid plane).
  const planeAxes = dims.length >= 2 ? [dims.length - 2, dims.length - 1] : [dims.length - 1];

  const rec = (prefix: number[], dim: number) => {
    if (dim === dims.length) {
      const c = [...prefix];
      if (!isFree(c)) return;
      for (const axis of planeAxes) {
        const nb = [...c];
        nb[axis] += 1;
        if (!inBounds(nb) || !isFree(nb)) continue;
        const pk = unorderedPairKey(c, nb);
        if (doors.has(pk) || seen.has(pk)) continue;
        seen.add(pk);
        edges.push({ a: c, b: nb });
      }
      return;
    }
    for (let i = 0; i < dims[dim]; i++) {
      prefix.push(i);
      rec(prefix, dim + 1);
      prefix.pop();
    }
  };
  rec([], 0);
  return edges;
}

/** Adjacency for a single 2D slice (fixed higher dims), used by the editor. */
export function sliceNeighbors(problem: MazeProblem, coord: Coord): Coord[] {
  return deriveAdjacency(problem)
    .flatMap((e) => [
      { self: e.a, other: e.b },
      { self: e.b, other: e.a },
    ])
    .filter(
      (p) =>
        coordKey(p.self) === coordKey(coord) &&
        higherDims(p.self).join(',') === higherDims(coord).join(','),
    )
    .map((p) => p.other);
}

// Re-export small helpers used by callers building slices.
export { planeOf };
