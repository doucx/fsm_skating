import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import yaml from '@modyfi/vite-plugin-yaml';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    yaml(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '花样滑冰 FSM 步法编排沙盒',
        short_name: 'FSM Skating',
        description: '基于有限状态机 (FSM) 的滑冰动力学与多样性自动校验系统',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
});