#!/usr/bin/env python3
import argparse
import json
import platform
import re
import subprocess
import sys
import shutil
from pathlib import Path

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
PLAN_RE = re.compile(r"^\s*([0-9]+(?:\.[0-9]+)?):\s+\(([^)]+)\)\s+\[([0-9]+(?:\.[0-9]+)?)\]", re.M)
CELL_RE = re.compile(r"\bc(\d+)[,_]?(\d+)\b")


def strip_ansi(text: str) -> str:
    return ANSI_RE.sub("", text)


def extract_plan(text: str):
    chunk = text
    if ";;;; Solution Found" in text:
        chunk = text.split(";;;; Solution Found")[-1]
    plan = PLAN_RE.findall(chunk)
    if not plan:
        plan = PLAN_RE.findall(text)
    return [
        {
            "start": float(start),
            "action": action,
            "dur": float(dur),
            "end": float(start) + float(dur),
        }
        for start, action, dur in plan
    ]


def extract_stat(pattern: str, text: str):
    match = re.findall(pattern, text)
    return match[-1] if match else None


def parse_problem_cells(problem_path: Path):
    text = problem_path.read_text(encoding="utf-8", errors="ignore")
    obj_block = ""
    match = re.search(r"\(:objects(.*?)\)\s*", text, re.S | re.I)
    if match:
        obj_block = match.group(1)

    cells = set()
    for name in re.findall(r"\bc\w+\b", obj_block):
        m = CELL_RE.match(name)
        if m:
            cells.add(name)

    start = None
    goal = None
    # Multi-agent format: (agent-at a1 cXY)
    init_at = re.search(r"\(agent-at\s+\w+\s+(c\\w+)\)", text)
    if init_at:
        start = init_at.group(1)
    goal_at = re.search(r"\(agent-at\s+\w+\s+(c\\w+)\)", text[text.find("(:goal"):])
    if goal_at:
        goal = goal_at.group(1)

    # Back-compat (old single-agent): (at cXY)
    if start is None:
        init_at_old = re.search(r"\(at\s+(c\\w+)\)", text)
        if init_at_old:
            start = init_at_old.group(1)
    if goal is None:
        goal_at_old = re.search(r"\(at\s+(c\\w+)\)", text[text.find("(:goal"):])
        if goal_at_old:
            goal = goal_at_old.group(1)

    coords = {}
    for cell in cells:
        m = CELL_RE.match(cell)
        if m:
            coords[cell] = (int(m.group(1)), int(m.group(2)))

    return coords, start, goal


def extract_path_cells(plan):
    cells = []
    for step in plan:
        parts = step["action"].split()
        if not parts:
            continue
        action = parts[0]

        # Multi-agent actions: action a1 from to ...
        if action in {"move", "move-through-door", "take-stairs", "take-elevator"} and len(parts) >= 4:
            cells.append(parts[2])
            cells.append(parts[3])
            continue

        # Back-compat (old format): action from to ...
        if action in {"move", "move-through-door", "take-stairs", "take-elevator"} and len(parts) >= 3:
            cells.append(parts[1])
            cells.append(parts[2])
    return list(dict.fromkeys(cells))


def format_grid(coords, start, goal, path_cells):
    if not coords:
        return "Grid view not available (no cell coords found)."

    xs = [xy[0] for xy in coords.values()]
    ys = [xy[1] for xy in coords.values()]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    path_set = set(path_cells)

    lines = ["Grid (row=x, col=y)"]
    for x in range(min_x, max_x + 1):
        row = []
        for y in range(min_y, max_y + 1):
            name = f"c{x}{y}"
            if name not in coords:
                row.append(" ")
                continue
            if name == start:
                row.append("S")
            elif name == goal:
                row.append("G")
            elif name in path_set:
                row.append("*")
            else:
                row.append(".")
        lines.append(" ".join(row))
    return "\n".join(lines)


def format_plan(plan):
    if not plan:
        return "No plan found in output."

    makespan = max(step["end"] for step in plan)
    lines = []
    lines.append(f"Plan (actions={len(plan)}, makespan={makespan:.3f})")
    lines.append("Start   Dur    End    Action")
    for step in plan:
        lines.append(f"{step['start']:>6.3f}  {step['dur']:>5.3f}  {step['end']:>6.3f}  {step['action']}")
    return "\n".join(lines)


def format_stats(text):
    cost = extract_stat(r"; Cost:\s*([0-9]+(?:\.[0-9]+)?)", text)
    time = extract_stat(r"; Time\s*([0-9]+(?:\.[0-9]+)?)", text)
    states = extract_stat(r"; States evaluated:?\s*([0-9]+)", text)
    metric = extract_stat(r"; Plan found with metric\s*([0-9]+(?:\.[0-9]+)?)", text)

    lines = ["Stats"]
    if cost is not None:
        lines.append(f"Cost: {cost}")
    if metric is not None:
        lines.append(f"Metric: {metric}")
    if time is not None:
        lines.append(f"Time: {time}s")
    if states is not None:
        lines.append(f"States evaluated: {states}")

    if len(lines) == 1:
        return "Stats not found in output."
    return "\n".join(lines)


def parse_stats(text: str):
    """Return a machine-readable stats dict extracted from OPTIC output."""
    cost = extract_stat(r"; Cost:\s*([0-9]+(?:\.[0-9]+)?)", text)
    time = extract_stat(r"; Time\s*([0-9]+(?:\.[0-9]+)?)", text)
    states = extract_stat(r"; States evaluated:?\s*([0-9]+)", text)
    metric = extract_stat(r"; Plan found with metric\s*([0-9]+(?:\.[0-9]+)?)", text)

    out = {}
    if cost is not None:
        out["cost"] = float(cost)
    if metric is not None:
        out["metric"] = float(metric)
    if time is not None:
        out["time_seconds"] = float(time)
    if states is not None:
        out["states_evaluated"] = int(states)
    return out

def write_plan_file(plan, path: Path):
    lines = []
    for step in plan:
        lines.append(f"{step['start']:.3f}: ({step['action']}) [{step['dur']:.3f}]")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_stats_file(payload: dict, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def find_val_binary():
    for name in ["validate", "val"]:
        found = shutil.which(name)
        if found:
            return Path(found)
    return None


def repo_root() -> Path:
    # scripts/run_optic.py -> scripts -> repo
    return Path(__file__).resolve().parent.parent


def docker_available() -> bool:
    return shutil.which("docker") is not None


def default_docker_image() -> str:
    arch = platform.machine().lower()
    if arch in ("arm64", "aarch64"):
        return "n-maze-planner-optic:arm64"
    return "n-maze-planner-optic:latest"


def build_docker_cmd(
    image: str,
    domain: Path,
    problem: Path,
    fast: bool,
):
    root = repo_root().resolve()
    domain_abs = domain.resolve()
    problem_abs = problem.resolve()

    if not domain_abs.is_relative_to(root) or not problem_abs.is_relative_to(root):
        raise ValueError(
            "Docker mode requires domain/problem inside the repo so they can be volume-mounted."
        )

    domain_rel = domain_abs.relative_to(root)
    problem_rel = problem_abs.relative_to(root)

    cmd = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{root}:/work",
        "-w",
        "/work",
        image,
    ]
    if fast:
        cmd.append("-N")
    cmd.extend([str(domain_rel.as_posix()), str(problem_rel.as_posix())])
    return cmd


def main():
    parser = argparse.ArgumentParser(description="Run OPTIC and pretty-print plan and stats.")
    parser.add_argument("domain", type=Path)
    parser.add_argument("problem", type=Path)
    parser.add_argument(
        "--planner",
        type=Path,
        default=Path("planners/optic/optic/release/optic/optic-clp"),
        help="Path to optic-clp",
    )
    parser.add_argument(
        "--docker",
        action="store_true",
        help="Run OPTIC inside Docker (cross-platform).",
    )
    parser.add_argument(
        "--docker-image",
        default=default_docker_image(),
        help="Docker image tag to use when running OPTIC in Docker.",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Print full raw planner output",
    )
    parser.add_argument(
        "--time-limit",
        type=float,
        default=None,
        help="Time limit in seconds (kills the planner process after this time).",
    )
    parser.add_argument(
        "--stats-out",
        type=Path,
        default=None,
        help="Write a JSON summary (plan + stats + run config) to this file.",
    )
    parser.add_argument(
        "--plan-out",
        type=Path,
        help="Write the extracted plan to this file",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate plan with VAL if available",
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Stop after the first solution (-N)",
    )
    parser.add_argument(
        "--grid",
        action="store_true",
        help="Print ASCII grid visualization for 2D cXY cells",
    )
    args = parser.parse_args()

    use_docker = args.docker
    if not use_docker and not args.planner.exists():
        # Convenient fallback: if local binary isn't present, try Docker if available.
        if docker_available():
            use_docker = True
        else:
            print(f"Planner not found: {args.planner}", file=sys.stderr)
            print("Hint: build it, or use --docker (requires Docker).", file=sys.stderr)
            sys.exit(2)

    if use_docker:
        if not docker_available():
            print("Docker not found in PATH. Install Docker Desktop/Engine.", file=sys.stderr)
            sys.exit(2)
        try:
            cmd = build_docker_cmd(
                image=args.docker_image,
                domain=args.domain,
                problem=args.problem,
                fast=args.fast,
            )
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            sys.exit(2)
    else:
        cmd = [str(args.planner)]
        if args.fast:
            cmd.append("-N")
        cmd.extend([str(args.domain), str(args.problem)])
    timed_out = False
    proc_returncode = 0
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=args.time_limit,
        )
        proc_returncode = proc.returncode
        output = strip_ansi((proc.stdout or "") + (proc.stderr or ""))
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        proc_returncode = 124
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        output = strip_ansi(stdout + stderr)
    except OSError as exc:
        print(f"Failed to run planner: {exc}", file=sys.stderr)
        sys.exit(2)

    plan = extract_plan(output)
    stats = parse_stats(output)

    # Optional machine-readable output for experiments / reports.
    if args.stats_out:
        makespan = max((step["end"] for step in plan), default=0.0)
        stats_payload = {
            "domain": str(args.domain),
            "problem": str(args.problem),
            "mode": "docker" if use_docker else "native",
            "docker_image": args.docker_image if use_docker else None,
            "planner": None if use_docker else str(args.planner),
            "fast": bool(args.fast),
            "time_limit_seconds": args.time_limit,
            "timed_out": timed_out,
            "return_code": proc_returncode,
            "plan": {
                "found": bool(plan),
                "actions": len(plan),
                "makespan": float(makespan),
            },
            "stats": stats,
        }
        if args.plan_out:
            stats_payload["plan_out"] = str(args.plan_out)
        write_stats_file(stats_payload, args.stats_out)

    if args.raw:
        print(output)
        if timed_out:
            print()
            print(f"Timed out after {args.time_limit:.1f}s")
        return

    print(format_plan(plan))
    print()
    print(format_stats(output))

    if args.plan_out and plan:
        write_plan_file(plan, args.plan_out)

    if args.validate and plan:
        plan_path = args.plan_out
        if plan_path is None:
            plan_path = Path("plan.out")
            write_plan_file(plan, plan_path)

        val = find_val_binary()
        if val is None:
            print()
            print("VAL validator not found in PATH (try: validate or val)")
        else:
            cmd = [str(val), "-t", "0.001", str(args.domain), str(args.problem), str(plan_path)]
            proc_val = subprocess.run(cmd, capture_output=True, text=True, check=False)
            print()
            print("VAL output")
            print(strip_ansi((proc_val.stdout or "") + (proc_val.stderr or "")))

    if args.grid:
        coords, start, goal = parse_problem_cells(args.problem)
        path_cells = extract_path_cells(plan)
        print()
        print(format_grid(coords, start, goal, path_cells))

    if timed_out:
        print()
        print(f"Timed out after {args.time_limit:.1f}s")

    if proc_returncode != 0 and not timed_out:
        print()
        print(f"Planner exited with code {proc_returncode}")


if __name__ == "__main__":
    main()
