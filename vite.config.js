import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Express backend (marketing site + API). Dashboard stays on Vite :5173/app.
const BACKEND = process.env.VITE_DEV_PROXY || 'http://localhost:3100';

// EC2 / Express serves the dashboard under /app/.
// Vercel hosts it at the site root — set VITE_BASE_PATH=/ in Vercel env.
const base = process.env.VITE_BASE_PATH || '/app/';

// Dev server proxies API, renders, and the marketing site to Express so
// relative href="/" stays on :5173 (no port hop to a stale client/dist).
export default defineConfig({
  base: base.endsWith('/') ? base : `${base}/`,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/renders': BACKEND,
      '/mail': BACKEND,
      '/brand': BACKEND,
      '/style-previews': BACKEND,
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
