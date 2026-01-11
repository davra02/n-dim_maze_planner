# n-maze_planner

PDDL maze problems + OPTIC planning + HTML 3D rendering.

## Quickstart (cross-platform with Docker)

Prereqs:
- Docker
- Python 3

### 1) Build the OPTIC Docker image

From the repo root:

```bash
docker build -f docker/optic/Dockerfile -t n-maze-planner-optic:latest .
```

Apple Silicon (M1/M2/M3):

```bash
docker build -f docker/optic/Dockerfile -t n-maze-planner-optic:arm64 .
```

### 2) Run the planner using Docker

Example:

```bash
python3 scripts/run_optic.py domains/domain.pddl problems/problem_5x5x5_two_agents.pddl \
  --docker --docker-image n-maze-planner-optic:latest \
  --fast --plan-out plans/plan_5x5x5_two_agents.out
```

Note: if you use `--plan-out`, make sure the output directory exists (e.g. `plans/`).

PowerShell example:

```powershell
New-Item -ItemType Directory -Force plans | Out-Null
python scripts\run_optic.py domains\domain.pddl problems\problem_5x5x5_two_agents.pddl `
  --docker --docker-image n-maze-planner-optic:latest `
  --fast --plan-out plans\plan_5x5x5_two_agents.out
```

Apple Silicon example:

```bash
python3 scripts/run_optic.py domains/domain.pddl problems/problem_5x5x5_two_agents.pddl \
  --docker --docker-image n-maze-planner-optic:arm64 \
  --fast --plan-out plans/plan_5x5x5_two_agents.out
```

### 3) Render HTML

Single HTML with both agents:

```bash
python3 scripts/render_3d.py problems/problem_5x5x5_two_agents.pddl \
  3d_renders/maze_5x5x5_two_agents_both_file.html \
  --plan plans/plan_5x5x5_two_agents.out --file --agents a1,a2
```

## Scripts

This repo includes a few small CLI scripts under `scripts/`.

### `scripts/run_optic.py`

Run OPTIC, print a cleaned plan + stats, and optionally write the plan to a `.out` file.

Usage:

```bash
python3 scripts/run_optic.py <domain.pddl> <problem.pddl> [options]
```

Options:
- `--planner <path>`: path to `optic-clp` (default: `planners/optic/optic/release/optic/optic-clp`)
- `--docker`: run OPTIC inside Docker (cross-platform)
- `--docker-image <tag>`: Docker image tag (default depends on CPU arch; `:arm64` on Apple Silicon)
- `--time-limit <seconds>`: hard time limit; stops OPTIC after this many seconds (still prints any plan found so far)
- `--stats-out <path.json>`: write a JSON summary (plan + stats + run config)
- `--fast`: stop after the first solution (`-N`)
- `--plan-out <path>`: write extracted plan in `plan.out`-style format
- `--raw`: print full raw planner output
- `--validate`: validate plan with VAL (`validate`/`val` in PATH)
- `--grid`: print an ASCII grid view for 2D problems that use `cXY` cell names

Examples:

```bash
python3 scripts/run_optic.py domains/domain.pddl problems/problem_3x3x5.pddl --fast --plan-out plans/plan_3x3x5.out
```

Docker:

```bash
python3 scripts/run_optic.py domains/domain.pddl problems/problem_5x5x5_two_agents.pddl \
  --docker --docker-image n-maze-planner-optic:latest \
  --fast --plan-out plans/plan_5x5x5_two_agents.out
```

Time-budgeted run (example: 30s):

```bash
python3 scripts/run_optic.py domains/domain.pddl problems/problem_5x5x5_two_agents.pddl \
  --docker --docker-image n-maze-planner-optic:latest \
  --time-limit 30 --plan-out plans/plan_5x5x5_two_agents_30s.out
```

Time-budgeted run + JSON stats (example: 30s):

```bash
python3 scripts/run_optic.py domains/domain.pddl problems/problem_5x5x5_two_agents.pddl \
  --docker --docker-image n-maze-planner-optic:latest \
  --time-limit 30 \
  --plan-out plans/plan_5x5x5_two_agents_30s.out \
  --stats-out plans/plan_5x5x5_two_agents_30s.stats.json
```

### `scripts/render_3d.py`

Render an interactive HTML view of a 3D maze problem, optionally overlaying the plan path.

Usage:

```bash
python3 scripts/render_3d.py <problem.pddl> <output.html> [options]
```

Options:
- `--plan <path>`: optional plan `.out` file to highlight the path
- `--agent <name>`: render a single agent (multi-agent problems). Defaults to `a1` or the first declared agent
- `--agents a1,a2,...`: render multiple agents together (overrides `--agent`)
- `--cdn`: use Three.js from CDN instead of local `scripts/vendor/` files
- `--file`: generate a `file://` compatible render (Babylon.js)

Examples:

```bash
python3 scripts/render_3d.py problems/problem_3x3x5.pddl 3d_renders/maze_3x3x5_file.html \
  --plan plans/plan_3x3x5.out --file
```

Two agents in one HTML:

```bash
python3 scripts/render_3d.py problems/problem_5x5x5_two_agents.pddl 3d_renders/maze_5x5x5_two_agents_file.html \
  --plan plans/plan_5x5x5_two_agents.out --file --agents a1,a2
```

### `scripts/pddl_to_dot.py`

Generate a Graphviz DOT graph from a problem PDDL, and optionally overlay the plan path (colored by agent).

Usage:

```bash
python3 scripts/pddl_to_dot.py <problem.pddl> <output.dot> [options]
```

Modes:
- Without `--plan`: outputs the connectivity graph (edges for `adjacent`, `connects`/doors, `stairs`, `elevator-connects`).
- With `--plan`: overlays the plan path per agent (human-readable labels in Spanish).

Options (with `--plan`):
- `--plan <path>`: plan `.out` file
- `--agents a1,a2,...`: restrict to these agents (otherwise inferred from the plan)
- `--full-graph`: include full graph as gray background + colored path (default)
- `--as-before`: draw only the plan path (no background graph)

Examples:

```bash
python3 scripts/pddl_to_dot.py problems/problem_5x5x5_two_agents.pddl graphs/plan_two_agents.dot \
  --plan plans/plan_5x5x5_two_agents.out --agents a1,a2 --full-graph
```

Render to PNG (requires Graphviz):

```bash
dot -Tpng graphs/plan_two_agents.dot -o graphs/plan_two_agents.png
```

### `scripts/grid_to_pddl.py`

Convert an ASCII grid (2D or multi-layer 3D) into a PDDL problem.

Usage:

```bash
python3 scripts/grid_to_pddl.py <grid.txt> <output.pddl> [options]
```

Options:
- `--domain <name>`: domain name (default: `temporal-maze`)
- `--problem <name>`: problem name (default: `maze-2d-generated`)
- `--stairs`: connect matching coordinates between layers with `stairs`

Grid format (summary):
- `#` or space: wall / not traversable
- `S`: start
- `G`: goal
- `a..z`: door cells (each distinct letter becomes a door)
- `A..Z` (except `S`/`G`): button cells; button `A` opens door `a` (same letter)
- Use a line `---` to separate layers for 3D

### `scripts/gen_problem_3d.py`

Generate a sparse 10x10x10 3D problem (example generator).

Usage:

```bash
python3 scripts/gen_problem_3d.py <output_problem.pddl>
```

## Notes

- If you have a native OPTIC binary, `scripts/run_optic.py` can run it via `--planner`.
- If the native binary isn't present, `scripts/run_optic.py` will automatically fall back to Docker if `docker` is available.
- Windows: works with Docker Desktop (WSL2 backend recommended). You can build/run either from WSL or PowerShell.

### Windows (WSL2) quick guide

In WSL (Ubuntu):

```bash
docker build -f docker/optic/Dockerfile -t n-maze-planner-optic:latest .
python3 scripts/run_optic.py domains/domain.pddl problems/problem_3x3x5.pddl \
  --docker --docker-image n-maze-planner-optic:latest --fast
```

### Windows (PowerShell) quick guide

From repo root in PowerShell:

```powershell
docker build -f docker/optic/Dockerfile -t n-maze-planner-optic:latest .
python scripts\run_optic.py domains\domain.pddl problems\problem_3x3x5.pddl `
  --docker --docker-image n-maze-planner-optic:latest --fast
```
