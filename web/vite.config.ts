import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/activity-rule-editor/",
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  define: {
    // 生产环境设置 API 前缀
    ...(mode === "production" && {
      "import.meta.env.VITE_API_BASE": JSON.stringify("/activity-rule-editor"),
    }),
  },
  server: {
    allowedHosts: [
      ".ngrok-free.dev",
      ".ngrok.io",
      ".ngrok.app",
      ".trycloudflare.com",
    ],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/media": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
}));
