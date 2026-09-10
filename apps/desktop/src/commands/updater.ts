import { ipc } from "@project-chroma/contracts/ipc";
import { attempt } from "@project-chroma/utils";
import { registerHandler } from "./ipc.ts";
import type { AutoUpdateService } from "../updater.ts";

export function registerUpdaterCommands(autoUpdates: AutoUpdateService) {
    registerHandler(ipc.UPDATE_GET_STATE, () => attempt(() => autoUpdates.getState()));
    registerHandler(ipc.UPDATE_CHECK, () => autoUpdates.checkForUpdates("ipc"));
    registerHandler(ipc.UPDATE_DOWNLOAD, () => autoUpdates.downloadUpdate());
    registerHandler(ipc.UPDATE_INSTALL, () => autoUpdates.installDownloadedUpdate());
}
