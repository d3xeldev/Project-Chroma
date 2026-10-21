import * as NodeOS from "node:os";
import * as Electron from "electron";

import { Effect, Layer } from "effect";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { HostProcessPlatform } from "@luma/shared/hostProcess";

import * as DesktopApp from "./app/DesktopApp.ts";
import * as DesktopEnvironment from "./app/DesktopEnvironment.ts";
import * as DesktopIpc from "./app/DesktopIpc.ts";
import * as DesktopLifecycle from "./app/DesktopLifecycle.ts";
import * as DesktopObservability from "./app/DesktopObservability.ts";
import * as DesktopSettings from "./app/DesktopSettings.ts";
import * as DesktopShutdown from "./app/DesktopShutdown.ts";
import * as DesktopState from "./app/DesktopState.ts";
import * as DesktopUpdater from "./app/DesktopUpdater.ts";
import * as DesktopWindow from "./app/DesktopWindow.ts";
import * as ElectronApp from "./electron/ElectronApp.ts";
import * as ElectronDialog from "./electron/ElectronDialog.ts";
import * as ElectronMenu from "./electron/ElectronMenu.ts";
import * as ElectronShell from "./electron/ElectronShell.ts";
import * as ElectronTheme from "./electron/ElectronTheme.ts";
import * as ElectronUpdater from "./electron/ElectronUpdater.ts";
import * as ElectronWindow from "./electron/ElectronWindow.ts";

protocol.registerSchemesAsPrivileged([
    {
        scheme: "chroma",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
        },
    },
]);

const desktopEnvironmentLayer = Layer.unwrap(
    Effect.gen(function* () {
        const metadata = yield* Effect.service(ElectronApp.ElectronApp).pipe(Effect.flatMap(app => app.metadata));
        const platform = yield* HostProcessPlatform;
        return DesktopEnvironment.layer({
            dirname: __dirname,
            homeDirectory: NodeOS.homedir(),
            platform,
            appVersion: metadata.appVersion,
            appPath: metadata.appPath,
            isPackaged: metadata.isPackaged,
            resourcesPath: metadata.resourcesPath,
        });
    }),
).pipe(Layer.provide(ElectronApp.layer));

const electronLayer = Layer.mergeAll(
    ElectronApp.layer,
    ElectronDialog.layer,
    ElectronMenu.layer,
    ElectronShell.layer,
    ElectronTheme.layer,
    ElectronUpdater.layer,
    ElectronWindow.layer,
    DesktopIpc.layer(Electron.ipcMain),
);

const desktopFoundationLayer = Layer.mergeAll(DesktopState.layer, DesktopShutdown.layer, DesktopObservability.layer, DesktopSettings.layer).pipe(Layer.provideMerge(desktopEnvironmentLayer));

const desktopWindowLayer = DesktopWindow.layer.pipe(Layer.provideMerge(desktopFoundationLayer));
const desktopApplicationLayer = Layer.mergeAll(DesktopLifecycle.layer, DesktopUpdater.layer).pipe(Layer.provideMerge(desktopWindowLayer));

const desktopRuntimeLayer = desktopApplicationLayer.pipe(Layer.provideMerge(NodeServices.layer), Layer.provideMerge(electronLayer));

const config = createConfigStore({
    app,
    fileName: "config.json",
});
app.whenReady()
    .then(() => {
        configureContentSecurityPolicy(session.defaultSession, { isDev });
        registerChromaFileProtocol(protocol, net);
        registerIpcHandlers({
            app,
            config,
            getWindow: () => mainWindow,
            autoUpdates,
        });
            getWindow: () => mainWindow,
        createWindow();
    })
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
