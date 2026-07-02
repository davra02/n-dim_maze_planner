import type { PlanAction, ActionType, PlanStats } from '../types/plan';

// ---------------------------------------------------------------------------
// Parse OPTIC `.out` plan lines into PlanAction[], and compute makespan/cost.
// Line format:  <start>: (<type> <args...>) [<duration>]
// Arg orders (from domain / plans/*.out):
//   (move a from to)
//   (move-through-door a from to d)
//   (press-button a b d cell)
//   (activate-elevator a b e cell)
//   (take-stairs a from to)
//   (take-elevator a from to e)
// ---------------------------------------------------------------------------

const LINE_RE = /^\s*([\d.]+):\s*\(([^)]+)\)\s*\[([\d.]+)\]/;

export function parsePlanLines(raw: string): PlanAction[] {
  const actions: PlanAction[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const start = Number(m[1]);
    const duration = Number(m[3]);
    const tokens = m[2].trim().split(/\s+/);
    const type = tokens[0] as ActionType;
    const agent = tokens[1] ?? '';
    const a: PlanAction = { start, duration, type, agent, raw: line.trim() };

    switch (type) {
      case 'move':
      case 'take-stairs':
        a.from = tokens[2];
        a.to = tokens[3];
        break;
      case 'move-through-door':
        a.from = tokens[2];
        a.to = tokens[3];
        a.door = tokens[4];
        break;
      case 'take-elevator':
        a.from = tokens[2];
        a.to = tokens[3];
        a.elevator = tokens[4];
        break;
      case 'press-button':
        a.button = tokens[2];
        a.door = tokens[3];
        a.cell = tokens[4];
        break;
      case 'activate-elevator':
        a.button = tokens[2];
        a.elevator = tokens[3];
        a.cell = tokens[4];
        break;
    }
    actions.push(a);
  }
  actions.sort((x, y) => x.start - y.start);
  return actions;
}

export function makespanOf(actions: PlanAction[]): number {
  return actions.reduce((mx, a) => Math.max(mx, a.start + a.duration), 0);
}

const COST: Record<ActionType, number> = {
  move: 1,
  'move-through-door': 1,
  'press-button': 1,
  'activate-elevator': 1,
  'take-stairs': 3,
  'take-elevator': 1,
};

export function costOf(actions: PlanAction[]): number {
  return actions.reduce((sum, a) => sum + (COST[a.type] ?? 1), 0);
}

/** Round to the small fractional precision OPTIC uses (e.g. 12.009). */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Serialize actions back to `.out` text. */
export function serializePlan(actions: PlanAction[]): string {
  return actions.map((a) => a.raw).join('\n') + (actions.length ? '\n' : '');
}

export function statsFromActions(
  actions: PlanAction[],
  extra: Partial<PlanStats> = {},
): PlanStats {
  const cost = costOf(actions);
  return {
    found: true,
    actions: actions.length,
    makespan: round3(makespanOf(actions)),
    cost,
    metric: cost,
    ...extra,
  };
}
