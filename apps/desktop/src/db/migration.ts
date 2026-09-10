import { Effect } from "effect";
import { attempt } from "@project-chroma/utils";
import { LibraryOutdatedError } from "@project-chroma/utils/errors";
import { getLibraryVersion } from "./schema.ts";
import type { ChromaDB } from "./connection.ts";

const upgrades: ((db: ChromaDB) => unknown)[] = [];
export const SCHEMA_VERSION = upgrades.length;

export function migrateToLatest(db: ChromaDB) {
    return Effect.gen(function* () {
        const current = yield* attempt(() => getLibraryVersion(db));
        if (current > SCHEMA_VERSION) {
            return yield* Effect.fail(new LibraryOutdatedError());
        }

        yield* attempt(() =>
            db.transaction(() => {
                for (let i = current; i < SCHEMA_VERSION; i++) {
                    upgrades[i]!(db);
                    db.pragma(`user_version = ${i + 1}`);
                }
            })(),
        );
    });
}
