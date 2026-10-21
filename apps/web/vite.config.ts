import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    base: "./",
    plugins: [
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
        }),
        react({
            babel: {
                plugins: ["babel-plugin-react-compiler"],
            },
        }),
        tailwindcss(),
    ],
    clearScreen: false,
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        host: process.env.HOST ?? "localhost",
        port: Number.parseInt(process.env.PORT ?? "5173", 10),
        strictPort: true,
    },
});
