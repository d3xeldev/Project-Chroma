import { Result } from "@project-chroma/utils";
import { getLibraryVersion } from "./schema.ts";
import type { LibraryHealth } from "@project-chroma/contracts/gallery";
import type { ChromaDB } from "./connection.ts";

const upgrades: ((db: ChromaDB) => Promise<unknown>)[] = [];

export const SCHEMA_VERSION = upgrades.length;

export function migrateToLatest(db: ChromaDB): Result<void, LibraryHealth> {
    const current = getLibraryVersion(db);
    if (current > SCHEMA_VERSION) return Result.reject("recent");

    for (let i = current; i < SCHEMA_VERSION; i++) {
        const version = i + 1;
        const upgradeFn = upgrades[i];
        if (current >= version || !upgradeFn) continue;

        db.transaction(async () => {
            await upgradeFn(db);
            db.pragma(`user_version = ${version}`);
        })();
    }

    return Result.accept();
}
