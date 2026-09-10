import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { cpus } from "node:os";
import { Effect } from "effect";
import sharp from "sharp";
import { Piscina } from "piscina";
import { v4 as uuidv4 } from "uuid";
import { ipc } from "@project-chroma/contracts/ipc";
import { Errors, extToMime, formatDate, Result, type AppError } from "@project-chroma/utils";
import { registerHandle } from "./ipc.ts";
import * as utils from "./utils.ts";
import * as DB from "../db/index.ts";
import type { ConflictGroup, ImportItem, Item, Library } from "@project-chroma/contracts/gallery";
import type { ConfigStore } from "../lib/config.ts";
import type { PrepareItemProps } from "../workers/prepareItem.worker.ts";

const originalsDir = (root: string) => path.join(root, "originals");
const thumbsDir = (root: string) => path.join(root, "thumbnails");
const adjustmentsDir = (root: string) => path.join(root, "adjustments");
const createDirectories = (root: string) => Effect.forEach([originalsDir(root), thumbsDir(root), adjustmentsDir(root)], files.makeDirectory, { discard: true });
}

export function registerLibraryCommands(app: Electron.App, config: ConfigStore) {
    const withLibrary = <A, E, R>(libraryId: string, callback: (library: Library) => Effect.Effect<A, E, R>) =>
        Effect.gen(function* () {
            const library = (yield* config.get()).libraries.find(l => l.id === libraryId);
            if (!library) return yield* Effect.fail(Errors.libraryNotFound());
            return yield* callback(library);
        });
    const pathBelongsToLibrary = (candidatePath: string, libraryPath: string) => {
        const relativePath = path.relative(path.resolve(libraryPath), path.resolve(candidatePath));
        return relativePath === "" || (!relativePath.startsWith(".." + path.sep) && relativePath !== "..");
    };
    const checkLibraryPathConflict = (candidatePath: string, excludedLibraryId?: string) =>
        Effect.gen(function* () {
            const conflict = (yield* config.get()).libraries.find(library => library.id !== excludedLibraryId && pathBelongsToLibrary(candidatePath, library.path));
            if (!conflict) return;

            return yield* Effect.fail(Errors.libraryPathConflict({ details: { path: candidatePath, libraryId: conflict.id } }));
        });

    // Library

    registerHandle(ipc.LIBRARY_GET, () => config.get().pipe(Effect.map(value => value.libraries)));
    registerHandle(ipc.LIBRARY_CHECK_HEALTH, (_, { libraryId }) => withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.library.checkVersionState(db))));
    registerHandle(ipc.LIBRARY_GET_INFO_FROM_PATH, (_, { path: rootPath }) => DB.withDatabase(rootPath, DB.library.fetchInfo).pipe(Effect.map(info => ({ ...info, path: rootPath }))));
    registerHandle(ipc.LIBRARY_CREATE, (_, { name, color, icon, path: rootPath }) =>
        Effect.gen(function* () {
            yield* checkLibraryPathConflict(rootPath);

            yield* files.makeDirectory(rootPath);
            yield* Effect.scoped(
                Effect.gen(function* () {
                    const db = yield* DB.createDatabase(rootPath);
                    yield* attempt(() => {
                        DB.createSchema(db);
                        DB.library.fillMetadata(db, name, icon, color);
                    });
                }),
            );
            yield* createDirectories(rootPath);

            const lib: Library = { id: yield* newLibraryId(rootPath, config), name, icon, color, path: rootPath };
            yield* config.set({ libraries: [...(yield* config.get()).libraries, lib] });
            return lib;
        }),
    );
    registerHandle(ipc.LIBRARY_ADD, (_, { path: rootPath }) =>
        Effect.gen(function* () {
            yield* checkLibraryPathConflict(rootPath);

            const info = yield* DB.withDatabase(rootPath, DB.library.fetchInfo);
            const lib: Library = { id: yield* newLibraryId(rootPath, config), name: info.name, icon: info.icon, color: info.color, path: rootPath };

            yield* config.set({ libraries: [...(yield* config.get()).libraries, lib] });
            return lib;
        }),
    );
    registerHandle(ipc.LIBRARY_UPDATE_PATH, (_, { libraryId, newPath }) =>
        Effect.gen(function* () {
            yield* checkLibraryPathConflict(newPath, libraryId);
            yield* config.set({ libraries: (yield* config.get()).libraries.map(l => (l.id === libraryId ? { ...l, path: newPath } : l)) });
        }),
    );
    registerHandle(ipc.LIBRARY_UPGRADE, (_, { libraryId }) => withLibrary(libraryId, lib => DB.withDatabase(lib.path, DB.migrateToLatest)));
    registerHandle(ipc.LIBRARY_REMOVE, (_, { libraryId }) => config.get().pipe(Effect.flatMap(current => config.set({ libraries: current.libraries.filter(l => l.id !== libraryId) }))));

    // Items

    registerHandle(ipc.ITEMS_GET, async (_, { libraryId }) => withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.items.getAll(db))));
    registerHandle(ipc.ITEMS_GROUP, (_, { sourcePaths, checkLivePhotos, parseEdits }) => groupImportItems(sourcePaths, checkLivePhotos, parseEdits));
    registerHandle(ipc.ITEMS_ADD, async (_, { libraryId, items, deleteSource }) =>
        withLibrary(libraryId, lib =>
            DB.withDatabaseAsync(lib.path, async db => {
                let piscina: Piscina<PrepareItemProps, Result<Item, AppError>> | undefined;
                try {
                    piscina = new Piscina<PrepareItemProps, Result<Item, AppError>>({
                        filename: new URL("../dist-electron/workers/prepareItem.worker.cjs", import.meta.url).href,
                        maxThreads: cpus().length,
                } finally {
                    await piscina?.destroy();
                }
            }),
    registerHandle(ipc.ITEMS_SET_FAVORITE, async (_, { libraryId, itemIds, value }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.items.setFavoriteState(db, itemIds, value)));
    });
    registerHandle(ipc.ITEMS_DELETE, async (_, { libraryId, itemIds }) =>
        withLibrary(libraryId, async lib =>
            DB.withDatabaseAsync(lib.path, async db => {
                try {
                    const items = DB.items.getByIds(db, itemIds);
                    const filesToDelete = [...new Set(items.flatMap(item => storedItemFiles(lib.path, item)))];
                    const results = await Promise.allSettled(filesToDelete.map(filePath => fs.rm(filePath, { force: true })));
                    const failure = results.find(result => result.status === "rejected");
                    DB.items.deleteByIds(db, itemIds);

                    if (failure?.status === "rejected")
                        return Result.reject(Errors.itemDeleteFail({ message: "Some of the files for the selected items could not be deleted", details: { reason: failure.reason } }));
                } finally {
                    db.close();
                }

                return Result.accept();
            }),
        ),
    );

    // Albums

    registerHandle(ipc.ALBUMS_GET, async (_, { libraryId, parent }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.getFromParent(db, parent)));
    });
    registerHandle(ipc.ALBUMS_CREATE, async (_, { libraryId, album }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.add(db, { id: uuidv4(), ...album })));
    });
    registerHandle(ipc.ALBUMS_GET_ITEMS, async (_, { libraryId, albumId }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.getItems(db, albumId)));
    });
    registerHandle(ipc.ALBUMS_ADD_ITEMS, async (_, { libraryId, albumId, itemIds }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.addItems(db, albumId, itemIds)));
    });

        return DB.withDatabase(lib.path, db => DB.albums.getItems(db, albumId));
    });

    // Other

    registerHandle(ipc.GEN_QUICK_THUMB, async (_, { path }) => {
        const mime = extToMime(fileExtension(path));
        if (mime.startsWith("video/")) {
            return utils.generateVideoThumbnail(path, { size: 96 });
        }

        const image = sharp(await fs.readFile(path));
        const thumb = await utils.generateImageThumbnail(image, { size: 96 });

        if (!thumb) return Result.reject(Errors.missingSource());
        return thumb;
    });
}

function storedItemFiles(root: string, item: Item): string[] {
    return [
        path.join(originalsDir(root), `${item.id}.${item.extension}`),
        ...(item.liveVideo ? [path.join(originalsDir(root), item.liveVideo)] : []),
        ...(item.rawOriginalName ? [path.join(originalsDir(root), `${item.id}-raw${path.extname(item.rawOriginalName)}`)] : []),
        ...(item.rawLiveVideo ? [path.join(originalsDir(root), item.rawLiveVideo)] : []),
        path.join(adjustmentsDir(root), `${item.id}.aae`),
        path.join(thumbsDir(root), `${item.id}.webp`),
    ];
}
