import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createInpiProcessProxyPlugin } from './scripts/inpiProcessProxy'
import { createInpiWatchProxyPlugin } from './scripts/inpiWatchProxy'
import { createForumModerationProxyPlugin } from './scripts/forumModerationProxy'
import { createTeacherVerifyProxyPlugin } from './scripts/teacherVerifyProxy'
import { createLattesExtractProxyPlugin } from './scripts/lattesExtractProxy'

export default defineConfig({
  plugins: [
    react(),
    createInpiProcessProxyPlugin(),
    createInpiWatchProxyPlugin(),
    createForumModerationProxyPlugin(),
    createTeacherVerifyProxyPlugin(),
    createLattesExtractProxyPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      clientPort: 5173,
    },
    allowedHosts: ['kind-results-reply.loca.lt', 'poptec.loca.lt', '0.0.0.0', 'localhost'],
  },
})
