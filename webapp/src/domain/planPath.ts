import type { PlanAction } from '../types/plan';
import type { Coord, MazeProblem } from '../types/maze';
import { parseCellId, coordKey } from './coords';

// Derive, per agent, the ordered sequence of cells visited by the plan, plus
// the set of highlighted cell keys and directed path edges (for viz overlays).

export interface AgentPath {
  agentId: string;
  cells: Coord[];
}

export interface PlanPaths {
  byAgent: Map<string, Coord[]>;
  highlighted: Set<string>; // cell keys on any path
  edges: { agentId: string; a: Coord; b: Coord }[];
}

export function computePlanPaths(problem: MazeProblem, actions: PlanAction[]): PlanPaths {
  const byAgent = new Map<string, Coord[]>();
  const highlighted = new Set<string>();
  const edges: { agentId: string; a: Coord; b: Coord }[] = [];

  for (const agent of problem.agents) byAgent.set(agent.id, [ [...agent.start] ]);

  for (const a of actions) {
    const seq = byAgent.get(a.agent) ?? [];
    if (a.from && a.to) {
      const from = parseCellId(a.from);
      const to = parseCellId(a.to);
      if (from && to) {
        edges.push({ agentId: a.agent, a: from, b: to });
        seq.push(to);
        highlighted.add(coordKey(from));
        highlighted.add(coordKey(to));
      }
    }
    byAgent.set(a.agent, seq);
  }
  for (const seq of byAgent.values()) for (const c of seq) highlighted.add(coordKey(c));
  return { byAgent, highlighted, edges };
}
