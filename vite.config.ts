import { defineConfig } from 'vite';

export default defineConfig({
  // base: './',
  server: {
    port: 5173, // default Vite port
    proxy: {
      "/api": {
        target: "http://localhost:3000", // your Express backend
        changeOrigin: true,
        // rewrite: path => path.replace(/^\/api/, ""), // optional
      },
      "/ws": {
        target: "ws://localhost:3000", // if you use WebSockets
        ws: true
      }
    }
  }
});