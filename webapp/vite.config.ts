import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is deployed as a standalone Vercel instance but is also reachable
// from the portfolio under `/projects/n-dim_maze_planner`. Configure the base
// path via env so it works both at the site root and behind that proxy path.
//   BASE_PATH=/projects/n-dim_maze_planner/ npm run build
const base = process.env.BASE_PATH ?? '/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep the (heavy) 3D stack in its own chunk so the editor loads fast.
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
