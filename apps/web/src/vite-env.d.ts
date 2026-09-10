/// <reference types="vite/client" />

import type { ChromaTransport } from "@project-chroma/contracts/ipc";

declare global {
    interface Window {
        chroma?: ChromaTransport;
    }
}
