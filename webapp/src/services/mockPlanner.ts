import type { MazeProblem, Coord } from '../types/maze';
import type { PlanAction, PlanResult, ActionType } from '../types/plan';
import { cellId, coordKey } from '../domain/coords';
import { deriveAdjacency } from '../domain/adjacency';
import type { PlannerService } from './plannerService';
import { makespanOf, round3, serializePlan } from './planParse';

// ---------------------------------------------------------------------------
// In-browser best-effort planner. This is a *mock* stand-in for OPTIC: it runs
// a Dijkstra over an expanded state space (cell + set of pressed buttons) per
// agent, honouring the domain action costs:
//   move / move-through-door / take-elevator / press-button / activate = 1
//   take-stairs = 3
// Timed doors are treated as openable (the mock does not simulate the clock).
// Agents are solved independently (the domain has no collision constraints).
//
// It emits a valid OPTIC-style `.out` plan and stats matching stats.json.
// ---------------------------------------------------------------------------

const DUR: Record<ActionType, number> = {
  move: 1,
  'move-through-door': 1,
  'press-button': 1,
  'activate-elevator': 1,
  'take-stairs': 3,
  'take-elevator': 1,
};

interface Graph {
  adjacent: Map<string, string[]>; // cellKey -> neighbor cellKeys (move)
  doors: Map<string, { to: string; door: string }[]>; // cellKey -> door edges
  stairs: Map<string, string[]>; // cellKey -> neighbor cellKeys (take-stairs)
  elevators: Map<string, { to: string; elevator: string }[]>;
  buttonsAt: Map<string, { id: string; opensDoor?: string; activatesElevator?: string }[]>;
  timedDoors: Set<string>; // door ids treated as passable
}

function buildGraph(problem: MazeProblem): Graph {
  const adjacent = new Map<string, string[]>();
  const doors = new Map<string, { to: string; door: string }[]>();
  const stairs = new Map<string, string[]>();
  const elevators = new Map<string, { to: string; elevator: string }[]>();
  const buttonsAt = new Map<string, { id: string; opensDoor?: string; activatesElevator?: string }[]>();
  const timedDoors = new Set<string>();

  const addTo = <T>(m: Map<string, T[]>, k: string, v: T) => {
    const arr = m.get(k) ?? [];
    arr.push(v);
    m.set(k, arr);
  };

  for (const e of deriveAdjacency(problem)) {
    const a = coordKey(e.a);
    const b = coordKey(e.b);
    addTo(adjacent, a, b);
    addTo(adjacent, b, a);
  }
  for (const d of problem.doors) {
    const a = coordKey(d.a);
    const b = coordKey(d.b);
    addTo(doors, a, { to: b, door: d.id });
    addTo(doors, b, { to: a, door: d.id });
    if (d.control === 'timed' || d.control === 'both') timedDoors.add(d.id);
  }
  for (const s of problem.stairs) {
    const a = coordKey(s.a);
    const b = coordKey(s.b);
    addTo(stairs, a, b);
    addTo(stairs, b, a);
  }
  for (const el of problem.elevators) {
    const a = coordKey(el.a);
    const b = coordKey(el.b);
    addTo(elevators, a, { to: b, elevator: el.id });
    addTo(elevators, b, { to: a, elevator: el.id });
  }
  for (const b of problem.buttons) {
    addTo(buttonsAt, coordKey(b.cell), {
      id: b.id,
      opensDoor: b.opensDoor,
      activatesElevator: b.activatesElevator,
    });
  }
  return { adjacent, doors, stairs, elevators, buttonsAt, timedDoors };
}

interface SearchState {
  cell: string; // coordKey
  pressed: string; // sorted button ids, comma-joined
}

interface Step {
  type: ActionType;
  fromKey: string;
  toKey?: string;
  door?: string;
  elevator?: string;
  button?: string;
}

/** Dijkstra from start coord to goal coord. `steps` is null when unreachable. */
function search(
  g: Graph,
  start: Coord,
  goal: Coord,
): { steps: Step[] | null; expanded: number } {
  const startKey = coordKey(start);
  const goalKey = coordKey(goal);
  const stateKey = (s: SearchState) => `${s.cell}#${s.pressed}`;

  const dist = new Map<string, number>();
  const prev = new Map<string, { state: string; step: Step }>();
  // Simple array-based priority queue (problem sizes are small).
  const pq: { cost: number; state: SearchState }[] = [];
  const push = (cost: number, state: SearchState) => {
    pq.push({ cost, state });
    // keep sorted ascending by cost (small N, cheap)
    pq.sort((a, b) => a.cost - b.cost);
  };

  const init: SearchState = { cell: startKey, pressed: '' };
  dist.set(stateKey(init), 0);
  push(0, init);
  let expanded = 0;
  const MAX_EXPANSIONS = 200000;

  const pressedSet = (p: string) => new Set(p ? p.split(',') : []);
  const withButton = (p: string, id: string) => {
    const set = pressedSet(p);
    set.add(id);
    return [...set].sort().join(',');
  };
  const doorOpen = (door: string, p: string) =>
    g.timedDoors.has(door) ||
    [...pressedSet(p)].some((bid) => buttonOpensDoor(g, bid, door));
  const elevActive = (elevator: string, p: string) =>
    [...pressedSet(p)].some((bid) => buttonActivatesElevator(g, bid, elevator));

  while (pq.length) {
    const { cost, state } = pq.shift()!;
    const sk = stateKey(state);
    if (cost > (dist.get(sk) ?? Infinity)) continue;
    expanded++;
    if (expanded > MAX_EXPANSIONS) break;

    if (state.cell === goalKey) {
      // Reconstruct.
      const steps: Step[] = [];
      let cur = sk;
      while (prev.has(cur)) {
        const p = prev.get(cur)!;
        steps.push(p.step);
        cur = p.state;
      }
      steps.reverse();
      return { steps, expanded };
    }


    const relax = (nCost: number, nState: SearchState, step: Step) => {
      const nk = stateKey(nState);
      if (nCost < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nCost);
        prev.set(nk, { state: sk, step });
        push(nCost, nState);
      }
    };

    // move
    for (const nb of g.adjacent.get(state.cell) ?? []) {
      relax(cost + DUR.move, { cell: nb, pressed: state.pressed }, {
        type: 'move',
        fromKey: state.cell,
        toKey: nb,
      });
    }
    // move-through-door
    for (const de of g.doors.get(state.cell) ?? []) {
      if (!doorOpen(de.door, state.pressed)) continue;
      relax(cost + DUR['move-through-door'], { cell: de.to, pressed: state.pressed }, {
        type: 'move-through-door',
        fromKey: state.cell,
        toKey: de.to,
        door: de.door,
      });
    }
    // take-stairs
    for (const nb of g.stairs.get(state.cell) ?? []) {
      relax(cost + DUR['take-stairs'], { cell: nb, pressed: state.pressed }, {
        type: 'take-stairs',
        fromKey: state.cell,
        toKey: nb,
      });
    }
    // take-elevator
    for (const ee of g.elevators.get(state.cell) ?? []) {
      if (!elevActive(ee.elevator, state.pressed)) continue;
      relax(cost + DUR['take-elevator'], { cell: ee.to, pressed: state.pressed }, {
        type: 'take-elevator',
        fromKey: state.cell,
        toKey: ee.to,
        elevator: ee.elevator,
      });
    }
    // press-button / activate-elevator (only if not already pressed)
    for (const b of g.buttonsAt.get(state.cell) ?? []) {
      if (pressedSet(state.pressed).has(b.id)) continue;
      const nPressed = withButton(state.pressed, b.id);
      if (b.opensDoor) {
        relax(cost + DUR['press-button'], { cell: state.cell, pressed: nPressed }, {
          type: 'press-button',
          fromKey: state.cell,
          door: b.opensDoor,
          button: b.id,
        });
      }
      if (b.activatesElevator) {
        relax(cost + DUR['activate-elevator'], { cell: state.cell, pressed: nPressed }, {
          type: 'activate-elevator',
          fromKey: state.cell,
          elevator: b.activatesElevator,
          button: b.id,
        });
      }
    }
  }
  return { steps: null, expanded };
}

function buttonOpensDoor(g: Graph, buttonId: string, door: string): boolean {
  for (const arr of g.buttonsAt.values())
    for (const b of arr) if (b.id === buttonId && b.opensDoor === door) return true;
  return false;
}
function buttonActivatesElevator(g: Graph, buttonId: string, elevator: string): boolean {
  for (const arr of g.buttonsAt.values())
    for (const b of arr) if (b.id === buttonId && b.activatesElevator === elevator) return true;
  return false;
}

const EPS = 0.001; // OPTIC-style epsilon between sequential actions.

/** Schedule an agent's steps on its own clock (t0 = 0), OPTIC-style. */
function scheduleAgent(agent: string, steps: Step[]): PlanAction[] {
  const out: PlanAction[] = [];
  let t = 0;
  for (const s of steps) {
    const duration = DUR[s.type];
    const start = round3(t);
    const from = s.fromKey ? cellId(s.fromKey.split(',').map(Number)) : undefined;
    const to = s.toKey ? cellId(s.toKey.split(',').map(Number)) : undefined;
    const parts: string[] = [s.type, agent];
    switch (s.type) {
      case 'move':
      case 'take-stairs':
        parts.push(from!, to!);
        break;
      case 'move-through-door':
        parts.push(from!, to!, s.door!);
        break;
      case 'take-elevator':
        parts.push(from!, to!, s.elevator!);
        break;
      case 'press-button':
        parts.push(s.button!, s.door!, from!);
        break;
      case 'activate-elevator':
        parts.push(s.button!, s.elevator!, from!);
        break;
    }
    const raw = `${start.toFixed(3)}: (${parts.join(' ')}) [${duration.toFixed(3)}]`;
    out.push({
      start,
      duration,
      type: s.type,
      agent,
      from,
      to,
      cell: s.type === 'press-button' || s.type === 'activate-elevator' ? from : undefined,
      door: s.door,
      elevator: s.elevator,
      button: s.button,
      raw,
    });
    t = round3(t + duration + EPS);
  }
  return out;
}

export const mockPlanner: PlannerService = {
  label: 'Mock planner (in-browser)',
  async solve(problem: MazeProblem): Promise<PlanResult> {
    const t0 = performance.now();
    const g = buildGraph(problem);

    const all: PlanAction[] = [];
    let totalExpanded = 0;
    for (const agent of problem.agents) {
      const res = search(g, agent.start, agent.goal);
      totalExpanded += res.expanded;
      if (!res.steps) {
        const wall = (performance.now() - t0) / 1000;
        return {
          found: false,
          actions: [],
          raw: '',
          note: `Sin plan: el agente ${agent.id} no puede alcanzar su meta con las conexiones actuales.`,
          stats: {
            found: false,
            actions: 0,
            makespan: 0,
            statesEvaluated: totalExpanded,
            wallSeconds: round3(wall),
            returnCode: 1,
          },
        };
      }
      all.push(...scheduleAgent(agent.id, res.steps));
    }

    all.sort((a, b) => a.start - b.start || a.agent.localeCompare(b.agent));
    const raw = serializePlan(all);
    const cost = all.reduce((s, a) => s + DUR[a.type], 0);
    const wall = (performance.now() - t0) / 1000;

    return {
      found: true,
      actions: all,
      raw,
      stats: {
        found: true,
        actions: all.length,
        makespan: round3(makespanOf(all)),
        cost,
        metric: cost,
        statesEvaluated: totalExpanded,
        plannerTimeSeconds: round3(wall),
        wallSeconds: round3(wall),
        timedOut: false,
        returnCode: 0,
      },
    };
  },
};
