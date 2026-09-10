import { Effect } from "effect";
import { attemptPromise } from "@project-chroma/utils";
import { v4 as uuidv4 } from "uuid";
import type { ConfigStore } from "./config.ts";
import type { ChromaDB } from "../db/connection.ts";

export function newLibraryId(root: string, config: ConfigStore) {
    return attemptPromise(async () => {
        let id: string;
        const inUse = await Effect.runPromise(config.get().pipe(Effect.map(value => value.libraries.map(lib => lib.id))));

        do {
            id = uuidv4();
        } while (inUse.includes(id));

        return id;
    });
}

export function newItemId(root: string, db: ChromaDB) {
    return attemptPromise(async () => {
        let id: string;
        const exists = db.prepare("SELECT 1 FROM item WHERE id = ?");

        do {
            id = uuidv4();
        } while (exists.get(id));

        return id;
    });
}
