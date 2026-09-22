import { Effect, Option, Schema } from "effect";
import { ContextMenuItemSchema, ContextMenuPosition, DesktopAppInfo, DesktopTheme, PickFolderOptions } from "@recall/contracts/desktop";
import { ipc } from "@recall/contracts/ipc";

import * as DesktopIpc from "../DesktopIpc.ts";
import * as DesktopEnvironment from "../../app/DesktopEnvironment.ts";
import * as DesktopSettings from "../../app/DesktopSettings.ts";
import * as ElectronDialog from "../../electron/ElectronDialog.ts";
import * as ElectronMenu from "../../electron/ElectronMenu.ts";
import * as ElectronShell from "../../electron/ElectronShell.ts";
import * as ElectronTheme from "../../electron/ElectronTheme.ts";
import * as ElectronWindow from "../../electron/ElectronWindow.ts";

const ContextMenuInput = Schema.Struct({
    items: Schema.Array(ContextMenuItemSchema),
    position: Schema.optionalKey(ContextMenuPosition),
});

export const getAppInfo = DesktopIpc.makeSyncIpcMethod({
    channel: ipc.GET_APP_INFO,
    result: Schema.NullOr(DesktopAppInfo),
    handler: Effect.fn("desktop.ipc.window.getAppInfo")(function* () {
        const environment = yield* DesktopEnvironment.DesktopEnvironment;
        return environment.appInfo;
    }),
});

export const setTheme = DesktopIpc.makeIpcMethod({
    channel: ipc.SET_THEME,
    payload: DesktopTheme,
    result: Schema.Void,
    handler: Effect.fn("desktop.ipc.window.setTheme")(function* (theme) {
        const electronTheme = yield* ElectronTheme.ElectronTheme;
        const settings = yield* DesktopSettings.DesktopSettings;
        yield* electronTheme.setSource(theme);
        yield* settings.setTheme(theme);
    }),
});

export const openExternal = DesktopIpc.makeIpcMethod({
    channel: ipc.OPEN_EXTERNAL,
    payload: Schema.String,
    result: Schema.Boolean,
    handler: Effect.fn("desktop.ipc.window.openExternal")(function* (url) {
        const shell = yield* ElectronShell.ElectronShell;
        return yield* shell.openExternal(url);
    }),
});

export const confirm = DesktopIpc.makeIpcMethod({
    channel: ipc.CONFIRM_DIALOG,
    payload: Schema.String,
    result: Schema.Boolean,
    handler: Effect.fn("desktop.ipc.window.confirmDialog")(function* (message) {
        const dialog = yield* ElectronDialog.ElectronDialog;
        const electronWindow = yield* ElectronWindow.ElectronWindow;
        const owner = yield* electronWindow.focusedMainOrFirst;
        return yield* dialog.confirm({ owner, message });
    }),
});

export const pickFolder = DesktopIpc.makeIpcMethod({
    channel: ipc.PICK_FOLDER,
    payload: Schema.UndefinedOr(PickFolderOptions),
    result: Schema.NullOr(Schema.String),
    handler: Effect.fn("desktop.ipc.window.pickFolder")(function* (options) {
        const dialog = yield* ElectronDialog.ElectronDialog;
        const electronWindow = yield* ElectronWindow.ElectronWindow;
        const owner = yield* electronWindow.focusedMainOrFirst;
        const selected = yield* dialog.pickFolder({
            owner,
            defaultPath: Option.fromNullishOr(options?.defaultPath),
            title: Option.fromNullishOr(options?.title),
        });
        return Option.getOrNull(selected);
    }),
});

export const showContextMenu = DesktopIpc.makeIpcMethod({
    channel: ipc.CONTEXT_MENU,
    payload: ContextMenuInput,
    result: Schema.NullOr(Schema.String),
    handler: Effect.fn("desktop.ipc.window.showContextMenu")(function* (input) {
        const electronMenu = yield* ElectronMenu.ElectronMenu;
        const electronWindow = yield* ElectronWindow.ElectronWindow;
        const window = yield* electronWindow.focusedMainOrFirst;
        if (Option.isNone(window)) {
            return null;
        }
        const selected = yield* electronMenu.showContextMenu({
            window: window.value,
            items: input.items,
            position: Option.fromNullishOr(input.position),
        });
        return Option.getOrNull(selected);
    }),
});
