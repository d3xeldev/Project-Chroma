import { Effect, Schema } from "effect";
import { DesktopUpdateChannel, DesktopUpdateState } from "@recall/contracts";
import { ipc } from "../channels.ts";

import * as DesktopIpc from "../app/DesktopIpc.ts";
import * as DesktopUpdater from "../app/DesktopUpdater.ts";

export const getUpdateState = DesktopIpc.makeIpcMethod({
    channel: ipc.GET_UPDATE_STATE,
    payload: Schema.Void,
    result: DesktopUpdateState,
    handler: Effect.fn("desktop.ipc.updates.getState")(function* () {
        const updater = yield* DesktopUpdater.DesktopUpdater;
        return yield* updater.getState;
    }),
});

export const setUpdateChannel = DesktopIpc.makeIpcMethod({
    channel: ipc.SET_UPDATE_CHANNEL,
    payload: DesktopUpdateChannel,
    result: Schema.Void,
    handler: Effect.fn("desktop.ipc.updates.setChannel")(function* (channel) {
        const updater = yield* DesktopUpdater.DesktopUpdater;
        yield* updater.setChannel(channel);
    }),
});

export const checkForUpdate = DesktopIpc.makeIpcMethod({
    channel: ipc.CHECK_FOR_UPDATE,
    payload: Schema.Void,
    result: Schema.Void,
    handler: Effect.fn("desktop.ipc.updates.check")(function* () {
        const updater = yield* DesktopUpdater.DesktopUpdater;
        yield* updater.check;
    }),
});

export const downloadUpdate = DesktopIpc.makeIpcMethod({
    channel: ipc.DOWNLOAD_UPDATE,
    payload: Schema.Void,
    result: Schema.Void,
    handler: Effect.fn("desktop.ipc.updates.download")(function* () {
        const updater = yield* DesktopUpdater.DesktopUpdater;
        yield* updater.download;
    }),
});

export const installUpdate = DesktopIpc.makeIpcMethod({
    channel: ipc.INSTALL_UPDATE,
    payload: Schema.Void,
    result: Schema.Void,
    handler: Effect.fn("desktop.ipc.updates.install")(function* () {
        const updater = yield* DesktopUpdater.DesktopUpdater;
        yield* updater.install;
    }),
});
