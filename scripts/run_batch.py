#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from pathlib import Path


def load_stats(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8", errors="ignore"))


def main():
    parser = argparse.ArgumentParser(
        description="Run OPTIC for all problems and store stats JSON per problem."
    )
    parser.add_argument(
        "--domain",
        type=Path,
        default=Path("domains/domain.pddl"),
        help="Domain PDDL path.",
    )
    parser.add_argument(
        "--problems-dir",
        type=Path,
        default=Path("problems"),
        help="Directory containing problem PDDL files.",
    )
    parser.add_argument(
        "--glob",
        default="*.pddl",
        help="Glob pattern for problems (default: *.pddl).",
    )
    parser.add_argument(
        "--stats-dir",
        type=Path,
        default=Path("stats"),
        help="Output directory for per-problem stats JSON.",
    )
    parser.add_argument(
        "--plan-dir",
        type=Path,
        default=None,
        help="Optional output directory for plan files.",
    )
    parser.add_argument(
        "--time-limit",
        type=float,
        default=60.0,
        help="Per-problem time limit in seconds.",
    )
    parser.add_argument(
        "--docker",
        action="store_true",
        help="Run OPTIC inside Docker.",
    )
    parser.add_argument(
        "--docker-image",
        default=None,
        help="Docker image tag (defaults to scripts/run_optic.py default).",
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Stop after the first solution (-N).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recompute stats even if JSON already exists.",
    )
    args = parser.parse_args()

    problems = sorted(args.problems_dir.glob(args.glob))
    if not problems:
        print(f"No problems found in {args.problems_dir} with {args.glob}", file=sys.stderr)
        sys.exit(2)

    args.stats_dir.mkdir(parents=True, exist_ok=True)
    if args.plan_dir:
        args.plan_dir.mkdir(parents=True, exist_ok=True)

    run_optic = Path("scripts/run_optic.py")
    if not run_optic.exists():
        print("scripts/run_optic.py not found.", file=sys.stderr)
        sys.exit(2)

    for problem in problems:
        stats_path = args.stats_dir / f"{problem.stem}.json"
        if stats_path.exists() and not args.force:
            stats = load_stats(stats_path)
            found = stats.get("plan", {}).get("found") if stats else None
            timed_out = stats.get("timed_out") if stats else None
            print(f"[skip] {problem.name} found={found} timed_out={timed_out}")
            continue

        cmd = [
            sys.executable,
            str(run_optic),
            str(args.domain),
            str(problem),
            "--time-limit",
            str(args.time_limit),
            "--stats-out",
            str(stats_path),
        ]
        if args.plan_dir:
            plan_path = args.plan_dir / f"{problem.stem}.out"
            cmd.extend(["--plan-out", str(plan_path)])
        if args.fast:
            cmd.append("--fast")
        if args.docker:
            cmd.append("--docker")
            if args.docker_image:
                cmd.extend(["--docker-image", args.docker_image])
        elif args.docker_image:
            cmd.extend(["--docker-image", args.docker_image])

        print(f"[run] {problem.name}")
        subprocess.run(cmd, check=False)

        stats = load_stats(stats_path)
        if stats:
            found = stats.get("plan", {}).get("found")
            actions = stats.get("plan", {}).get("actions")
            wall = stats.get("wall_seconds")
            timed_out = stats.get("timed_out")
            print(
                f"[done] {problem.name} found={found} actions={actions} wall={wall:.2f}s timed_out={timed_out}"
            )
        else:
            print(f"[warn] {problem.name} stats not written")


if __name__ == "__main__":
    main()
