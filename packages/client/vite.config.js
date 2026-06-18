import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ElementPlusStyles from "unplugin-element-plus/vite";

export default defineConfig({
  plugins: [
    vue(),
    ElementPlusStyles(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
});
