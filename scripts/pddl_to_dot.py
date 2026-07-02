#!/usr/bin/env python3
import argparse
import re
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

EDGE_RE = re.compile(r"\((adjacent|connects|stairs|elevator-connects)\s+(\S+)\s+(\S+)(?:\s+(\S+))?\)")
# OPTIC plan line format (temporal):
#   0.000: (move a1 c0_0_0 c0_0_1) [1.000]
PLAN_STEP_RE = re.compile(
    r"^\s*([0-9]+(?:\.[0-9]+)?):\s*\(([^)]+)\)\s*\[([0-9]+(?:\.[0-9]+)?)\]\s*$"
)
CELL_RE = re.compile(r"^c[0-9_]+$|^c\d+[,_]?\d+$")


def parse_edges(text: str):
    edges = []
    for match in EDGE_RE.finditer(text):
        kind, a, b, c = match.groups()
        if kind == "connects":
            door = a
            src = b
            dst = c
            edges.append((kind, src, dst, door))
        elif kind == "elevator-connects":
            elev = a
            src = b
            dst = c
            edges.append((kind, src, dst, elev))
        else:
            edges.append((kind, a, b, None))
    return edges


def parse_agent_starts_and_goals(problem_text: str) -> Tuple[Dict[str, str], Dict[str, str]]:
    """Return (start_cell_by_agent, goal_cell_by_agent) if present in the problem."""
    start_by_agent: Dict[str, str] = {}
    goal_by_agent: Dict[str, str] = {}

    init_match = re.search(r"\(:init(.*?)\)\s*\(:goal", problem_text, re.S | re.I)
    init_block = init_match.group(1) if init_match else problem_text

    goal_match = re.search(r"\(:goal(.*)\)\s*\(:metric|\(:goal(.*)\)\s*\)", problem_text, re.S | re.I)
    goal_block = ""
    if goal_match:
        goal_block = "".join([g for g in goal_match.groups() if g])
    else:
        # fallback: everything after (:goal
        idx = problem_text.lower().find("(:goal")
        if idx >= 0:
            goal_block = problem_text[idx:]

    for agent, cell in re.findall(r"\(agent-at\s+(\w+)\s+(\S+)\)", init_block, re.I):
        start_by_agent[agent] = cell
    for agent, cell in re.findall(r"\(agent-at\s+(\w+)\s+(\S+)\)", goal_block, re.I):
        goal_by_agent[agent] = cell

    # Back-compat: single-agent (at cX)
    if not start_by_agent:
        m = re.search(r"\(at\s+(\S+)\)", init_block, re.I)
        if m:
            start_by_agent["a1"] = m.group(1)
    if not goal_by_agent:
        m = re.search(r"\(at\s+(\S+)\)", goal_block, re.I)
        if m:
            goal_by_agent["a1"] = m.group(1)

    return start_by_agent, goal_by_agent


def safe_id(raw: str) -> str:
    s = re.sub(r"[^A-Za-z0-9_]", "_", raw)
    if not s:
        return "n"
    if s[0].isdigit():
        return "n_" + s
    return s


def cell_label(cell: str) -> str:
    # Prefer a compact coordinate-like label for higher dimensions.
    if cell.startswith("c"):
        core = cell[1:]
        core = core.replace(",", "_")
        if "_" in core:
            parts = [p for p in core.split("_") if p]
            if all(p.isdigit() for p in parts):
                return ",".join(parts)
        # 2D form: cXY
        m = re.match(r"^c(\d+)(\d+)$", cell)
        if m:
            return f"{m.group(1)},{m.group(2)}"
    return cell


def agent_palette(agents: Sequence[str]) -> Dict[str, str]:
    palette = [
        "#e41a1c",  # red
        "#377eb8",  # blue
        "#4daf4a",  # green
        "#984ea3",  # purple
        "#ff7f00",  # orange
        "#a65628",  # brown
        "#f781bf",  # pink
        "#999999",  # gray
    ]
    colors: Dict[str, str] = {}
    for idx, agent in enumerate(agents):
        colors[agent] = palette[idx % len(palette)]
    return colors


def parse_plan_steps(plan_text: str) -> List[Tuple[float, float, List[str]]]:
    """Return list of (start_time, duration, tokenized_action)."""
    steps: List[Tuple[float, float, List[str]]] = []
    for line in plan_text.splitlines():
        m = PLAN_STEP_RE.match(line)
        if not m:
            continue
        start_s, action_text, dur_s = m.groups()
        action_text = action_text.strip()
        if not action_text:
            continue
        try:
            start_t = float(start_s)
        except Exception:
            start_t = 0.0
        try:
            dur_t = float(dur_s)
        except Exception:
            dur_t = 0.0
        steps.append((start_t, dur_t, action_text.split()))
    return steps


def infer_agents_from_steps(steps: Sequence[Sequence[str]]) -> List[str]:
    agents: List[str] = []
    seen = set()
    for parts in steps:
        if len(parts) >= 2 and re.match(r"^[A-Za-z]\w*$", parts[1]):
            # In this repo, multi-agent actions include agent as 2nd token.
            a = parts[1]
            if a not in seen:
                seen.add(a)
                agents.append(a)
    if not agents:
        agents = ["a1"]
    return agents


def is_cell(token: str) -> bool:
    return bool(CELL_RE.match(token))


def plan_to_dot(
    problem_text: str,
    plan_text: str,
    agents_filter: Optional[Sequence[str]] = None,
    include_full_graph: bool = True,
    rankdir: str = "LR",
    graph_size: Optional[str] = None,
    graph_ratio: Optional[str] = None,
    graph_dpi: Optional[int] = None,
    node_size: float = 1.0,
) -> str:
    steps = parse_plan_steps(plan_text)
    if not steps:
        raise ValueError("No se encontraron acciones en el plan.")

    inferred_agents = infer_agents_from_steps([parts for _, _, parts in steps])
    agents = list(agents_filter) if agents_filter else inferred_agents
    color_by_agent = agent_palette(agents)
    start_by_agent, goal_by_agent = parse_agent_starts_and_goals(problem_text)

    lines: List[str] = []
    lines.append("digraph plan {")
    lines.append(f"  rankdir={rankdir};")
    lines.append("  splines=true;")
    if graph_size or graph_ratio or graph_dpi:
        attrs: List[str] = []
        if graph_size:
            attrs.append(f"size=\"{graph_size}\"")
        if graph_ratio:
            attrs.append(f"ratio=\"{graph_ratio}\"")
        if graph_dpi:
            attrs.append(f"dpi={int(graph_dpi)}")
        lines.append(f"  graph [{', '.join(attrs)}];")
    # Make the output more readable in 16:9 renders.
    # NOTE: width/height are in inches in Graphviz.
    lines.append(
        f"  node [shape=circle, fontsize=22, width={node_size:.3f}, height={node_size:.3f}, fixedsize=true];"
    )
    lines.append("  edge [fontsize=20];")

    # Optional: render full connectivity graph in the background (minimal / no labels)
    if include_full_graph:
        bg_edges = parse_edges(problem_text)
        for kind, src, dst, meta in bg_edges:
            # Keep it intentionally low-noise for higher dimensions.
            lines.append(
                f"  {safe_id(src)} -> {safe_id(dst)} [color=\"#cccccc\", penwidth=2, label=\"\", arrowsize=1.0];"
            )

    # Legend
    lines.append("  subgraph cluster_legend {")
    lines.append("    label=\"Agentes\";")
    lines.append("    fontsize=24;")
    lines.append("    color=\"#dddddd\";")
    for agent in agents:
        aid = safe_id(f"legend_{agent}")
        lines.append(
            f"    {aid} [shape=box, fontsize=22, style=\"rounded,filled\", fillcolor=\"{color_by_agent[agent]}\", label=\"{agent}\"];"
        )
    lines.append("  }")

    # Start/goal markers as small boxes pointing to the cell.
    for agent in agents:
        color = color_by_agent[agent]
        if agent in start_by_agent:
            sid = safe_id(f"{agent}_start")
            cell = start_by_agent[agent]
            lines.append(
                f"  {sid} [shape=box, fontsize=20, style=\"rounded,filled\", fillcolor=\"{color}\", label=\"inicio\"];"
            )
            lines.append(f"  {sid} -> {safe_id(cell)} [color=\"{color}\", penwidth=4, arrowsize=1.1];")
        if agent in goal_by_agent:
            gid = safe_id(f"{agent}_goal")
            cell = goal_by_agent[agent]
            lines.append(
                f"  {gid} [shape=box, fontsize=20, style=\"rounded,filled\", fillcolor=\"{color}\", label=\"meta\"];"
            )
            lines.append(f"  {gid} -> {safe_id(cell)} [color=\"{color}\", penwidth=4, arrowsize=1.1];")

    # Declare cell nodes with compact labels.
    cell_nodes: Dict[str, str] = {}
    if include_full_graph:
        for kind, src, dst, meta in parse_edges(problem_text):
            if is_cell(src):
                cell_nodes[src] = cell_label(src)
            if is_cell(dst):
                cell_nodes[dst] = cell_label(dst)
    for _, _, parts in steps:
        for tok in parts:
            if is_cell(tok):
                cell_nodes[tok] = cell_label(tok)
    for agent in agents:
        for cell in (start_by_agent.get(agent), goal_by_agent.get(agent)):
            if cell:
                cell_nodes[cell] = cell_label(cell)

    for cell, label in sorted(cell_nodes.items()):
        lines.append(f"  {safe_id(cell)} [label=\"{label}\"]; ")

    # Emit plan actions. Only include the start time; no extra sequential numbering.
    for start_t, _dur_t, parts in steps:
        if not parts:
            continue
        action = parts[0]

        # Agent-aware parsing (default in this repo)
        agent = parts[1] if len(parts) >= 2 and parts[1] in color_by_agent else "a1"
        if agents_filter and agent not in agents_filter:
            continue

        color = color_by_agent.get(agent, "#000000")
        time_prefix = f"t={start_t:.3f}: "

        def edge(src: str, dst: str, text: str, style: str = "solid"):
            lines.append(
                f"  {safe_id(src)} -> {safe_id(dst)} [color=\"{color}\", penwidth=4, arrowsize=1.1, label=\"{time_prefix}{text}\", style=\"{style}\"];"
            )

        def action_box(at_cell: str, text: str):
            # Use time + a stable hash-ish suffix to avoid collisions if multiple actions start at the same time.
            box_id = safe_id(f"{agent}_act_{start_t:.3f}_{abs(hash(' '.join(parts))) % 100000}")
            lines.append(
                f"  {box_id} [shape=box, fontsize=20, style=\"rounded\", color=\"{color}\", fontcolor=\"{color}\", label=\"{time_prefix}{text}\"];"
            )
            lines.append(
                f"  {safe_id(at_cell)} -> {box_id} [color=\"{color}\", penwidth=2, style=\"dashed\", arrowhead=none];"
            )

        # Movements
        if action == "move" and len(parts) >= 4 and is_cell(parts[2]) and is_cell(parts[3]):
            edge(parts[2], parts[3], "mover")
            continue
        if action == "move-through-door" and len(parts) >= 5 and is_cell(parts[2]) and is_cell(parts[3]):
            door = parts[4]
            edge(parts[2], parts[3], f"puerta {door}")
            continue
        if action == "take-stairs" and len(parts) >= 4 and is_cell(parts[2]) and is_cell(parts[3]):
            edge(parts[2], parts[3], "escaleras")
            continue
        if action == "take-elevator" and len(parts) >= 5 and is_cell(parts[2]) and is_cell(parts[3]):
            elev = parts[4]
            edge(parts[2], parts[3], f"ascensor {elev}")
            continue

        # Stationary actions (show as dashed annotation)
        if action == "press-button" and len(parts) >= 5 and is_cell(parts[4]):
            button = parts[2]
            door = parts[3]
            action_box(parts[4], f"pulsa {button} (abre {door})")
            continue
        if action == "activate-elevator" and len(parts) >= 5 and is_cell(parts[4]):
            button = parts[2]
            elev = parts[3]
            action_box(parts[4], f"activa ascensor {elev} (pulsa {button})")
            continue

        # Back-compat / unknown: skip quietly (keeps output minimal)

    lines.append("}")
    return "\n".join(lines)


def to_dot(edges):
    lines = ["digraph maze {"]
    lines.append("  rankdir=LR;")
    seen = set()

    for kind, src, dst, meta in edges:
        key = (kind, src, dst, meta)
        if key in seen:
            continue
        seen.add(key)

        label = kind
        color = "black"
        style = "solid"
        if kind == "connects":
            label = f"door:{meta}"
            color = "red"
        elif kind == "stairs":
            label = "stairs"
            color = "brown"
        elif kind == "elevator-connects":
            label = f"elevator:{meta}"
            color = "blue"
        elif kind == "adjacent":
            label = "adjacent"
            color = "gray"

        lines.append(f"  {src} -> {dst} [label=\"{label}\", color=\"{color}\", style=\"{style}\"]; ")

    lines.append("}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Genera un grafo DOT desde un problema PDDL (y opcionalmente un plan)."
    )
    parser.add_argument("problem", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--plan",
        type=Path,
        default=None,
        help="Fichero de plan (.out) para dibujar el camino (multiagente con colores).",
    )
    parser.add_argument(
        "--agents",
        default=None,
        help="Lista de agentes separados por coma (ej: a1,a2). Si no se indica, se infieren del plan.",
    )

    graph_mode = parser.add_mutually_exclusive_group()
    graph_mode.add_argument(
        "--full-graph",
        action="store_true",
        help="Con --plan: incluye el grafo completo de fondo (gris) + el camino. (Por defecto)",
    )
    graph_mode.add_argument(
        "--as-before",
        action="store_true",
        help="Con --plan: dibuja solo el camino del plan (sin el grafo completo de fondo).",
    )
    # Backward compatible flag (same as --as-before)
    graph_mode.add_argument(
        "--only-plan",
        action="store_true",
        help=argparse.SUPPRESS,
    )

    # Layout / rendering controls (useful for PNG output that otherwise becomes too wide).
    parser.add_argument(
        "--aspect",
        default=None,
        help="Fuerza un aspect ratio en la imagen (ej: 16:9). Se aplica como size=\"W,H!\" y ratio=fill.",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=None,
        help="DPI del grafo (si usas --aspect, por defecto 120 => 16x9in ~ 1920x1080 px).",
    )
    parser.add_argument(
        "--rankdir",
        default="LR",
        choices=["LR", "TB"],
        help="Dirección del layout: LR (horizontal) o TB (vertical).",
    )
    parser.add_argument(
        "--node-size",
        type=float,
        default=1.0,
        help="Tamaño de los nodos (celdas) en pulgadas (Graphviz width/height). Usa 2.0 para el doble.",
    )
    args = parser.parse_args()

    def parse_aspect(value: str) -> Optional[Tuple[float, float]]:
        m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*[:xX/,]\s*([0-9]+(?:\.[0-9]+)?)\s*$", value)
        if not m:
            return None
        w = float(m.group(1))
        h = float(m.group(2))
        if w <= 0 or h <= 0:
            return None
        return w, h

    text = args.problem.read_text(encoding="utf-8", errors="ignore")

    if args.plan is None:
        edges = parse_edges(text)
        args.output.write_text(to_dot(edges) + "\n", encoding="utf-8")
        return

    plan_text = args.plan.read_text(encoding="utf-8", errors="ignore")
    agents_filter = None
    if args.agents:
        agents_filter = [a.strip() for a in args.agents.split(",") if a.strip()]

    include_full_graph = True
    if getattr(args, "as_before", False) or getattr(args, "only_plan", False):
        include_full_graph = False
    elif getattr(args, "full_graph", False):
        include_full_graph = True

    dot = plan_to_dot(
        problem_text=text,
        plan_text=plan_text,
        agents_filter=agents_filter,
        include_full_graph=include_full_graph,
        rankdir=args.rankdir,
        graph_size=(
            (lambda wh: f"{wh[0]},{wh[1]}!" if wh else None)(parse_aspect(args.aspect))
            if args.aspect
            else None
        ),
        graph_ratio=("fill" if args.aspect else None),
        graph_dpi=(args.dpi if args.dpi else (120 if args.aspect else None)),
        node_size=float(args.node_size),
    )
    args.output.write_text(dot + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
