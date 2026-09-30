import { Effect } from "effect";
import { checkForUpdate, downloadUpdate, getUpdateState, installUpdate, setUpdateChannel } from "../ipc/updates.ts";
import { confirmDialog, getAppInfo, openExternal, pickFolder, setTheme, showContextMenu } from "../ipc/window.ts";

import * as DesktopIpc from "./DesktopIpc.ts";

export const installDesktopIpcHandlers = Effect.fn("desktop.ipc.installHandlers")(function* () {
    const ipc = yield* DesktopIpc.DesktopIpc;

    yield* ipc.handleSync(getAppInfo);
    yield* ipc.handle(setTheme);
    yield* ipc.handle(openExternal);
    yield* ipc.handle(confirmDialog);
    yield* ipc.handle(pickFolder);
    yield* ipc.handle(showContextMenu);

    yield* ipc.handle(getUpdateState);
    yield* ipc.handle(setUpdateChannel);
    yield* ipc.handle(checkForUpdate);
    yield* ipc.handle(downloadUpdate);
    yield* ipc.handle(installUpdate);
});
