#!/usr/bin/env python3
import argparse
import re
from pathlib import Path

EDGE_RE = re.compile(r"\((adjacent|connects|stairs|elevator-connects)\s+(\S+)\s+(\S+)(?:\s+(\S+))?\)")


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
    parser = argparse.ArgumentParser(description="Convert PDDL problem to DOT graph.")
    parser.add_argument("problem", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    text = args.problem.read_text(encoding="utf-8", errors="ignore")
    edges = parse_edges(text)
    args.output.write_text(to_dot(edges) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
