import type { MazeProblem } from '../types/maze';
import type { PlanResult } from '../types/plan';

// ---------------------------------------------------------------------------
// The single integration seam with a planner. Today this is implemented by the
// in-browser mock (mockPlanner.ts). A future real backend can implement the
// same interface (OpticPlannerService) by POSTing the generated PDDL to an
// endpoint that wraps scripts/run_optic.py — see webapp/README.md.
// ---------------------------------------------------------------------------

export interface PlannerService {
  /** Solve the problem and return a plan + stats (found=false if unsolvable). */
  solve(problem: MazeProblem): Promise<PlanResult>;
  /** Label shown in the UI (e.g. "Mock planner", "OPTIC (Docker)"). */
  readonly label: string;
}
