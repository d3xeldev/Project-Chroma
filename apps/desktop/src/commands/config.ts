import { Effect } from "effect";
import { ipc } from "@project-chroma/contracts/ipc";
import { registerHandler } from "./ipc.ts";
import type { ConfigStore } from "../lib/config.ts";

export function registerConfigCommands(config: ConfigStore) {
    registerHandler(ipc.CONFIG_GET, (_, key?) => config.get().pipe(Effect.map(current => key === undefined ? current : current[key])));
    registerHandler(ipc.CONFIG_SET, (_, partial) => config.set(partial));
    registerHandler(ipc.CONFIG_UPDATE, (_, nextConfig) => config.update(nextConfig));
}
