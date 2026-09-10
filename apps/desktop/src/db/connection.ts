import path from "node:path";
import { Effect } from "effect";
import Database from "better-sqlite3";
import { attempt } from "@project-chroma/utils";
import { LibraryNotFoundError, toChromaError, type ChromaError } from "@project-chroma/utils/errors";
import { exists } from "../lib/effects/fileSystem.ts";

export type ChromaDB = Database.Database;

export function createConnection(dbPath: string): ChromaDB {
    const db = new Database(dbPath);
    try {
        db.pragma("foreign_keys = ON");
        db.pragma("busy_timeout = 2000");
        db.pragma("journal_mode = WAL");
        return db;
    } catch (error) {
        db.close();
        throw error;
    }
}

export function openConnection(root: string): Effect.Effect<ChromaDB, ChromaError> {
    return Effect.gen(function* () {
        const dbPath = path.join(root, "lib.db");

        if (!(yield* exists(dbPath))) {
            return yield* Effect.fail(new LibraryNotFoundError());
        }

        return yield* attempt(() => createConnection(dbPath));
    });
}

const closeConnection = (db: ChromaDB) =>
    Effect.sync(() => {
        if (db.open) db.close();
    });

export function withDatabase<A, E = never>(root: string, callback: (db: ChromaDB) => A | Effect.Effect<A, E>): Effect.Effect<A, E | ChromaError> {
    return Effect.scoped(
        Effect.gen(function* () {
            const db = yield* database(root);
            const value = yield* attempt(() => callback(db));
            return Effect.isEffect(value) ? yield* value : value;
        }),
    );
}
