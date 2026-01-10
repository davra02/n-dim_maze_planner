#!/usr/bin/env python3
import argparse
from pathlib import Path


def cell(z, r, c):
    return f"c{z}_{r}_{c}"


def add_edge(edges, a, b):
    edges.add((a, b))
    edges.add((b, a))


def main():
    parser = argparse.ArgumentParser(description="Generate a sparse 3D maze problem (10x10x10).")
    parser.add_argument("output", type=Path, help="Output problem.pddl path")
    args = parser.parse_args()

    size = 10
    levels = 10

    cells = set()
    adjacency = set()
    connects = []
    stairs = set()
    elevator_edges = set()

    # Base path: row 0 across all levels
    for z in range(levels):
        for c in range(size):
            cells.add(cell(z, 0, c))

    # Doors (button-controlled and timed)
    door_edges = {
        "d1": ((0, 0, 3), (0, 0, 4)),
        "d2": ((3, 0, 5), (3, 0, 6)),
        "d3": ((6, 0, 4), (6, 0, 5)),
        "d4": ((8, 0, 7), (8, 0, 8)),
        "d5": ((4, 0, 7), (4, 0, 8)),  # timed
        "d6": ((7, 0, 2), (7, 0, 3)),  # timed
    }

    # Adjacency along row 0, skipping door edges
    door_edge_set = set()
    for d, (a, b) in door_edges.items():
        door_edge_set.add((a, b))
        door_edge_set.add((b, a))

    for z in range(levels):
        for c in range(size - 1):
            a = (z, 0, c)
            b = (z, 0, c + 1)
            if (a, b) in door_edge_set:
                continue
            add_edge(adjacency, cell(*a), cell(*b))

    # Button branches (row 1 -> row 2)
    button_positions = {
        "b1": (0, 2, 2),
        "b2": (3, 2, 5),
        "b3": (6, 2, 4),
        "b4": (8, 2, 7),
        "b5": (1, 2, 5),  # elevator activation
    }

    for b, (z, r, c) in button_positions.items():
        cells.add(cell(z, 1, c))
        cells.add(cell(z, 2, c))
        add_edge(adjacency, cell(z, 0, c), cell(z, 1, c))
        add_edge(adjacency, cell(z, 1, c), cell(z, 2, c))

    # Extra low-density alternative corridors
    alt_segments = [
        (0, 1, 1, 3),
        (1, 1, 4, 6),
        (5, 1, 2, 4),
        (6, 1, 6, 8),
    ]
    for z, r, c_start, c_end in alt_segments:
        for c in range(c_start, c_end + 1):
            cells.add(cell(z, r, c))
        for c in range(c_start, c_end):
            add_edge(adjacency, cell(z, r, c), cell(z, r, c + 1))
        # Connect ends to main path
        add_edge(adjacency, cell(z, 0, c_start), cell(z, r, c_start))
        add_edge(adjacency, cell(z, 0, c_end), cell(z, r, c_end))

    # Stairs between levels (except level 2 -> 3 to force elevator)
    for z in range(levels - 1):
        if z == 2:
            continue
        a = cell(z, 0, 9)
        b = cell(z + 1, 0, 9)
        stairs.add((a, b))
        stairs.add((b, a))

    # Elevator between level 2 and 3
    elevator_edges.add((cell(2, 0, 5), cell(3, 0, 5)))
    elevator_edges.add((cell(3, 0, 5), cell(2, 0, 5)))

    # Door connections
    for d, (a, b) in door_edges.items():
        a_name = cell(*a)
        b_name = cell(*b)
        connects.append((d, a_name, b_name))
        connects.append((d, b_name, a_name))

    # Collect all cells used in edges
    for a, b in list(adjacency) + list(stairs) + list(elevator_edges):
        cells.add(a)
        cells.add(b)
    for _, a, b in connects:
        cells.add(a)
        cells.add(b)

    # PDDL output
    out = []
    out.append("(define (problem maze-3d-10x10x10)")
    out.append("  (:domain temporal-maze)")
    out.append("  (:objects")
    out.append("    " + " ".join(sorted(cells)) + " - cell")
    out.append("    " + " ".join(sorted(button_positions.keys())) + " - button")
    out.append("    d1 d2 d3 d4 d5 d6 - door")
    out.append("    e1 - elevator")
    out.append("    a1 - agent")
    out.append("  )")
    out.append("")
    out.append("  (:init")
    out.append(f"    (agent-at a1 {cell(0,0,0)})")
    out.append("    (agent-free a1)")
    out.append("")
    out.append("    ;; Adjacency for open corridors")
    for a, b in sorted(adjacency):
        out.append(f"    (adjacent {a} {b})")
    out.append("")
    out.append("    ;; Door edges (closed initially)")
    for d, a, b in connects:
        out.append(f"    (connects {d} {a} {b})")
    out.append("")
    out.append("    ;; Stairs between levels")
    for a, b in sorted(stairs):
        out.append(f"    (stairs {a} {b})")
    out.append("")
    out.append("    ;; Elevator connections")
    for a, b in sorted(elevator_edges):
        out.append(f"    (elevator-connects e1 {a} {b})")
    out.append("")
    out.append("    ;; Buttons open doors")
    out.append("    (up b1 d1)")
    out.append("    (up b2 d2)")
    out.append("    (up b3 d3)")
    out.append("    (up b4 d4)")
    out.append("    (up-elevator b5 e1)")
    out.append("")
    out.append("    ;; Button locations")
    for b, (z, r, c) in button_positions.items():
        out.append(f"    (button-at {b} {cell(z, r, c)})")
    out.append("")
    out.append("    ;; Timed doors")
    out.append("    (at 30 (door-open d5))")
    out.append("    (at 200 (not (door-open d5)))")
    out.append("    (at 120 (door-open d6))")
    out.append("    (at 300 (not (door-open d6)))")
    out.append("")
    out.append("    (= (total-cost) 0)")
    out.append("  )")
    out.append("")
    out.append("  (:goal (and")
    out.append(f"    (agent-at a1 {cell(9,0,9)})")
    out.append("  ))")
    out.append("")
    out.append("  (:metric minimize (total-cost))")
    out.append(")")

    args.output.write_text("\n".join(out) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
