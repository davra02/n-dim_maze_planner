// ---------------------------------------------------------------------------
// Plan + statistics types. PlanStats mirrors the schema of the OPTIC
// stats.json files produced by scripts/run_optic.py, so a future real backend
// can return the same shape the mock produces today.
// ---------------------------------------------------------------------------

export type ActionType =
  | 'move'
  | 'move-through-door'
  | 'press-button'
  | 'activate-elevator'
  | 'take-stairs'
  | 'take-elevator';

/** One line of an OPTIC plan: `<start>: (<type> <args>) [<duration>]`. */
export interface PlanAction {
  start: number;
  duration: number;
  type: ActionType;
  agent: string;
  /** Cell coordinates involved, as string ids ("c0_1_2"). */
  from?: string;
  to?: string;
  /** The cell an agent stands in for press-button / activate-elevator. */
  cell?: string;
  door?: string;
  elevator?: string;
  button?: string;
  /** Raw plan line, useful for the PDDL/plan text view. */
  raw: string;
}

/** Mirror of the `stats.json` schema (see plans/*.stats.json). */
export interface PlanStats {
  found: boolean;
  actions: number;
  makespan: number;
  cost?: number;
  metric?: number;
  statesEvaluated?: number;
  plannerTimeSeconds?: number;
  wallSeconds?: number;
  timedOut?: boolean;
  returnCode?: number;
}

export interface PlanResult {
  found: boolean;
  actions: PlanAction[];
  stats: PlanStats;
  /** Raw plan text in OPTIC `.out` format. */
  raw: string;
  /** Optional human-readable note (e.g. why no plan was found). */
  note?: string;
}
