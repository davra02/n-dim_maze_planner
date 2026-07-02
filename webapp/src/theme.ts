import type { ToolKind } from './types/maze';

// Agent path palette — same hues used by scripts/pddl_to_dot.py for visual
// consistency with the project's existing Graphviz renders.
export const AGENT_PALETTE = [
  '#e41a1c', // red
  '#377eb8', // blue
  '#4daf4a', // green
  '#984ea3', // purple
  '#ff7f00', // orange
  '#a65628', // brown
  '#f781bf', // pink
  '#999999', // gray
];

export function agentColor(agents: { id: string }[], id: string): string {
  const idx = agents.findIndex((a) => a.id === id);
  return AGENT_PALETTE[(idx < 0 ? 0 : idx) % AGENT_PALETTE.length];
}

// Edge colors, matching pddl_to_dot.py conventions.
export const EDGE_COLORS = {
  adjacent: '#5b6b82',
  door: '#e0554b',
  stairs: '#b07a3c',
  elevator: '#4f9cff',
};

// Cell / element fills for the 2D grid + legend.
export const CELL = {
  free: '#161c28',
  freeStroke: '#2a3444',
  wall: '#0b0e14',
  wallStroke: '#333c4c',
  path: '#2b4a6b',
  button: '#f2c14e',
  door: '#e0554b',
  stairs: '#b07a3c',
  elevator: '#4f9cff',
};

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  glyph?: string;
}

export const LEGEND: LegendItem[] = [
  { key: 'free', label: 'Libre', color: CELL.free },
  { key: 'wall', label: 'Pared / bloqueada', color: CELL.wall },
  { key: 'start', label: 'Inicio (agente)', color: '#4daf4a', glyph: '▶' },
  { key: 'goal', label: 'Meta (agente)', color: '#e41a1c', glyph: '★' },
  { key: 'button', label: 'Botón', color: CELL.button, glyph: '◉' },
  { key: 'door', label: 'Puerta', color: CELL.door, glyph: '⧉' },
  { key: 'stairs', label: 'Escalera', color: CELL.stairs, glyph: '▤' },
  { key: 'elevator', label: 'Ascensor', color: CELL.elevator, glyph: '⇕' },
  { key: 'path', label: 'Camino del plan', color: CELL.path, glyph: '━' },
];

export interface ToolDef {
  kind: ToolKind;
  label: string;
  glyph: string;
  hint: string;
}

export const TOOLS: ToolDef[] = [
  { kind: 'select', label: 'Seleccionar', glyph: '⌖', hint: 'Inspeccionar/seleccionar elementos' },
  { kind: 'wall', label: 'Pared', glyph: '▧', hint: 'Bloquear celda' },
  { kind: 'free', label: 'Libre', glyph: '□', hint: 'Desbloquear celda' },
  { kind: 'start', label: 'Inicio', glyph: '▶', hint: 'Colocar inicio del agente activo' },
  { kind: 'goal', label: 'Meta', glyph: '★', hint: 'Colocar meta del agente activo' },
  { kind: 'button', label: 'Botón', glyph: '◉', hint: 'Añadir botón' },
  { kind: 'door', label: 'Puerta', glyph: '⧉', hint: 'Conectar dos celdas con una puerta' },
  { kind: 'stairs', label: 'Escalera', glyph: '▤', hint: 'Conectar dos celdas con escaleras' },
  { kind: 'elevator', label: 'Ascensor', glyph: '⇕', hint: 'Conectar dos celdas con un ascensor' },
];

export const ACTION_LABEL: Record<string, string> = {
  move: 'mover',
  'move-through-door': 'cruzar puerta',
  'press-button': 'pulsar botón',
  'activate-elevator': 'activar ascensor',
  'take-stairs': 'usar escalera',
  'take-elevator': 'usar ascensor',
};
