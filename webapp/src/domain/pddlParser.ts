import type { MazeProblem, Agent, Door, Button, Elevator, Edge, DoorControl, Coord } from '../types/maze';
import { parseCellId, coordKey, allCoords } from './coords';

// ---------------------------------------------------------------------------
// PDDL problem string -> MazeProblem. Lenient parser used to load bundled
// examples and to re-ingest user edits from the PDDL panel. Dimensions and
// walls are inferred from the declared cells (bounding box minus declared).
// ---------------------------------------------------------------------------

export interface ParseResult {
  problem?: MazeProblem;
  error?: string;
}

/** Extract all `(pred args...)` facts from the :init and :goal sections. */
function matchAll(re: RegExp, text: string): RegExpMatchArray[] {
  const out: RegExpMatchArray[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(text)) !== null) out.push(m);
  return out;
}

export function parsePddl(text: string): ParseResult {
  try {
    const nameMatch = text.match(/\(define\s+\(problem\s+([^\s)]+)\)/i);
    const name = nameMatch ? nameMatch[1] : 'imported-problem';

    // Collect every declared cell id from the :objects block.
    const objBlock = text.match(/\(:objects([\s\S]*?)\)\s*(?=\(:init)/i);
    const cellIds = new Set<string>();
    if (objBlock) {
      for (const tok of objBlock[1].split(/\s+/)) {
        if (/^c[\d_]+$/.test(tok)) cellIds.add(tok);
      }
    }
    // Also pick up cells referenced anywhere (robustness for sparse files).
    for (const m of matchAll(/\bc\d[\d_]*\b/, text)) cellIds.add(m[0]);

    const coords: Coord[] = [];
    for (const id of cellIds) {
      const c = parseCellId(id);
      if (c) coords.push(c);
    }
    if (!coords.length) return { error: 'No cells found in problem.' };

    // Infer dimensionality and per-axis size.
    const nd = Math.max(...coords.map((c) => c.length));
    const norm = coords.map((c) => {
      const padded = [...c];
      while (padded.length < nd) padded.unshift(0);
      return padded;
    });
    const dimensions = new Array(nd).fill(0);
    for (const c of norm) c.forEach((v, i) => (dimensions[i] = Math.max(dimensions[i], v + 1)));

    // Walls = full-grid coords minus declared free cells.
    const freeKeys = new Set(norm.map(coordKey));
    const walls = allCoords(dimensions)
      .map(coordKey)
      .filter((k) => !freeKeys.has(k));

    // Init facts.
    const initBlock = (text.match(/\(:init([\s\S]*?)\)\s*(?=\(:goal)/i)?.[1]) ?? '';
    const goalBlock = (text.match(/\(:goal([\s\S]*?)\)\s*(?=\(:metric|\)\s*$)/i)?.[1]) ?? '';

    const cid = (s: string): Coord | null => parseCellId(s);

    // Agents.
    const starts = new Map<string, Coord>();
    for (const m of matchAll(/\(agent-at\s+(\S+)\s+(\S+)\)/, initBlock)) {
      const c = cid(m[2]);
      if (c) starts.set(m[1], c);
    }
    const goals = new Map<string, Coord>();
    for (const m of matchAll(/\(agent-at\s+(\S+)\s+(\S+)\)/, goalBlock)) {
      const c = cid(m[2]);
      if (c) goals.set(m[1], c);
    }
    const agentIds = new Set<string>([...starts.keys(), ...goals.keys()]);
    const agents: Agent[] = [...agentIds].sort().map((id) => ({
      id,
      start: starts.get(id) ?? [0, 0].slice(0, nd),
      goal: goals.get(id) ?? starts.get(id) ?? new Array(nd).fill(0),
    }));

    // Doors: from connects.
    const doorPairs = new Map<string, { a: Coord; b: Coord }>();
    for (const m of matchAll(/\(connects\s+(\S+)\s+(\S+)\s+(\S+)\)/, initBlock)) {
      const a = cid(m[2]);
      const b = cid(m[3]);
      if (a && b && !doorPairs.has(m[1])) doorPairs.set(m[1], { a, b });
    }
    // Button -> door / elevator links.
    const upDoor = new Map<string, string>(); // button -> door
    for (const m of matchAll(/\(up\s+(\S+)\s+(\S+)\)/, initBlock)) upDoor.set(m[1], m[2]);
    const upElev = new Map<string, string>(); // button -> elevator
    for (const m of matchAll(/\(up-elevator\s+(\S+)\s+(\S+)\)/, initBlock)) upElev.set(m[1], m[2]);
    const buttonCells = new Map<string, Coord>();
    for (const m of matchAll(/\(button-at\s+(\S+)\s+(\S+)\)/, initBlock)) {
      const c = cid(m[2]);
      if (c) buttonCells.set(m[1], c);
    }
    // Timed literals.
    const timedByDoor = new Map<string, { open: number; close?: number }[]>();
    const opens = matchAll(/\(at\s+([\d.]+)\s+\(door-open\s+(\S+)\)\)/, initBlock);
    const closes = matchAll(/\(at\s+([\d.]+)\s+\(not\s+\(door-open\s+(\S+)\)\)\)/, initBlock);
    for (const m of opens) {
      const arr = timedByDoor.get(m[2]) ?? [];
      arr.push({ open: Number(m[1]) });
      timedByDoor.set(m[2], arr);
    }
    for (const m of closes) {
      const arr = timedByDoor.get(m[2]) ?? [];
      // attach to the last window without a close, else new.
      const openWin = arr.find((w) => w.close == null);
      if (openWin) openWin.close = Number(m[1]);
      else arr.push({ open: 0, close: Number(m[1]) });
      timedByDoor.set(m[2], arr);
    }

    const doorsById = new Set<string>([...doorPairs.keys(), ...timedByDoor.keys()]);
    const buttonOpens = new Map<string, string[]>(); // door -> buttons
    for (const [b, d] of upDoor) {
      buttonOpens.set(d, [...(buttonOpens.get(d) ?? []), b]);
    }
    const doors: Door[] = [...doorsById].sort().map((id) => {
      const pair = doorPairs.get(id) ?? { a: new Array(nd).fill(0), b: new Array(nd).fill(0) };
      const hasButton = buttonOpens.has(id);
      const hasTimed = timedByDoor.has(id);
      let control: DoorControl = 'none';
      if (hasButton && hasTimed) control = 'both';
      else if (hasButton) control = 'button';
      else if (hasTimed) control = 'timed';
      return {
        id,
        a: pair.a,
        b: pair.b,
        control,
        timedWindows: timedByDoor.get(id),
      };
    });

    // Elevators from elevator-connects.
    const elevPairs = new Map<string, { a: Coord; b: Coord }>();
    for (const m of matchAll(/\(elevator-connects\s+(\S+)\s+(\S+)\s+(\S+)\)/, initBlock)) {
      const a = cid(m[2]);
      const b = cid(m[3]);
      if (a && b && !elevPairs.has(m[1])) elevPairs.set(m[1], { a, b });
    }
    const elevators: Elevator[] = [...elevPairs.entries()]
      .sort()
      .map(([id, p]) => ({ id, a: p.a, b: p.b }));

    // Buttons.
    const buttonIds = new Set<string>([
      ...buttonCells.keys(),
      ...upDoor.keys(),
      ...upElev.keys(),
    ]);
    const buttons: Button[] = [...buttonIds].sort().map((id) => ({
      id,
      cell: buttonCells.get(id) ?? new Array(nd).fill(0),
      opensDoor: upDoor.get(id),
      activatesElevator: upElev.get(id),
    }));

    // Stairs.
    const stairSet = new Map<string, Edge>();
    for (const m of matchAll(/\(stairs\s+(\S+)\s+(\S+)\)/, initBlock)) {
      const a = cid(m[1]);
      const b = cid(m[2]);
      if (!a || !b) continue;
      const ka = coordKey(a);
      const kb = coordKey(b);
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      if (!stairSet.has(key)) stairSet.set(key, { a, b });
    }
    const stairs: Edge[] = [...stairSet.values()];

    const problem: MazeProblem = {
      name,
      dimensions,
      agents: agents.length ? agents : [{ id: 'a1', start: new Array(nd).fill(0), goal: new Array(nd).fill(0) }],
      walls,
      buttons,
      doors,
      stairs,
      elevators,
    };
    return { problem };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to parse PDDL.' };
  }
}
