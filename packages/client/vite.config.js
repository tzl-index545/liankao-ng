import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ElementPlusStyles from "unplugin-element-plus/vite";

export default defineConfig({
  plugins: [
    vue(),
    ElementPlusStyles(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{
            // Merge only imported component styles; keep component JS and KaTeX lazy.
            name: 'element-plus-styles',
            test: /node_modules[\\/]element-plus[\\/]theme-chalk[\\/]/,
          }],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
});
