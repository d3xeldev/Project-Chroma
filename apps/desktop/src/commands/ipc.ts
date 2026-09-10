import { BrowserWindow, dialog, ipcMain } from "electron";
import { Effect, Schema } from "effect";
import { ipc } from "@project-chroma/contracts/ipc";
import { attempt, attemptPromise, encodeResponse } from "@project-chroma/utils";
import { InvalidIpcArgumentsError } from "@project-chroma/utils/errors";
import { registerConfigCommands } from "./config.ts";
import { registerLibraryCommands } from "./library.ts";
import { registerUpdaterCommands } from "./updater.ts";
import type { ChromaIpcArgs, ChromaIpcChannel, ChromaIpcHandler, ChromaIpcRegister } from "@project-chroma/contracts/ipc";
import type { ConfigStore } from "../lib/config.ts";

type RegisterIpcHandlersOptions = {
    app: Electron.App;
    config: ConfigStore;
    getWindow(): BrowserWindow | null;
    autoUpdates: AutoUpdateService;
};

function removeKnownHandlers() {
    for (const channel of Object.values(ipc)) {
        ipcMain.removeHandler(channel);
    }
}

export const registerHandler = (<TChannel extends ChromaIpcChannel>(channel: TChannel, listener: ChromaIpcHandler<Electron.IpcMainInvokeEvent, TChannel>) => {
    ipcMain.handle(channel, (event, ...args) =>
        encodeResponse(
            Schema.decodeUnknownEffect(ipcArgumentSchemas[channel] as Schema.ConstraintDecoder<unknown>)(args).pipe(
                Effect.mapError(error => new InvalidIpcArgumentsError({ message: `Invalid arguments for ${channel}`, details: { channel, issue: String(error) } })),
                Effect.flatMap(decoded => Effect.suspend(() => listener(event, ...(decoded as ChromaIpcArgs<TChannel>)))),
                Effect.withSpan(channel),
            ),
        ),
    );
}) satisfies ChromaIpcRegister<Electron.IpcMainInvokeEvent>;

function getDialogOwner(getWindow: () => BrowserWindow | null): BrowserWindow | undefined {
    return BrowserWindow.getFocusedWindow() ?? getWindow() ?? undefined;
}

export function registerIpcHandlers({ app, config, getWindow, autoUpdates }: RegisterIpcHandlersOptions) {
    removeKnownHandlers();

    registerHandler(ipc.WINDOW_ACTION, (_, action) =>
        attempt(() => {
            const window = getWindow();
            if (!window) return;

            if (action === "minimize") window.minimize();
            if (action === "toggleMaximize") {
                if (window.isMaximized()) window.unmaximize();
                else window.maximize();
            }
            if (action === "close") window.close();
        }),
    );

    registerHandler(ipc.OPEN_DIALOG, (_, options = {}) =>
        Effect.gen(function* () {
            const dialogOptions = {
                properties: [options.directory ? "openDirectory" : "openFile", ...(options.multiple ? (["multiSelections"] as const) : []), "createDirectory"],
                ...(options.filters ? { filters: options.filters } : {}),
            } satisfies Electron.OpenDialogOptions;

            const owner = yield* attempt(() => getDialogOwner(getWindow));
            const result = yield* attemptPromise(() => (owner ? dialog.showOpenDialog(owner, dialogOptions) : dialog.showOpenDialog(dialogOptions)));

            if (result.canceled) return null;
            return result.filePaths;
        }),
    );

    registerHandler(ipc.SAVE_DIALOG, (_, options = {}) =>
        Effect.gen(function* () {
            const dialogOptions = {
                ...(options.defaultPath ? { defaultPath: options.defaultPath } : {}),
                properties: ["createDirectory"],
            } satisfies Electron.SaveDialogOptions;

            const owner = yield* attempt(() => getDialogOwner(getWindow));
            const result = yield* attemptPromise(() => (owner ? dialog.showSaveDialog(owner, dialogOptions) : dialog.showSaveDialog(dialogOptions)));

            return result.canceled ? null : (result.filePath ?? null);
        }),
    );

    registerConfigCommands(config);
    registerLibraryCommands(app, config);
    registerUpdaterCommands(autoUpdates);
}
