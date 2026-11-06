import { defineConfig, Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

/**
 * Add `<link rel="preload">` tags for the latin Barlow fonts. Without them the browser only requests the fonts once React
 * has rendered text, so they arrive late and the text reflows (layout shift) when they swap in.
 * Done in a plugin because the emitted font file names contain hashes. Build only; the dev server has no bundle.
 */
function preloadFonts(): Plugin {
    return {
        name: 'preload-fonts',
        transformIndexHtml: {
            order: 'post',
            handler: (_html, ctx) => Object.keys(ctx.bundle ?? {})
                .filter(fileName => /barlow-latin-(300|400|500)-normal-[\w-]+\.woff2$/.test(fileName))
                .map(fileName => ({
                    tag: 'link',
                    attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${fileName}`, crossorigin: true },
                    injectTo: 'head',
                })),
        },
    };
}

export default defineConfig({
    base: '/',   // Deployed at ps2iodb.com, no special base path needed.
    plugins: [
        react(),
        babel({ presets: [reactCompilerPreset()] }),
        preloadFonts(),
    ],
    server: {
        // this ensures that the browser opens upon server start
        open: true,
        // this sets a default port to 3000
        port: 3000,
        // listen on all interfaces so the dev server is reachable on the local network (e.g. from mobile phone)
        host: true,
    },
    resolve: {
        tsconfigPaths: true,
        alias: {
            // Stop 5000 requests being made for tablericons js chunks. Credit: https://www.reddit.com/r/reactjs/comments/1g3tsiy
            // /esm/icons/index.mjs only exports the icons statically, so no separate chunks are created
            '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
        }
    }
})
