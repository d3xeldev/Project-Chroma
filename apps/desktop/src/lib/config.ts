import fs from "node:fs/promises";
import path from "node:path";
import { defaultChromaConfig, type ChromaConfig } from "@project-chroma/contracts/config";
import type { App } from "electron";

function cloneConfig<TConfig>(value: TConfig): TConfig {
    return structuredClone(value);
}

function isJsonObject(value: unknown): value is { [key: string]: unknown } {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ConfigParams = {
    app: App;
    fileName?: string;
};

export type ConfigStore = {
    path: string;
    get: () => Effect.Effect<ChromaConfig, ChromaError>;
    set: (partial: Partial<ChromaConfig>) => Effect.Effect<void, ChromaError>;
    update: (config: ChromaConfig) => Effect.Effect<void, ChromaError>;
};

export function createConfigStore({ app, fileName = "config.json" }: ConfigParams) {
    const configPath = path.join(app.getPath("userData"), fileName);
    const semaphore = Semaphore.makeUnsafe(1);
    const serialized = <A>(operation: () => Promise<A>) => semaphore.withPermits(1)(attemptPromise(operation).pipe(Effect.uninterruptible));

    async function read(): Promise<ChromaConfig> {
        try {
            const raw = await fs.readFile(configPath, "utf8");
            const parsed = JSON.parse(raw) as unknown;
            const resolvedDefaults = cloneConfig(defaultChromaConfig);

            if (!isJsonObject(parsed)) return resolvedDefaults;

            return {
                ...resolvedDefaults,
                ...parsed,
            } as ChromaConfig;
        } catch (error) {
            const code = error instanceof Error && "code" in error ? error.code : undefined;
            if (code !== "ENOENT") {
                console.warn(`[config] Failed to read ${configPath}; using defaults.`, error);
            }

            return cloneConfig(defaultChromaConfig);
        }
    }

    async function write(config: ChromaConfig): Promise<void> {
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        const tempPath = path.join(path.dirname(configPath), `${path.basename(configPath)}.${process.pid}.tmp`);
        await fs.writeFile(tempPath, `${JSON.stringify(config, null, 4)}\n`, "utf8");
        await fs.rename(tempPath, configPath);
    }

    return {
        path: configPath,
        get() {
            return enqueue(() => read());
        },
        async set(partial: Partial<ChromaConfig>) {
            return enqueue(async () =>
                write({
                    ...(await read()),
                    ...partial,
                }),
            );
        },
        update(config: ChromaConfig) {
            return enqueue(() => write(config));
        },
    } satisfies ConfigStore;
}
