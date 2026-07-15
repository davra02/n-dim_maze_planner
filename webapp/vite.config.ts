import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from the portfolio at www.davidreyesales.com/maze_planner
// (a Next.js rewrite proxies that path to this standalone Vercel instance), so
// the emitted asset URLs must be absolute under that prefix. Overridable via
// env if the mount point ever changes:  BASE_PATH=/ npm run build
const base = process.env.BASE_PATH ?? '/maze_planner/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  // No manualChunks: the 3D stack is reached only through the lazy View3D
  // import, so Vite's automatic splitting already keeps it out of the entry.
  // Naming it as a manual chunk would make it a static dep of the entry.
});
