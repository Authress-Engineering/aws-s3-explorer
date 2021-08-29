import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
// https://vitejs.dev/guide/build.html#public-base-path

export default defineConfig({
  plugins: [vue({
    preprocessStyles: true
  })],
  css: {
    preprocessorOptions: {
      scss: {}
    }
  },
  base: './'
});
