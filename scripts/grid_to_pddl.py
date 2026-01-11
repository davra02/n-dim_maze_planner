#!/usr/bin/env python3
import argparse
from pathlib import Path


def read_layers(path: Path):
    lines = [line.rstrip("\n") for line in path.read_text(encoding="utf-8", errors="ignore").splitlines()]
    layers = []
    current = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(";"):
            continue
        if stripped == "---":
            if current:
                layers.append(current)
                current = []
            continue
        current.append(line)

    if current:
        layers.append(current)

    if not layers:
        raise ValueError("Grid is empty")

    grids = []
    for rows in layers:
        width = max(len(r) for r in rows)
        grid = [list(r.ljust(width)) for r in rows]
        grids.append(grid)
    return grids


def cell_name(r, c, z=None):
    if z is None:
        return f"c{r}{c}"
    return f"c{z}{r}{c}"


def is_wall(ch):
    return ch == "#"


def is_button(ch):
    return ch.isupper() and ch not in {"S", "G"}


def is_door(ch):
    return ch.islower()


def letter_index(ch):
    if ch.isupper():
        return ord(ch) - ord("A") + 1
    return ord(ch) - ord("a") + 1


def main():
    parser = argparse.ArgumentParser(description="Convert ASCII grid to PDDL problem for temporal-maze.")
    parser.add_argument("grid", type=Path, help="Path to ASCII grid file")
    parser.add_argument("output", type=Path, help="Path to write problem.pddl")
    parser.add_argument("--domain", default="temporal-maze", help="Domain name")
    parser.add_argument("--problem", default="maze-2d-generated", help="Problem name")
    parser.add_argument(
        "--stairs",
        action="store_true",
        help="Connect matching cells between layers with stairs",
    )
    args = parser.parse_args()

    layers = read_layers(args.grid)
    layer_count = len(layers)
    rows = len(layers[0])
    cols = len(layers[0][0])

    cells = []
    door_cells = {}
    button_cells = {}
    start = None
    goal = None

    for z, grid in enumerate(layers):
        if len(grid) != rows or len(grid[0]) != cols:
            raise ValueError("All layers must have the same dimensions")
        for r in range(rows):
            for c in range(cols):
                ch = grid[r][c]
                if is_wall(ch) or ch == " ":
                    continue
                name = cell_name(r, c, z if layer_count > 1 else None)
                cells.append(name)
                if ch == "S":
                    if start is not None:
                        raise ValueError("Multiple start cells found")
                    start = name
                elif ch == "G":
                    if goal is not None:
                        raise ValueError("Multiple goal cells found")
                    goal = name
                elif is_button(ch):
                    if ch in button_cells and button_cells[ch] != name:
                        raise ValueError(f"Button {ch} appears multiple times")
                    button_cells[ch] = name
                elif is_door(ch):
                    if ch in door_cells and door_cells[ch] != name:
                        raise ValueError(f"Door {ch} appears multiple times")
                    door_cells[ch] = name

    if start is None or goal is None:
        raise ValueError("Grid must contain S (start) and G (goal)")

    buttons = sorted(button_cells.keys())
    doors = sorted(door_cells.keys())

    adjacency = []
    connects = []

    def add_adj(a, b):
        adjacency.append((a, b))

    def add_conn(door_id, a, b):
        connects.append((door_id, a, b))

    for z, grid in enumerate(layers):
        for r in range(rows):
            for c in range(cols):
                ch = grid[r][c]
                if is_wall(ch) or ch == " ":
                    continue
                a = cell_name(r, c, z if layer_count > 1 else None)
                for dr, dc in [(1, 0), (0, 1)]:
                    rr, cc = r + dr, c + dc
                    if rr >= rows or cc >= cols:
                        continue
                    ch2 = grid[rr][cc]
                    if is_wall(ch2) or ch2 == " ":
                        continue
                    b = cell_name(rr, cc, z if layer_count > 1 else None)

                    a_is_door = is_door(ch)
                    b_is_door = is_door(ch2)

                    if not a_is_door and not b_is_door:
                        add_adj(a, b)
                        add_adj(b, a)
                    else:
                        if a_is_door:
                            d_id = f"d{letter_index(ch)}"
                            add_conn(d_id, a, b)
                            add_conn(d_id, b, a)
                        if b_is_door:
                            d_id = f"d{letter_index(ch2)}"
                            add_conn(d_id, a, b)
                            add_conn(d_id, b, a)

    stairs = []
    if args.stairs and layer_count > 1:
        for z in range(layer_count - 1):
            g0 = layers[z]
            g1 = layers[z + 1]
            for r in range(rows):
                for c in range(cols):
                    if is_wall(g0[r][c]) or g0[r][c] == " ":
                        continue
                    if is_wall(g1[r][c]) or g1[r][c] == " ":
                        continue
                    a = cell_name(r, c, z)
                    b = cell_name(r, c, z + 1)
                    stairs.append((a, b))
                    stairs.append((b, a))

    out = []
    out.append(f"(define (problem {args.problem})")
    out.append(f"  (:domain {args.domain})")
    out.append("  (:objects")
    out.append("    " + " ".join(cells) + " - cell")
    if buttons:
        out.append("    " + " ".join(f"b{letter_index(b)}" for b in buttons) + " - button")
    if doors:
        out.append("    " + " ".join(f"d{letter_index(d)}" for d in doors) + " - door")
    out.append("    a1 - agent")
    out.append("  )")
    out.append("")
    out.append("  (:init")
    out.append(f"    (agent-at a1 {start})")
    out.append("    (agent-free a1)")
    out.append("")
    out.append("    ;; Adjacency for open corridors")
    for a, b in adjacency:
        out.append(f"    (adjacent {a} {b})")
    out.append("")
    if connects:
        out.append("    ;; Door edges (closed initially)")
        for d_id, a, b in connects:
            out.append(f"    (connects {d_id} {a} {b})")
        out.append("")
    if stairs:
        out.append("    ;; Stairs between layers")
        for a, b in stairs:
            out.append(f"    (stairs {a} {b})")
        out.append("")
    if buttons:
        out.append("    ;; Buttons open doors")
        for b in buttons:
            b_id = f"b{letter_index(b)}"
            d_id = f"d{letter_index(b)}"
            out.append(f"    (up {b_id} {d_id})")
        out.append("")
        out.append("    ;; Button locations")
        for b in buttons:
            b_id = f"b{letter_index(b)}"
            out.append(f"    (button-at {b_id} {button_cells[b]})")
        out.append("")

    out.append("    (= (total-cost) 0)")
    out.append("  )")
    out.append("")
    out.append("  (:goal (and")
    out.append(f"    (agent-at a1 {goal})")
    out.append("  ))")
    out.append("")
    out.append("  (:metric minimize (total-cost))")
    out.append(")")

    args.output.write_text("\n".join(out) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
