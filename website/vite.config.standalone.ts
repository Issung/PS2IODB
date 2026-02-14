import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Vite configuration for building a standalone HTML file with the Extractor feature.
 *
 * This produces a single HTML file with all CSS and JS inlined, which can be
 * opened directly in a browser without a server.
 *
 * Build command: npm run build:standalone
 * Output: dist-standalone/extractor.html (~1.3 MB, ~330 KB gzipped)
 */
export default defineConfig({
    base: './',
    plugins: [
        react({
            babel: {
                plugins: [
                    ["babel-plugin-react-compiler"],
                ],
            },
        }),
        viteTsconfigPaths(),
        viteSingleFile(),
    ],
    // Don't copy public directory assets - we only need the single HTML file
    publicDir: false,
    build: {
        outDir: 'dist-standalone',
        emptyOutDir: true,
        // Increase chunk size warning limit since we're inlining everything
        chunkSizeWarningLimit: 5000,
        rollupOptions: {
            input: {
                main: 'extractor.html',
            },
        },
    },
    resolve: {
        alias: {
            // Stop 5000 requests being made for tablericons js chunks
            '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
        }
    }
})

