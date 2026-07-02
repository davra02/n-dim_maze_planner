import type { MazeProblem } from '../types/maze';
import { cellId, coordKey, allCoords } from './coords';
import { deriveAdjacency } from './adjacency';

// ---------------------------------------------------------------------------
// MazeProblem -> PDDL problem string, valid for the fixed `temporal-maze`
// domain (domains/domain.pddl). Mirrors the templates in problems/*.pddl.
// ---------------------------------------------------------------------------

function sanitizeName(name: string): string {
  const n = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return n.length ? n : 'maze-problem';
}

export function generatePddl(problem: MazeProblem): string {
  const walls = new Set(problem.walls);
  const lines: string[] = [];
  const push = (s = '') => lines.push(s);

  // --- Objects: only free cells are declared. ---
  const freeCells = allCoords(problem.dimensions).filter((c) => !walls.has(coordKey(c)));
  const cellIds = freeCells.map(cellId);

  push(`(define (problem ${sanitizeName(problem.name)})`);
  push(`  (:domain temporal-maze)`);
  push(`  (:objects`);

  // Chunk cell ids for readability.
  for (let i = 0; i < cellIds.length; i += 8) {
    const chunk = cellIds.slice(i, i + 8).join(' ');
    push(`    ${chunk}${i + 8 >= cellIds.length ? ' - cell' : ''}`);
  }
  if (problem.buttons.length) push(`    ${problem.buttons.map((b) => b.id).join(' ')} - button`);
  if (problem.doors.length) push(`    ${problem.doors.map((d) => d.id).join(' ')} - door`);
  if (problem.elevators.length)
    push(`    ${problem.elevators.map((e) => e.id).join(' ')} - elevator`);
  push(`    ${problem.agents.map((a) => a.id).join(' ')} - agent`);
  push(`  )`);
  push();

  // --- Init ---
  push(`  (:init`);

  push(`    ;; Agents`);
  for (const a of problem.agents) {
    push(`    (agent-at ${a.id} ${cellId(a.start)})`);
    push(`    (agent-free ${a.id})`);
  }
  push();

  push(`    ;; Adjacency (free horizontal moves, both directions)`);
  for (const e of deriveAdjacency(problem)) {
    const a = cellId(e.a);
    const b = cellId(e.b);
    push(`    (adjacent ${a} ${b})`);
    push(`    (adjacent ${b} ${a})`);
  }
  push();

  if (problem.doors.length) {
    push(`    ;; Doors (crossed with move-through-door while open)`);
    for (const d of problem.doors) {
      const a = cellId(d.a);
      const b = cellId(d.b);
      push(`    (connects ${d.id} ${a} ${b})`);
      push(`    (connects ${d.id} ${b} ${a})`);
    }
    push();
  }

  const buttonDoorLinks = problem.buttons.filter((b) => b.opensDoor);
  const buttonElevatorLinks = problem.buttons.filter((b) => b.activatesElevator);
  if (problem.buttons.length) {
    push(`    ;; Buttons`);
    for (const b of buttonDoorLinks) push(`    (up ${b.id} ${b.opensDoor})`);
    for (const b of buttonElevatorLinks) push(`    (up-elevator ${b.id} ${b.activatesElevator})`);
    for (const b of problem.buttons) push(`    (button-at ${b.id} ${cellId(b.cell)})`);
    push();
  }

  // Timed doors -> timed initial literals (emitted whenever windows exist).
  const timed = problem.doors.filter((d) => d.timedWindows?.length);
  if (timed.length) {
    push(`    ;; Timed doors (timed initial literals)`);
    for (const d of timed) {
      for (const w of d.timedWindows ?? []) {
        push(`    (at ${w.open} (door-open ${d.id}))`);
        if (w.close != null) push(`    (at ${w.close} (not (door-open ${d.id})))`);
      }
    }
    push();
  }

  if (problem.stairs.length) {
    push(`    ;; Stairs (no activation, both directions)`);
    for (const s of problem.stairs) {
      const a = cellId(s.a);
      const b = cellId(s.b);
      push(`    (stairs ${a} ${b})`);
      push(`    (stairs ${b} ${a})`);
    }
    push();
  }

  if (problem.elevators.length) {
    push(`    ;; Elevators (require activation, both directions)`);
    for (const e of problem.elevators) {
      const a = cellId(e.a);
      const b = cellId(e.b);
      push(`    (elevator-connects ${e.id} ${a} ${b})`);
      push(`    (elevator-connects ${e.id} ${b} ${a})`);
    }
    push();
  }

  push(`    (= (total-cost) 0)`);
  push(`  )`);
  push();

  // --- Goal ---
  push(`  (:goal (and`);
  for (const a of problem.agents) push(`    (agent-at ${a.id} ${cellId(a.goal)})`);
  push(`  ))`);
  push();
  push(`  (:metric minimize (total-cost))`);
  push(`)`);

  return lines.join('\n') + '\n';
}
