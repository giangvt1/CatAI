import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for GitHub Pages
  base: './',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['marked', 'dompurify'],
          app: ['./src/main.ts']
        }
      }
    }
  },
  
  // Server configuration
  server: {
    port: 5173,
    strictPort: false,
    open: true
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
