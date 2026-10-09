import { defineConfig } from 'vite';
export default defineConfig({
    base: './',
    build: {
        outDir: '../3d', emptyOutDir: true, target: 'es2020',
        rollupOptions: {
            preserveEntrySignatures: 'strict',
            output: { preserveModules: true }
        }
    }
});
