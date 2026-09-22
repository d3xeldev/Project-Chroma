import type { Effect } from "effect";
import type { ChromaError, IpcResponse } from "@project-chroma/utils/errors";
import type { ChromaConfig } from "./config.ts";
import type {
    Album,
    AlbumComp,
    ImportGroupingResult,
    ImportItem,
    Item,
    ItemAlbumRef,
    Library,
    LibraryHealth,
    LibraryMetadataPath,
    Tag,
    TagItemsRef,
} from "./gallery.ts";

export type WindowAction = "minimize" | "toggleMaximize" | "close";

export type ChromaOpenDialogOptions = {
    directory?: boolean;
    multiple?: boolean;
    filters?: ChromaFileFilter[];
};

export type ChromaFileFilter = {
    name: string;
    extensions: string[];
};

export type ChromaSaveDialogOptions = {
    defaultPath?: string;
    canCreateDirectories?: boolean;
};

export const ipc = {
    WINDOW_ACTION: "chroma:window-action",
    OPEN_DIALOG: "chroma:open-dialog",
    SAVE_DIALOG: "chroma:save-dialog",
    CONFIG_GET: "chroma:config:get",
    CONFIG_SET: "chroma:config:set",
    CONFIG_UPDATE: "chroma:config:update",
    LIBRARY_GET: "chroma:library:get",
    LIBRARY_CHECK_HEALTH: "chroma:library:check-health",
    LIBRARY_GET_INFO_FROM_PATH: "chroma:library:get-info-from-path",
    LIBRARY_CREATE: "chroma:library:create",
    LIBRARY_ADD: "chroma:library:add",
    LIBRARY_UPDATE_PATH: "chroma:library:update-path",
    LIBRARY_UPGRADE: "chroma:library:upgrade",
    LIBRARY_REMOVE: "chroma:library:remove",
    ITEMS_GET: "chroma:items:get",
    ITEMS_GROUP: "chroma:items:group",
    ITEMS_ADD: "chroma:items:add",
    ITEMS_SET_FAVORITE: "chroma:items:set-favorite",
    ITEMS_TRANSFER: "chroma:items:transfer",
    ITEMS_EXPORT: "chroma:items:export",
    ITEMS_DELETE: "chroma:items:delete",
    ALBUMS_GET: "chroma:albums:get",
    ALBUMS_CREATE: "chroma:albums:create",
    ALBUMS_GET_ITEMS: "chroma:albums:get-items",
    ALBUMS_ADD_ITEMS: "chroma:albums:add-items",
    TAGS_GET: "chroma:tags:get",
    TAGS_CREATE: "chroma:tags:create",
    TAGS_UPDATE: "chroma:tags:update",
    TAGS_DELETE: "chroma:tags:delete",
    TAGS_GET_ITEMS: "chroma:tags:get-items",
    TAGS_SET_ON_ITEMS: "chroma:tags:set-on-items",
    SEARCH_GET_STATUS: "chroma:search:get-status",
    SEARCH_ENABLE: "chroma:search:enable",
    SEARCH_ITEMS: "chroma:search:items",
    GEN_QUICK_THUMB: "chroma:gen-quick-thumb",
} as const;

export type ChromaIpcMap = {
    [ipc.WINDOW_ACTION]: (action: WindowAction) => void;
    [ipc.OPEN_DIALOG]: (options?: ChromaOpenDialogOptions) => string[] | null;
    [ipc.SAVE_DIALOG]: (options?: ChromaSaveDialogOptions) => string | null;
    [ipc.CONFIG_GET]: (key?: keyof ChromaConfig) => ChromaConfig | ChromaConfig[keyof ChromaConfig];
    [ipc.CONFIG_SET]: (partial: Partial<ChromaConfig>) => void;
    [ipc.CONFIG_UPDATE]: (config: ChromaConfig) => void;
    [ipc.UPDATE_GET_STATE]: () => UpdateState;
    [ipc.UPDATE_CHECK]: () => UpdateState;
    [ipc.UPDATE_DOWNLOAD]: () => UpdateState;
    [ipc.UPDATE_INSTALL]: () => UpdateState;
    [ipc.LIBRARY_GET]: () => Library[];
    [ipc.LIBRARY_CHECK_HEALTH]: (options: { libraryId: string }) => LibraryHealth;
    [ipc.LIBRARY_GET_INFO_FROM_PATH]: (options: { path: string }) => LibraryMetadataPath;
    [ipc.LIBRARY_CREATE]: (options: { name: string; icon: string; color: string; path: string }) => Library;
    [ipc.LIBRARY_ADD]: (options: { path: string }) => Library;
    [ipc.LIBRARY_UPDATE_PATH]: (options: { libraryId: string; newPath: string }) => void;
    [ipc.LIBRARY_UPGRADE]: (options: { libraryId: string }) => void;
    [ipc.LIBRARY_REMOVE]: (options: { libraryId: string }) => void;
    [ipc.ITEMS_GET]: (options: { libraryId: string }) => Item[];
    [ipc.ITEMS_GROUP]: (options: { sourcePaths: string[]; checkLivePhotos: boolean; parseEdits: boolean }) => ImportGroupingResult;
    [ipc.ITEMS_ADD]: (options: { libraryId: string; items: ImportItem[]; deleteSource: boolean }) => { failures: (typeof ChromaError.Encoded)[] };
    [ipc.ITEMS_SET_FAVORITE]: (options: { libraryId: string; itemIds: string[]; value: boolean }) => void;
    [ipc.ITEMS_TRANSFER]: (options: { sourceId: string; targetId: string; itemIds: string[]; doMove: boolean }) => ItemFileOperationSummary;
    [ipc.ITEMS_EXPORT]: (options: {
        libraryId: string;
        destination: string;
        itemIds: string[];
        live: boolean;
        edits: boolean;
        adjustments: boolean;
        nameByTakenDate?: boolean;
        dateFormat?: string;
    }) => ItemFileOperationSummary;
    [ipc.ITEMS_DELETE]: (options: { libraryId: string; itemIds: string[] }) => void;
    [ipc.ALBUMS_GET]: (options: { libraryId: string; parent?: string }) => AlbumComp[];
    [ipc.ALBUMS_CREATE]: (options: { libraryId: string; album: Omit<Album, "id"> }) => void;
    [ipc.ALBUMS_GET_ITEMS]: (options: { libraryId: string; albumId: string }) => ItemAlbumRef[];
    [ipc.ALBUMS_ADD_ITEMS]: (options: { libraryId: string; albumId: string; itemIds: string[]; parent?: string }) => void;
    [ipc.TAGS_GET]: (options: { libraryId: string }) => Tag[];
    [ipc.TAGS_CREATE]: (options: { libraryId: string; name: string; color: string }) => Tag;
    [ipc.TAGS_UPDATE]: (options: { libraryId: string; tagId: string; name?: string; color?: string }) => Tag;
    [ipc.TAGS_DELETE]: (options: { libraryId: string; tagIds: string[] }) => void;
    [ipc.TAGS_GET_ITEMS]: (options: { libraryId: string; itemIds: string[] }) => TagItemsRef[];
    [ipc.TAGS_SET_ON_ITEMS]: (options: { libraryId: string; itemIds: string[]; tagIds: string[]; assigned: boolean }) => void;
    [ipc.SEARCH_GET_STATUS]: (options: { libraryId: string }) => ItemSearchStatus;
    [ipc.SEARCH_ENABLE]: (options: { libraryId: string }) => ItemSearchStatus;
    [ipc.SEARCH_ITEMS]: (options: { libraryId: string; query: string; limit: number; minScore?: number }) => ItemSearchMatch[];
    [ipc.GEN_QUICK_THUMB]: (options: { path: string }) => Uint8Array | undefined;
};

export type ChromaIpcChannel = keyof ChromaIpcMap;
export type ChromaIpcArgs<TChannel extends ChromaIpcChannel> = Parameters<ChromaIpcMap[TChannel]>;
export type ChromaIpcResult<TChannel extends ChromaIpcChannel> = ReturnType<ChromaIpcMap[TChannel]>;
export type ChromaIpcHandler<TEvent, TChannel extends ChromaIpcChannel> = (event: TEvent, ...args: ChromaIpcArgs<TChannel>) => Effect.Effect<ChromaIpcResult<TChannel>, ChromaError>;
export type ChromaIpcRegister<TEvent> = <TChannel extends ChromaIpcChannel>(channel: TChannel, listener: ChromaIpcHandler<TEvent, TChannel>) => void;

type ChromaApiDefinition = {
    windowAction: typeof ipc.WINDOW_ACTION;
    openDialog: typeof ipc.OPEN_DIALOG;
    saveDialog: typeof ipc.SAVE_DIALOG;
    config: {
        get: typeof ipc.CONFIG_GET;
        set: typeof ipc.CONFIG_SET;
        update: typeof ipc.CONFIG_UPDATE;
    };
    updates: {
        getState: typeof ipc.UPDATE_GET_STATE;
        check: typeof ipc.UPDATE_CHECK;
        download: typeof ipc.UPDATE_DOWNLOAD;
        install: typeof ipc.UPDATE_INSTALL;
    };
    library: {
        get: typeof ipc.LIBRARY_GET;
        checkHealth: typeof ipc.LIBRARY_CHECK_HEALTH;
        getInfoFromPath: typeof ipc.LIBRARY_GET_INFO_FROM_PATH;
        create: typeof ipc.LIBRARY_CREATE;
        add: typeof ipc.LIBRARY_ADD;
        updatePath: typeof ipc.LIBRARY_UPDATE_PATH;
        upgrade: typeof ipc.LIBRARY_UPGRADE;
        remove: typeof ipc.LIBRARY_REMOVE;
    };
    items: {
        get: typeof ipc.ITEMS_GET;
        groupItems: typeof ipc.ITEMS_GROUP;
        addItems: typeof ipc.ITEMS_ADD;
        setItemsFavorite: typeof ipc.ITEMS_SET_FAVORITE;
        transferItems: typeof ipc.ITEMS_TRANSFER;
        exportItems: typeof ipc.ITEMS_EXPORT;
        deleteItems: typeof ipc.ITEMS_DELETE;
    };
    albums: {
        get: typeof ipc.ALBUMS_GET;
        create: typeof ipc.ALBUMS_CREATE;
        getItems: typeof ipc.ALBUMS_GET_ITEMS;
        addItems: typeof ipc.ALBUMS_ADD_ITEMS;
    };
    tags: {
        get: typeof ipc.TAGS_GET;
        create: typeof ipc.TAGS_CREATE;
        update: typeof ipc.TAGS_UPDATE;
        delete: typeof ipc.TAGS_DELETE;
        getItems: typeof ipc.TAGS_GET_ITEMS;
        setOnItems: typeof ipc.TAGS_SET_ON_ITEMS;
    };
    search: {
        getStatus: typeof ipc.SEARCH_GET_STATUS;
        enable: typeof ipc.SEARCH_ENABLE;
        items: typeof ipc.SEARCH_ITEMS;
    };
    other: {
        genQuickThumb: typeof ipc.GEN_QUICK_THUMB;
    };
};

type ChromaApi<TDefinition, TTransport extends boolean> = TDefinition extends ChromaIpcChannel
    ? (...args: ChromaIpcArgs<TDefinition>) => TTransport extends true ? Promise<IpcResponse<ChromaIpcResult<TDefinition>>> : Effect.Effect<ChromaIpcResult<TDefinition>, ChromaError>
    : { [TKey in keyof TDefinition]: ChromaApi<TDefinition[TKey], TTransport> };

export type ChromaIpcInvoke = <TChannel extends ChromaIpcChannel, const TArgs extends ChromaIpcArgs<TChannel>>(channel: TChannel, ...args: TArgs) => Promise<Result<ChromaIpcResult<TChannel, TArgs>>>;

export type ChromaIpcHandler<TEvent, TChannel extends ChromaIpcChannel, TArgs extends ChromaIpcArgs<TChannel> = ChromaIpcArgs<TChannel>> = (
    event: TEvent,
    ...args: TArgs
) => MaybePromise<MaybeResult<ChromaIpcResult<TChannel, TArgs>>>;

export type ChromaEventChannel = keyof ChromaEventMap;
export type ChromaEventListener<TChannel extends ChromaEventChannel> = (payload: ChromaEventMap[TChannel]) => void;
