import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // CRITICAL FOR ELECTRON FILE:// PROTOCOL (prevents blank/blue screen on packaged .dmg)
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist/renderer',
  },
});
