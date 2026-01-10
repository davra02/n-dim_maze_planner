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
