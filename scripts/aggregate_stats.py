#!/usr/bin/env python3
import argparse
import csv
import json
from pathlib import Path


def load_stats(path: Path):
    return json.loads(path.read_text(encoding="utf-8", errors="ignore"))


def get_metric(entry: dict, key: str):
    if key in ("found", "actions", "makespan"):
        return entry.get("plan", {}).get(key)
    if key in ("wall_seconds", "timed_out", "return_code"):
        return entry.get(key)
    stats = entry.get("stats", {})
    return stats.get(key)


def main():
    parser = argparse.ArgumentParser(description="Aggregate OPTIC stats into CSV/Markdown.")
    parser.add_argument(
        "--stats-dir",
        type=Path,
        default=Path("stats"),
        help="Directory with stats JSON files.",
    )
    parser.add_argument(
        "--out-csv",
        type=Path,
        default=Path("stats/summary.csv"),
        help="CSV output path.",
    )
    parser.add_argument(
        "--out-md",
        type=Path,
        default=Path("stats/summary.md"),
        help="Markdown table output path.",
    )
    parser.add_argument(
        "--sort-by",
        default="metric",
        help="Sort by this metric (default: metric).",
    )
    args = parser.parse_args()

    stats_files = sorted(args.stats_dir.glob("*.json"))
    if not stats_files:
        raise SystemExit(f"No stats JSON files found in {args.stats_dir}")

    rows = []
    for path in stats_files:
        entry = load_stats(path)
        name = path.stem
        row = {
            "problem": name,
            "found": entry.get("plan", {}).get("found"),
            "actions": entry.get("plan", {}).get("actions"),
            "makespan": entry.get("plan", {}).get("makespan"),
            "metric": get_metric(entry, "metric"),
            "cost": get_metric(entry, "cost"),
            "states_evaluated": get_metric(entry, "states_evaluated"),
            "planner_time": get_metric(entry, "time"),
            "wall_seconds": entry.get("wall_seconds"),
            "timed_out": entry.get("timed_out"),
            "return_code": entry.get("return_code"),
        }
        rows.append(row)

    def sort_key(r):
        val = r.get(args.sort_by)
        return (val is None, val)

    rows.sort(key=sort_key)

    args.out_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    args.out_md.parent.mkdir(parents=True, exist_ok=True)
    md_lines = []
    headers = [
        "problem",
        "found",
        "metric",
        "makespan",
        "actions",
        "states_evaluated",
        "wall_seconds",
        "timed_out",
    ]
    md_lines.append("| " + " | ".join(headers) + " |")
    md_lines.append("| " + " | ".join("---" for _ in headers) + " |")
    for row in rows:
        values = []
        for h in headers:
            val = row.get(h)
            if isinstance(val, float):
                values.append(f"{val:.3f}")
            else:
                values.append(str(val))
        md_lines.append("| " + " | ".join(values) + " |")
    args.out_md.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(f"[ok] CSV: {args.out_csv}")
    print(f"[ok] MD:  {args.out_md}")


if __name__ == "__main__":
    main()
