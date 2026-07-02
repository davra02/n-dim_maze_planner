import type { Coord } from '../types/maze';

// ---------------------------------------------------------------------------
// Coordinate <-> cell-id helpers.
//
// We always emit the underscore-separated naming convention, which is safe for
// indices >= 10 and uniform across dimensions:
//   2D -> c<r>_<c>            e.g. c0_2
//   3D -> c<z>_<r>_<c>        e.g. c1_0_2
//   4D -> c<w>_<x>_<y>_<z>    e.g. c0_1_2_3
// ---------------------------------------------------------------------------

/** Stable string key for a coordinate, used in Sets/Maps. */
export function coordKey(coord: Coord): string {
  return coord.join(',');
}

export function keyToCoord(key: string): Coord {
  return key.split(',').map(Number);
}

/** PDDL cell id for a coordinate, e.g. [1,0,2] -> "c1_0_2". */
export function cellId(coord: Coord): string {
  return 'c' + coord.join('_');
}

/** Parse a PDDL cell id back into a coordinate.
 *  Handles underscore form ("c1_0_2") and legacy compact form ("c102"). */
export function parseCellId(id: string): Coord | null {
  const body = id.startsWith('c') ? id.slice(1) : id;
  if (body.length === 0) return null;
  if (body.includes('_')) {
    const parts = body.split('_').map(Number);
    return parts.every((n) => Number.isFinite(n)) ? parts : null;
  }
  // Compact legacy form: one digit per dimension.
  const digits = body.split('').map(Number);
  return digits.every((n) => Number.isFinite(n)) ? digits : null;
}

export function coordsEqual(a: Coord, b: Coord): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Human label for a coordinate, e.g. [1,0,2] -> "1,0,2". */
export function coordLabel(coord: Coord): string {
  return coord.join(',');
}

/** Iterate all coordinates of a grid of the given per-dimension sizes. */
export function allCoords(dimensions: number[]): Coord[] {
  const out: Coord[] = [];
  const rec = (prefix: number[], dim: number) => {
    if (dim === dimensions.length) {
      out.push([...prefix]);
      return;
    }
    for (let i = 0; i < dimensions[dim]; i++) {
      prefix.push(i);
      rec(prefix, dim + 1);
      prefix.pop();
    }
  };
  rec([], 0);
  return out;
}

/** The last two coordinates are the editable grid plane: [row, col]. */
export function planeOf(coord: Coord): { row: number; col: number } {
  return { row: coord[coord.length - 2] ?? 0, col: coord[coord.length - 1] ?? 0 };
}

/** Higher dimensions (everything before the row/col plane). */
export function higherDims(coord: Coord): number[] {
  return coord.slice(0, Math.max(0, coord.length - 2));
}
