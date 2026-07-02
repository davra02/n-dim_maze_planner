import type { MazeProblem } from '../types/maze';
import { allCoords, coordKey } from '../domain/coords';

// ---------------------------------------------------------------------------
// Bundled demo problems. Each is a plain MazeProblem; plans are computed on
// demand by the mock planner, so the app is fully functional from first load.
// ---------------------------------------------------------------------------

export interface Example {
  id: string;
  title: string;
  description: string;
  build: () => MazeProblem;
}

/** Helper: full grid of the given dimensions, minus the listed wall coords. */
function wallsExcept(dimensions: number[], wallCoords: number[][]): string[] {
  const set = new Set(wallCoords.map(coordKey));
  // Only keep walls that are inside bounds.
  return allCoords(dimensions)
    .map(coordKey)
    .filter((k) => set.has(k));
}

// (1) 2D simple maze -------------------------------------------------------
function build2DSimple(): MazeProblem {
  const dimensions = [6, 6];
  const walls = [
    [1, 1], [1, 2], [1, 3], [1, 4],
    [3, 0], [3, 1], [3, 2], [3, 4],
    [4, 4], [2, 4],
  ];
  return {
    name: 'maze-2d-simple',
    dimensions,
    agents: [{ id: 'a1', start: [0, 0], goal: [5, 5] }],
    walls: wallsExcept(dimensions, walls),
    buttons: [],
    doors: [],
    stairs: [],
    elevators: [],
  };
}

// (2) 3D with door + button + stairs ---------------------------------------
function build3DDoorButton(): MazeProblem {
  const dimensions = [3, 3, 3]; // z, row, col
  return {
    name: 'maze-3d-door-button',
    dimensions,
    agents: [{ id: 'a1', start: [0, 0, 0], goal: [1, 0, 2] }],
    // Wall the only non-door neighbor of the goal so the button-locked door
    // becomes the sole way in (forces press-button + move-through-door).
    walls: wallsExcept(dimensions, [[1, 1, 2]]),
    buttons: [{ id: 'b1', cell: [0, 2, 2], opensDoor: 'd1' }],
    // The goal cell [1,0,2] is only reachable through the (button-locked) door.
    doors: [{ id: 'd1', a: [1, 0, 1], b: [1, 0, 2], control: 'button' }],
    stairs: [
      { a: [0, 1, 1], b: [1, 1, 1] },
      { a: [1, 1, 1], b: [2, 1, 1] },
    ],
    elevators: [],
  };
}

// (3) Multi-agent 3D with elevator + timed door ----------------------------
function buildMultiAgent(): MazeProblem {
  const dimensions = [3, 3, 3];
  return {
    name: 'maze-3d-multiagent',
    dimensions,
    agents: [
      { id: 'a1', start: [0, 0, 0], goal: [2, 2, 2] },
      { id: 'a2', start: [0, 2, 2], goal: [2, 0, 0] },
    ],
    walls: [],
    buttons: [
      { id: 'b1', cell: [0, 0, 2], activatesElevator: 'e1' },
    ],
    doors: [
      // A timed door showcased on level 1 (opens at t=2, closes at t=20).
      { id: 'd1', a: [1, 1, 1], b: [1, 1, 2], control: 'timed', timedWindows: [{ open: 2, close: 20 }] },
    ],
    stairs: [
      { a: [0, 0, 0], b: [1, 0, 0] },
      { a: [1, 0, 0], b: [2, 0, 0] },
    ],
    elevators: [{ id: 'e1', a: [0, 2, 2], b: [2, 2, 2] }],
  };
}

// (4) 4D visualized by slices ----------------------------------------------
function build4DSlices(): MazeProblem {
  const dimensions = [2, 2, 3, 3]; // w, x, y, z  (editable plane = y, z)
  return {
    name: 'maze-4d-slices',
    dimensions,
    agents: [{ id: 'a1', start: [0, 0, 0, 0], goal: [1, 1, 2, 2] }],
    walls: [],
    buttons: [
      { id: 'b1', cell: [0, 0, 0, 1], opensDoor: 'd1' },
      { id: 'b2', cell: [0, 0, 1, 0], activatesElevator: 'e1' },
    ],
    doors: [
      { id: 'd1', a: [1, 1, 0, 0], b: [1, 1, 0, 1], control: 'button' },
    ],
    // Cross-layer connections: x-transition then w-transition to reach goal.
    stairs: [
      { a: [0, 0, 2, 2], b: [0, 1, 2, 2] }, // x: 0 -> 1
      { a: [0, 1, 2, 2], b: [1, 1, 2, 2] }, // w: 0 -> 1
    ],
    elevators: [{ id: 'e1', a: [0, 0, 1, 1], b: [0, 1, 1, 1] }],
  };
}

export const examples: Example[] = [
  {
    id: '2d-simple',
    title: 'Laberinto 2D simple',
    description: 'Rejilla 6×6 con paredes. Un agente, solo movimientos libres. Vista: grid.',
    build: build2DSimple,
  },
  {
    id: '3d-door-button',
    title: 'Laberinto 3D con puerta y botón',
    description: 'Meta accesible solo tras pulsar un botón que abre una puerta. Escaleras entre niveles. Vista: 3D.',
    build: build3DDoorButton,
  },
  {
    id: '3d-multiagent',
    title: 'Problema multiagente 3D',
    description: 'Dos agentes, ascensor activado por botón y puerta temporal. Vista: 3D.',
    build: buildMultiAgent,
  },
  {
    id: '4d-slices',
    title: 'Problema 4D por slices',
    description: 'Laberinto 4D (w,x,y,z). Se recorre por cortes 2D + grafo. Vista: slices + grafo.',
    build: build4DSlices,
  },
];

export const defaultExampleId = '2d-simple';

export function getExample(id: string): Example {
  return examples.find((e) => e.id === id) ?? examples[0];
}
