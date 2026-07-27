import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Express backend (marketing site + API). Dashboard stays on Vite :5173/app.
const BACKEND = 'http://localhost:3100';

// Dev server proxies API, renders, and the marketing site to Express so
// relative href="/" stays on :5173 (no port hop to a stale client/dist).
export default defineConfig({
  // The dashboard is served under /app by the Express server in production.
  base: '/app/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/renders': BACKEND,
      '/mail': BACKEND,
      '/brand': BACKEND,
      '/site': BACKEND,
      '/demo-widget.js': BACKEND,
      // Marketing homepage only — Vite keeps ownership of /app/*
      '^/$': BACKEND,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
