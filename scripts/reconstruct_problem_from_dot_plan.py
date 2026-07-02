#!/usr/bin/env python3
"""Reconstruct a minimal PDDL problem from a DOT maze graph and a plan.

This is intended for visualization use-cases (e.g. scripts/render_3d.py) when the
original generated problem file is missing.

It reconstructs:
- cell objects
- (adjacent ...), (connects door ...), (stairs ...), (elevator-connects ...)
- button objects + (button-at ...)
- (up button door) and (up-elevator button elevator) inferred from plan actions

It does NOT attempt to reconstruct timed initial literals precisely.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

DOT_EDGE_RE = re.compile(
    r"^\s*(c\w+)\s*->\s*(c\w+)\s*\[label=\"([^\"]+)\"",
    re.IGNORECASE,
)
PLAN_ACTION_RE = re.compile(r"\(([^)]+)\)")


def parse_dot(dot_path: Path):
    cells: Set[str] = set()
    adjacency: Set[Tuple[str, str]] = set()
    connects: List[Tuple[str, str, str]] = []
    stairs: Set[Tuple[str, str]] = set()
    elevator_edges: List[Tuple[str, str, str]] = []  # (elevator, a, b)

    for line in dot_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = DOT_EDGE_RE.match(line)
        if not m:
            continue
        a, b, label = m.group(1), m.group(2), m.group(3)
        cells.add(a)
        cells.add(b)

        if label == "adjacent":
            adjacency.add((a, b))
            continue
        if label == "stairs":
            stairs.add((a, b))
            continue
        if label.startswith("door:"):
            door = label.split(":", 1)[1]
            connects.append((door, a, b))
            continue
        if label.startswith("elevator:"):
            elev = label.split(":", 1)[1]
            elevator_edges.append((elev, a, b))
            continue

    return cells, adjacency, connects, stairs, elevator_edges


def parse_plan(plan_path: Path):
    button_at: Dict[str, str] = {}
    up: Dict[str, str] = {}  # button -> door
    up_elevator: Dict[str, str] = {}  # button -> elevator

    start_cell = None
    last_cell = None

    text = plan_path.read_text(encoding="utf-8", errors="ignore")
    for line in text.splitlines():
        m = PLAN_ACTION_RE.search(line)
        if not m:
            continue
        parts = m.group(1).split()
        if not parts:
            continue

        action = parts[0]

        if action in {"move", "move-through-door", "take-stairs", "take-elevator"}:
            # Multi-agent expected: action <agent> <from> <to> ...
            if len(parts) >= 4:
                from_cell = parts[2]
                to_cell = parts[3]
                if start_cell is None:
                    start_cell = from_cell
                last_cell = to_cell
            elif len(parts) >= 3:
                # Back-compat: action <from> <to>
                from_cell = parts[1]
                to_cell = parts[2]
                if start_cell is None:
                    start_cell = from_cell
                last_cell = to_cell
            continue

        if action == "press-button":
            # press-button <agent> <button> <door> <cell>
            if len(parts) >= 5:
                button, door, cell = parts[2], parts[3], parts[4]
            # Back-compat: press-button <button> <door> <cell>
            elif len(parts) >= 4:
                button, door, cell = parts[1], parts[2], parts[3]
            else:
                continue
            button_at.setdefault(button, cell)
            up.setdefault(button, door)
            if start_cell is None:
                start_cell = cell
            last_cell = cell
            continue

        if action == "activate-elevator":
            # activate-elevator <agent> <button> <elevator> <cell>
            if len(parts) >= 5:
                button, elev, cell = parts[2], parts[3], parts[4]
            # Back-compat: activate-elevator <button> <elevator> <cell>
            elif len(parts) >= 4:
                button, elev, cell = parts[1], parts[2], parts[3]
            else:
                continue
            button_at.setdefault(button, cell)
            up_elevator.setdefault(button, elev)
            if start_cell is None:
                start_cell = cell
            last_cell = cell
            continue

    return button_at, up, up_elevator, start_cell, last_cell


def write_problem(
    out_path: Path,
    *,
    problem_name: str,
    cells: Set[str],
    buttons: Set[str],
    doors: Set[str],
    elevators: Set[str],
    adjacency: Set[Tuple[str, str]],
    connects: List[Tuple[str, str, str]],
    stairs: Set[Tuple[str, str]],
    elevator_edges: List[Tuple[str, str, str]],
    button_at: Dict[str, str],
    up: Dict[str, str],
    up_elevator: Dict[str, str],
    start_cell: str,
    goal_cell: str,
):
    lines: List[str] = []
    lines.append(f"(define (problem {problem_name})")
    lines.append("  (:domain temporal-maze)")
    lines.append("  (:objects")
    lines.append(f"    {' '.join(sorted(cells))} - cell")
    if buttons:
        lines.append(f"    {' '.join(sorted(buttons))} - button")
    if doors:
        lines.append(f"    {' '.join(sorted(doors))} - door")
    if elevators:
        lines.append(f"    {' '.join(sorted(elevators))} - elevator")
    lines.append("    a1 - agent")
    lines.append("  )")
    lines.append("")
    lines.append("  (:init")
    lines.append(f"    (agent-at a1 {start_cell})")
    lines.append("    (agent-free a1)")
    lines.append("")
    for a, b in sorted(adjacency):
        lines.append(f"    (adjacent {a} {b})")
    if connects:
        lines.append("")
        for d, a, b in sorted(connects):
            lines.append(f"    (connects {d} {a} {b})")
    if stairs:
        lines.append("")
        for a, b in sorted(stairs):
            lines.append(f"    (stairs {a} {b})")
    if elevator_edges:
        lines.append("")
        for e, a, b in sorted(elevator_edges):
            lines.append(f"    (elevator-connects {e} {a} {b})")

    if up:
        lines.append("")
        for button, door in sorted(up.items()):
            lines.append(f"    (up {button} {door})")

    if up_elevator:
        lines.append("")
        for button, elev in sorted(up_elevator.items()):
            lines.append(f"    (up-elevator {button} {elev})")

    if button_at:
        lines.append("")
        for button, cell in sorted(button_at.items()):
            lines.append(f"    (button-at {button} {cell})")

    lines.append("")
    lines.append("    (= (total-cost) 0)")
    lines.append("  )")
    lines.append("")
    lines.append("  (:goal (and")
    lines.append(f"    (agent-at a1 {goal_cell})")
    lines.append("  ))")
    lines.append("")
    lines.append("  (:metric minimize (total-cost))")
    lines.append(")")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reconstruct a minimal PDDL problem from a DOT maze graph and a plan."
    )
    parser.add_argument("--dot", type=Path, required=True, help="Path to DOT graph (e.g. graphs/maze.dot)")
    parser.add_argument("--plan", type=Path, required=True, help="Path to plan file (e.g. plans/plan_3d.out)")
    parser.add_argument("--out", type=Path, required=True, help="Output PDDL problem path")
    parser.add_argument("--name", type=str, default="maze-3d-reconstructed", help="PDDL problem name")
    args = parser.parse_args()

    cells, adjacency, connects, stairs, elevator_edges = parse_dot(args.dot)
    button_at, up, up_elevator, start_cell, goal_cell = parse_plan(args.plan)

    if not start_cell:
        raise SystemExit("Could not infer start cell from plan.")
    if not goal_cell:
        # Fallback: just use start
        goal_cell = start_cell

    # Expand cells with any mentioned in plan/button locations
    cells |= set(button_at.values())
    cells.add(start_cell)
    cells.add(goal_cell)

    doors = {d for d, _, _ in connects} | set(up.values())
    elevators = {e for e, _, _ in elevator_edges} | set(up_elevator.values())

    write_problem(
        args.out,
        problem_name=args.name,
        cells=cells,
        buttons=set(button_at.keys()) | set(up.keys()) | set(up_elevator.keys()),
        doors=doors,
        elevators=elevators,
        adjacency=adjacency,
        connects=connects,
        stairs=stairs,
        elevator_edges=elevator_edges,
        button_at=button_at,
        up=up,
        up_elevator=up_elevator,
        start_cell=start_cell,
        goal_cell=goal_cell,
    )

    print(f"Wrote reconstructed problem: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
