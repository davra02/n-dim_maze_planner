import { create } from 'zustand';
import type {
  MazeProblem,
  ToolKind,
  VizMode,
  Selection,
  Coord,
  Agent,
  Door,
  Button,
  Elevator,
} from '../types/maze';
import type { PlanResult } from '../types/plan';
import { coordKey, coordsEqual, higherDims, allCoords } from '../domain/coords';
import { getExample, defaultExampleId } from '../data/examples';
import { mockPlanner } from '../services/mockPlanner';
import { generatePddl } from '../domain/pddlGenerator';
import { parsePddl } from '../domain/pddlParser';

// Recommend a visualization from the number of dimensions.
export function recommendViz(dimensions: number[]): VizMode {
  const n = dimensions.length;
  if (n <= 2) return 'grid';
  if (n === 3) return '3d';
  return 'slices';
}

function nextId(prefix: string, existing: string[]): string {
  let i = 1;
  const set = new Set(existing);
  while (set.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

interface MazeState {
  problem: MazeProblem;
  tool: ToolKind;
  selection: Selection;
  activeAgentId: string;
  /** Fixed higher-dimension indices (length = dims - 2). */
  layer: number[];
  viz: VizMode;
  /** Second-click anchor for two-cell connections (door/stairs/elevator). */
  connectAnchor: Coord | null;

  plan: PlanResult | null;
  planning: boolean;
  bottomTab: 'pddl' | 'plan' | 'stats';
  showLabels: boolean;

  // ---- actions ----
  setTool: (t: ToolKind) => void;
  setSelection: (s: Selection) => void;
  setActiveAgent: (id: string) => void;
  setLayer: (layer: number[]) => void;
  setLayerAt: (dim: number, value: number) => void;
  setViz: (v: VizMode) => void;
  setBottomTab: (t: 'pddl' | 'plan' | 'stats') => void;
  toggleLabels: () => void;

  loadExample: (id: string) => void;
  newProblem: (opts: { name: string; dimensions: number[]; agents: number }) => void;
  applyPddl: (text: string) => { error?: string };

  cellAt: (coord: Coord) => void; // apply active tool at a coord

  updateAgent: (id: string, patch: Partial<Agent>) => void;
  addAgent: () => void;
  removeAgent: (id: string) => void;
  updateDoor: (id: string, patch: Partial<Door>) => void;
  removeDoor: (id: string) => void;
  updateButton: (id: string, patch: Partial<Button>) => void;
  removeButton: (id: string) => void;
  updateElevator: (id: string, patch: Partial<Elevator>) => void;
  removeElevator: (id: string) => void;
  removeStairs: (index: number) => void;

  runPlanner: () => Promise<void>;
  getPddl: () => string;
}

function initialProblem(): MazeProblem {
  return getExample(defaultExampleId).build();
}

export const useStore = create<MazeState>((set, get) => ({
  problem: initialProblem(),
  tool: 'select',
  selection: null,
  activeAgentId: 'a1',
  layer: new Array(Math.max(0, initialProblem().dimensions.length - 2)).fill(0),
  viz: recommendViz(initialProblem().dimensions),
  connectAnchor: null,
  plan: null,
  planning: false,
  bottomTab: 'pddl',
  showLabels: true,

  setTool: (t) => set({ tool: t, connectAnchor: null }),
  setSelection: (s) => set({ selection: s }),
  setActiveAgent: (id) => set({ activeAgentId: id }),
  setLayer: (layer) => set({ layer }),
  setLayerAt: (dim, value) =>
    set((st) => {
      const layer = [...st.layer];
      layer[dim] = value;
      return { layer };
    }),
  setViz: (v) => set({ viz: v }),
  setBottomTab: (t) => set({ bottomTab: t }),
  toggleLabels: () => set((st) => ({ showLabels: !st.showLabels })),

  loadExample: (id) => {
    const problem = getExample(id).build();
    set({
      problem,
      plan: null,
      selection: null,
      connectAnchor: null,
      activeAgentId: problem.agents[0]?.id ?? 'a1',
      layer: new Array(Math.max(0, problem.dimensions.length - 2)).fill(0),
      viz: recommendViz(problem.dimensions),
    });
  },

  newProblem: ({ name, dimensions, agents }) => {
    const agentList: Agent[] = [];
    const zero = new Array(dimensions.length).fill(0);
    const last = dimensions.map((d) => d - 1);
    for (let i = 0; i < agents; i++) {
      agentList.push({
        id: `a${i + 1}`,
        start: i === 0 ? [...zero] : [...zero],
        goal: i === 0 ? [...last] : [...last],
      });
    }
    const problem: MazeProblem = {
      name: name || 'nuevo-problema',
      dimensions,
      agents: agentList,
      walls: [],
      buttons: [],
      doors: [],
      stairs: [],
      elevators: [],
    };
    set({
      problem,
      plan: null,
      selection: null,
      connectAnchor: null,
      activeAgentId: 'a1',
      layer: new Array(Math.max(0, dimensions.length - 2)).fill(0),
      viz: recommendViz(dimensions),
    });
  },

  applyPddl: (text) => {
    const res = parsePddl(text);
    if (res.error || !res.problem) return { error: res.error ?? 'Error de parseo' };
    const problem = res.problem;
    set({
      problem,
      plan: null,
      selection: null,
      connectAnchor: null,
      activeAgentId: problem.agents[0]?.id ?? 'a1',
      layer: new Array(Math.max(0, problem.dimensions.length - 2)).fill(0),
      viz: recommendViz(problem.dimensions),
    });
    return {};
  },

  cellAt: (coord) => {
    const st = get();
    const { tool, problem } = st;
    const key = coordKey(coord);
    const isWall = problem.walls.includes(key);

    const commit = (p: MazeProblem, extra: Partial<MazeState> = {}) =>
      set({ problem: p, plan: null, ...extra });

    switch (tool) {
      case 'select': {
        // Select whatever occupies this cell (priority: button > agent > cell).
        const btn = problem.buttons.find((b) => coordsEqual(b.cell, coord));
        if (btn) return set({ selection: { kind: 'button', id: btn.id } });
        const ag = problem.agents.find(
          (a) => coordsEqual(a.start, coord) || coordsEqual(a.goal, coord),
        );
        if (ag) return set({ selection: { kind: 'agent', id: ag.id } });
        return set({ selection: { kind: 'cell', coord } });
      }
      case 'wall': {
        if (isWall) return;
        const walls = [...problem.walls, key];
        // Remove any button sitting on a now-blocked cell.
        const buttons = problem.buttons.filter((b) => !coordsEqual(b.cell, coord));
        return commit({ ...problem, walls, buttons });
      }
      case 'free': {
        if (!isWall) return;
        return commit({ ...problem, walls: problem.walls.filter((k) => k !== key) });
      }
      case 'start': {
        if (isWall) return;
        return commit({
          ...problem,
          agents: problem.agents.map((a) =>
            a.id === st.activeAgentId ? { ...a, start: [...coord] } : a,
          ),
        });
      }
      case 'goal': {
        if (isWall) return;
        return commit({
          ...problem,
          agents: problem.agents.map((a) =>
            a.id === st.activeAgentId ? { ...a, goal: [...coord] } : a,
          ),
        });
      }
      case 'button': {
        if (isWall) return;
        if (problem.buttons.some((b) => coordsEqual(b.cell, coord))) return;
        const id = nextId('b', problem.buttons.map((b) => b.id));
        const buttons = [...problem.buttons, { id, cell: [...coord] }];
        return commit({ ...problem, buttons }, { selection: { kind: 'button', id } });
      }
      case 'door':
      case 'stairs':
      case 'elevator': {
        if (isWall) return;
        const anchor = st.connectAnchor;
        if (!anchor) {
          return set({ connectAnchor: [...coord] });
        }
        if (coordsEqual(anchor, coord)) {
          return set({ connectAnchor: null });
        }
        if (tool === 'door') {
          const id = nextId('d', problem.doors.map((d) => d.id));
          const doors = [...problem.doors, { id, a: [...anchor], b: [...coord], control: 'none' as const }];
          return commit({ ...problem, doors }, { connectAnchor: null, selection: { kind: 'door', id } });
        }
        if (tool === 'stairs') {
          const stairs = [...problem.stairs, { a: [...anchor], b: [...coord] }];
          return commit(
            { ...problem, stairs },
            { connectAnchor: null, selection: { kind: 'stairs', index: stairs.length - 1 } },
          );
        }
        // elevator
        const id = nextId('e', problem.elevators.map((e) => e.id));
        const elevators = [...problem.elevators, { id, a: [...anchor], b: [...coord] }];
        return commit({ ...problem, elevators }, { connectAnchor: null, selection: { kind: 'elevator', id } });
      }
    }
  },

  updateAgent: (id, patch) =>
    set((st) => ({
      problem: {
        ...st.problem,
        agents: st.problem.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      },
      plan: null,
    })),
  addAgent: () =>
    set((st) => {
      const id = nextId('a', st.problem.agents.map((a) => a.id));
      const zero = new Array(st.problem.dimensions.length).fill(0);
      const agents = [...st.problem.agents, { id, start: [...zero], goal: st.problem.dimensions.map((d) => d - 1) }];
      return { problem: { ...st.problem, agents }, activeAgentId: id, plan: null };
    }),
  removeAgent: (id) =>
    set((st) => {
      if (st.problem.agents.length <= 1) return {};
      const agents = st.problem.agents.filter((a) => a.id !== id);
      return {
        problem: { ...st.problem, agents },
        activeAgentId: agents[0].id,
        selection: null,
        plan: null,
      };
    }),

  updateDoor: (id, patch) =>
    set((st) => ({
      problem: {
        ...st.problem,
        doors: st.problem.doors.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      },
      plan: null,
    })),
  removeDoor: (id) =>
    set((st) => ({
      problem: {
        ...st.problem,
        doors: st.problem.doors.filter((d) => d.id !== id),
        buttons: st.problem.buttons.map((b) =>
          b.opensDoor === id ? { ...b, opensDoor: undefined } : b,
        ),
      },
      selection: null,
      plan: null,
    })),
  updateButton: (id, patch) =>
    set((st) => ({
      problem: {
        ...st.problem,
        buttons: st.problem.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      },
      plan: null,
    })),
  removeButton: (id) =>
    set((st) => ({
      problem: { ...st.problem, buttons: st.problem.buttons.filter((b) => b.id !== id) },
      selection: null,
      plan: null,
    })),
  updateElevator: (id, patch) =>
    set((st) => ({
      problem: {
        ...st.problem,
        elevators: st.problem.elevators.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
      plan: null,
    })),
  removeElevator: (id) =>
    set((st) => ({
      problem: {
        ...st.problem,
        elevators: st.problem.elevators.filter((e) => e.id !== id),
        buttons: st.problem.buttons.map((b) =>
          b.activatesElevator === id ? { ...b, activatesElevator: undefined } : b,
        ),
      },
      selection: null,
      plan: null,
    })),
  removeStairs: (index) =>
    set((st) => ({
      problem: { ...st.problem, stairs: st.problem.stairs.filter((_, i) => i !== index) },
      selection: null,
      plan: null,
    })),

  runPlanner: async () => {
    set({ planning: true });
    try {
      const result = await mockPlanner.solve(get().problem);
      set({ plan: result, planning: false, bottomTab: 'plan' });
    } catch (e) {
      set({
        planning: false,
        plan: {
          found: false,
          actions: [],
          raw: '',
          note: e instanceof Error ? e.message : 'Error del planificador',
          stats: { found: false, actions: 0, makespan: 0 },
        },
      });
    }
  },

  getPddl: () => generatePddl(get().problem),
}));

// Convenience selectors used across components.
export function cellsInCurrentSlice(problem: MazeProblem, layer: number[]): Coord[] {
  return allCoords(problem.dimensions).filter((c) => {
    const hd = higherDims(c);
    return hd.every((v, i) => v === (layer[i] ?? 0));
  });
}
