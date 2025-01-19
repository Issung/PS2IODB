import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteTsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    base: '/',   // Deployed at ps2iodb.com, no special base path needed.
    plugins: [react(), viteTsconfigPaths()],
    server: {
        // this ensures that the browser opens upon server start
        open: true,
        // this sets a default port to 3000  
        port: 3000,
    },
    resolve: {
        alias: {
            // Stop 5000 requests being made for tablericons js chunks. Credit: https://www.reddit.com/r/reactjs/comments/1g3tsiy
            // /esm/icons/index.mjs only exports the icons statically, so no separate chunks are created
            '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
        }
    }
})
