import { defineConfig } from 'vite';
export default defineConfig({
    base: './',
    build: {
        outDir: '../3d', emptyOutDir: true, target: 'es2020',
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const match = id.match(/@babylonjs\/core\/([^/]+)\//);
                    if (match) return `babylon-${match[1].toLowerCase()}`;
                }
            }
        }
    }
});
