import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

export default defineConfig({
  root: "src/",
  // publicDir: "./src/public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        ar: resolve(__dirname, "src/ar.html"),
        gallery: resolve(__dirname, "src/gallery.html"),
        room: resolve(__dirname, "src/room.html"),
      },
    },
  },
  server: {
    cors: true,
  },
});

