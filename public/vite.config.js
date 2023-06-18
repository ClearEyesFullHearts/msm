import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const hash = process.env.BUILD_HASH;
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].${hash}.js`,
          chunkFileNames: `assets/[name].${hash}.js`,
          assetFileNames: `assets/[name].${hash}.[ext]`,
        },
      },
    },
  };
});
