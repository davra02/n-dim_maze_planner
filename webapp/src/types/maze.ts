// ---------------------------------------------------------------------------
// Domain model for a `temporal-maze` PDDL problem.
//
// The model is coordinate-first: a cell is an integer coordinate tuple whose
// length equals the number of dimensions. Cell string ids (e.g. "c0_1_2") are
// derived on demand in domain/coords.ts — they are never the source of truth.
//
// This mirrors the fixed PDDL domain (domains/domain.pddl). The UI only ever
// produces problems that are valid for that domain; the domain is not editable.
// ---------------------------------------------------------------------------

/** Integer coordinate tuple. Convention: last two entries are the editable
 *  grid plane (row, col); leading entries are higher dimensions (z, w, ...). */
export type Coord = number[];

export interface Agent {
  id: string; // "a1", "a2", ...
  start: Coord;
  goal: Coord;
}

/** How a door becomes passable. A door with control "none" is permanently
 *  closed (a dead edge). See domain semantics in the plan. */
export type DoorControl = 'button' | 'timed' | 'both' | 'none';

export interface TimedWindow {
  open: number; // time the door opens (timed initial literal)
  close?: number; // optional time it closes again
}

export interface Door {
  id: string; // "d1", ...
  a: Coord;
  b: Coord;
  control: DoorControl;
  timedWindows?: TimedWindow[];
}

export interface Button {
  id: string; // "b1", ...
  cell: Coord;
  opensDoor?: string; // door id
  activatesElevator?: string; // elevator id
}

export interface Elevator {
  id: string; // "e1", ...
  a: Coord;
  b: Coord;
  // Activation is expressed by a Button whose activatesElevator === this id.
}

/** Undirected edge between two cells (used for stairs). */
export interface Edge {
  a: Coord;
  b: Coord;
}

export interface MazeProblem {
  name: string;
  /** One size per dimension. length === number of dimensions (2, 3, 4, ...). */
  dimensions: number[];
  agents: Agent[];
  /** Blocked cells, keyed by coordKey (see coords.ts). */
  walls: string[];
  buttons: Button[];
  doors: Door[];
  stairs: Edge[];
  elevators: Elevator[];
}

/** Kinds of things the editor tool can paint / create. */
export type ToolKind =
  | 'select'
  | 'wall'
  | 'free'
  | 'start'
  | 'goal'
  | 'button'
  | 'door'
  | 'stairs'
  | 'elevator';

/** Recommended / active visualization mode. */
export type VizMode = 'grid' | '3d' | 'slices' | 'graph';

/** A reference to a selected element for the properties panel. */
export type Selection =
  | { kind: 'cell'; coord: Coord }
  | { kind: 'agent'; id: string }
  | { kind: 'button'; id: string }
  | { kind: 'door'; id: string }
  | { kind: 'elevator'; id: string }
  | { kind: 'stairs'; index: number }
  | null;
