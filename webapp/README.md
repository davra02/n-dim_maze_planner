# n-dim maze planner — web editor & visualizer

Interactive web front-end for the [`n-maze_planner`](../) project: design
multidimensional maze problems visually, generate PDDL compatible with the fixed
`temporal-maze` domain, run/show a plan, and visualize the result adaptively per
dimensionality (2D grid, 3D interactive, 4D+ slices + graph).

The **domain is not editable** here — the app only produces problems valid for
`domains/domain.pddl`.

## Stack

- **Vite + React + TypeScript** (static SPA, deploys to Vercel).
- **Tailwind CSS** for styling.
- **React Three Fiber + drei** for the 3D view; **SVG** for the grid & graph views.
- **Zustand** for local state.

No external services — the app is fully functional on first load using an
in-browser mock planner.

## Run

```bash
cd webapp
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/  (static)
npm run preview  # serve the production build
```

## How it's organized

```
src/
  types/      maze.ts (domain model)   plan.ts (plan + stats, mirrors stats.json)
  domain/     coords · adjacency (derived) · pddlGenerator · pddlParser · planPath
  services/   plannerService (interface) · mockPlanner (Dijkstra) · planParse
  data/       examples.ts (4 bundled demos)
  state/      store.ts (Zustand)
  components/ layout · editor · viz · panels
```

- **Model is coordinate-first.** A cell is an integer tuple; string ids
  (`c0_1_2`) are derived in `domain/coords.ts`. Adjacency is *derived* from free
  neighboring cells (`domain/adjacency.ts`), never stored — a door replaces the
  free edge between its two cells.
- **PDDL generation** (`domain/pddlGenerator.ts`) emits the exact template used
  by `problems/*.pddl`: bidirectional `adjacent`/`connects`/`stairs`/
  `elevator-connects`, `up`/`up-elevator`/`button-at`, timed initial literals,
  `(= (total-cost) 0)`, a conjunctive goal and `(:metric minimize (total-cost))`.
- **Adaptive visualization** (`components/viz/VizSwitcher.tsx`) recommends a view
  from the number of dimensions: 2D→grid, 3D→3D render, 4D+→slices + graph.

## Deployment (Vercel)

The app is deployed as its **own Vercel project** and is reached from the
portfolio at `www.davidreyesales.com/maze_planner`, which proxies that path here
via a Next.js rewrite. Two pieces make this work:

1. **This app** builds with `base = '/maze_planner/'` (see `vite.config.ts`), so
   `index.html` references `/maze_planner/assets/...` — absolute URLs that stay
   valid under the portfolio domain. Override with `BASE_PATH=/ npm run build`
   if you ever mount it at a root instead.
2. **The portfolio** (`my-portfolio`, Next.js) rewrites the path to this
   deployment, stripping the prefix:

   ```ts
   // next.config.ts
   async rewrites() {
     return [
       { source: '/maze_planner', destination: 'https://<this-app>.vercel.app' },
       { source: '/maze_planner/:path*', destination: 'https://<this-app>.vercel.app/:path*' },
     ];
   }
   ```

Vercel project settings for this app: **Root Directory = `webapp`** (the repo
root is the Python project). `vercel.json` handles SPA routing and also maps
`/maze_planner/assets/*` → `/assets/*`, so the standalone `*.vercel.app` URL
keeps working on its own.

## Connecting a real OPTIC backend (future)

The only integration seam is `PlannerService` (`services/plannerService.ts`):

```ts
interface PlannerService {
  solve(problem: MazeProblem): Promise<PlanResult>;
  readonly label: string;
}
```

Today it's implemented by `mockPlanner` (an in-browser Dijkstra over the derived
graph, honoring the domain action costs). A real backend implementation would:

1. `generatePddl(problem)` → the PDDL string (already used by the PDDL panel).
2. `POST` `{ domain: fixed, problem: pddl }` to an endpoint that wraps
   [`scripts/run_optic.py`](../scripts/run_optic.py):
   `run_optic.py domains/domain.pddl <problem> --docker --fast --plan-out … --stats-out …`
3. Parse the `.out` plan with `services/planParse.ts` (`parsePlanLines`) and map
   the `stats.json` fields into `PlanStats` (same schema already produced here).
4. Return the identical `PlanResult`.

Swapping mock ↔ real is a one-line change at the call site in `state/store.ts`
(`mockPlanner.solve` → `opticService.solve`).
```
