#!/usr/bin/env python3
import argparse
import json
import math
from pathlib import Path


def load_stats(path: Path):
    return json.loads(path.read_text(encoding="utf-8", errors="ignore"))


def metric_value(data: dict, metric: str):
    if metric in ("wall_seconds", "return_code", "timed_out"):
        return data.get(metric)
    if metric in ("actions", "makespan"):
        return data.get("plan", {}).get(metric)
    stats = data.get("stats", {})
    return stats.get(metric)


def main():
    parser = argparse.ArgumentParser(description="Plot bar charts from OPTIC stats JSON.")
    parser.add_argument(
        "--stats-dir",
        type=Path,
        default=Path("stats"),
        help="Directory with stats JSON files.",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("plots"),
        help="Output directory for PNG charts.",
    )
    parser.add_argument(
        "--metrics",
        default="metric,wall_seconds,states_evaluated",
        help="Comma-separated metrics to plot.",
    )
    parser.add_argument(
        "--sort-by",
        default=None,
        help="Sort problems by this metric (e.g. metric, wall_seconds).",
    )
    args = parser.parse_args()

    try:
        import matplotlib.pyplot as plt
    except Exception as exc:
        raise SystemExit(
            "matplotlib is required. Install with: python3 -m pip install matplotlib"
        ) from exc

    stats_files = sorted(args.stats_dir.glob("*.json"))
    if not stats_files:
        raise SystemExit(f"No stats JSON files found in {args.stats_dir}")

    data = []
    for path in stats_files:
        entry = load_stats(path)
        entry["_name"] = path.stem
        data.append(entry)

    metrics = [m.strip() for m in args.metrics.split(",") if m.strip()]
    if not metrics:
        raise SystemExit("No metrics specified.")

    if args.sort_by:
        sort_key = args.sort_by
        data.sort(
            key=lambda d: (metric_value(d, sort_key) is None, metric_value(d, sort_key))
        )

    names = [d["_name"] for d in data]
    args.out_dir.mkdir(parents=True, exist_ok=True)

    for metric in metrics:
        values = []
        missing = []
        for d in data:
            v = metric_value(d, metric)
            if v is None:
                missing.append(d["_name"])
                v = 0
            values.append(v)

        width = max(6, len(names) * 0.6)
        plt.figure(figsize=(width, 4))
        plt.bar(names, values, color="#4C78A8")
        plt.title(metric)
        plt.ylabel(metric)
        plt.xticks(rotation=45, ha="right")
        plt.tight_layout()

        out_path = args.out_dir / f"{metric}.png"
        plt.savefig(out_path, dpi=160)
        plt.close()

        if missing:
            print(f"[warn] Missing '{metric}' for: {', '.join(missing)}")

        print(f"[ok] Wrote {out_path}")


if __name__ == "__main__":
    main()
