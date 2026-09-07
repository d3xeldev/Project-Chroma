import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { cpus } from "node:os";
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

async function createDirectories(root: string) {
    await fs.mkdir(originalsDir(root), { recursive: true });
    await fs.mkdir(thumbsDir(root), { recursive: true });
    await fs.mkdir(adjustmentsDir(root), { recursive: true });
}

export function registerLibraryCommands(app: Electron.App, config: ConfigStore) {
    const getConfig = () => config.get();
    const withLibrary = async <T>(libraryId: string, callback: (library: Library) => T | Promise<T>) => {
        const library = (await getConfig()).libraries.find(l => l.id === libraryId);
        return library ? callback(library) : Result.reject(Errors.libraryNotFound());
    };
    const pathBelongsToLibrary = (candidatePath: string, libraryPath: string) => {
        const relativePath = path.relative(path.resolve(libraryPath), path.resolve(candidatePath));
        return relativePath === "" || (!relativePath.startsWith(".." + path.sep) && relativePath !== "..");
    };
    const checkLibraryPathConflict = async (candidatePath: string, excludedLibraryId?: string) => {
        const conflict = (await getConfig()).libraries.find(library => library.id !== excludedLibraryId && pathBelongsToLibrary(candidatePath, library.path));
        if (!conflict) return;

        return Result.reject(Errors.libraryPathConflict({ details: { path: candidatePath, libraryId: conflict.id } }));
    };

    // Library

    registerHandle(ipc.LIBRARY_GET, async () => (await getConfig()).libraries);
    registerHandle(ipc.LIBRARY_CHECK_HEALTH, (_, { libraryId }) => withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.library.checkVersionState(db))));
    registerHandle(ipc.LIBRARY_GET_INFO_FROM_PATH, (_, { path: rootPath }) => {
        const info = DB.withDatabase(rootPath, DB.library.fetchInfo);
        if (!info.success) return Result.reject(info.error);

        return { ...info.data, path: rootPath };
    });
    registerHandle(ipc.LIBRARY_CREATE, async (_, { name, color, icon, path: rootPath }) => {
        const conflicting = await checkLibraryPathConflict(rootPath);
        if (conflicting) return conflicting;

        await fs.mkdir(rootPath, { recursive: true });
        const db = DB.createConnection(path.join(rootPath, "lib.db"));

        try {
            DB.createSchema(db);
            DB.library.fillMetadata(db, name, icon, color);
        } finally {
            db.close();
        }

        createDirectories(rootPath);

        const lib = {
            id: crypto.randomUUID(),
            name: name,
            icon: icon,
            color: color,
            path: rootPath,
        } satisfies Library;
        await config.set({ libraries: [...(await getConfig()).libraries, lib] });

        return lib;
    });
    registerHandle(ipc.LIBRARY_ADD, async (_, { path: rootPath }) => {
        const conflicting = await checkLibraryPathConflict(rootPath);
        if (conflicting) return conflicting;

        const info = DB.withDatabase(rootPath, DB.library.fetchInfo);
        if (!info.success) return Result.reject(info.error);

        const lib = {
            id: crypto.randomUUID(),
            name: info.data.name,
            icon: info.data.icon,
            color: info.data.color,
            path: rootPath,
        } satisfies Library;
        await config.set({ libraries: [...(await getConfig()).libraries, lib] });

        return lib;
    });
    registerHandle(ipc.LIBRARY_UPDATE_PATH, async (_, { libraryId, newPath }) => {
        const conflicting = await checkLibraryPathConflict(newPath, libraryId);
        if (conflicting) return conflicting;

        return await config.set({ libraries: (await getConfig()).libraries.map(l => (l.id === libraryId ? { ...l, path: newPath } : l)) });
    });
    );
    registerHandle(ipc.LIBRARY_REMOVE, async (_, { libraryId }) => Result.accept(await config.set({ libraries: (await getConfig()).libraries.filter(l => l.id !== libraryId) })));

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
