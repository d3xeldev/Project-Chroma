import { Cause, Crypto, Effect, Ref } from "effect";
import { makeComponentLogger } from "./DesktopObservability.ts";

import * as DesktopBackendManager from "./DesktopBackendManager.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import * as DesktopIpcHandlers from "./DesktopIpcHandlers.ts";
import * as DesktopLifecycle from "./DesktopLifecycle.ts";
import * as DesktopSettings from "./DesktopSettings.ts";
import * as DesktopShutdown from "./DesktopShutdown.ts";
import * as DesktopState from "./DesktopState.ts";
import * as DesktopUpdater from "./DesktopUpdater.ts";
import * as DesktopWindow from "./DesktopWindow.ts";
import * as ElectronApp from "../electron/ElectronApp.ts";
import * as ElectronDialog from "../electron/ElectronDialog.ts";
import * as ElectronTheme from "../electron/ElectronTheme.ts";

const { logInfo: logStartupInfo, logError: logStartupError } = makeComponentLogger("desktop-startup");
const { logInfo: logBootstrapInfo } = makeComponentLogger("desktop-bootstrap");

const makeRunId = Crypto.Crypto.pipe(
    Effect.flatMap(crypto => crypto.randomUUIDv4),
    Effect.map(value => value.replaceAll("-", "").slice(0, 12)),
);

const handleFatalStartupError = Effect.fn("desktop.startup.handleFatalStartupError")(function* (stage: string, cause: Cause.Cause<unknown>) {
    const shutdown = yield* DesktopShutdown.DesktopShutdown;
    const state = yield* DesktopState.DesktopState;
    const electronApp = yield* ElectronApp.ElectronApp;
    const electronDialog = yield* ElectronDialog.ElectronDialog;
    const message = Cause.pretty(cause);
    yield* logStartupError("fatal startup error", { stage, message });
    const wasQuitting = yield* Ref.getAndSet(state.quitting, true);
    if (!wasQuitting) {
        yield* electronDialog.showErrorBox("App failed to start", `Stage: ${stage}\n${message}`);
    }
    yield* shutdown.request;
    yield* electronApp.quit;
});

const fatalStartupCause = (stage: string, cause: Cause.Cause<unknown>) => handleFatalStartupError(stage, cause).pipe(Effect.andThen(Effect.failCause(cause)));

const bootstrap = Effect.gen(function* () {
    const manager = yield* DesktopBackendManager.DesktopBackendManager;
    const state = yield* DesktopState.DesktopState;
    yield* logBootstrapInfo("bootstrap start");

    yield* DesktopIpcHandlers.installDesktopIpcHandlers();
    yield* logBootstrapInfo("ipc handlers registered");

    if (!(yield* Ref.get(state.quitting))) {
        yield* manager.start;
        yield* logBootstrapInfo("backend start requested");
    }
}).pipe(Effect.withSpan("desktop.bootstrap"));

const startup = Effect.gen(function* () {
    const electronApp = yield* ElectronApp.ElectronApp;
    const lifecycle = yield* DesktopLifecycle.DesktopLifecycle;
    const settings = yield* DesktopSettings.DesktopSettings;
    const updater = yield* DesktopUpdater.DesktopUpdater;
    const window = yield* DesktopWindow.DesktopWindow;
    const electronTheme = yield* ElectronTheme.ElectronTheme;
    const environment = yield* DesktopEnvironment.DesktopEnvironment;

    yield* electronApp.setPath("userData", environment.baseDir);

    const loaded = yield* settings.load;
    yield* electronTheme.setSource(loaded.theme).pipe(Effect.ignore({ log: true }));
    yield* logStartupInfo("settings loaded", { logDir: environment.logDir });

    yield* lifecycle.register;

    yield* electronApp.whenReady.pipe(
        Effect.withSpan("desktop.electron.whenReady"),
        Effect.catchCause(cause => fatalStartupCause("whenReady", cause)),
    );
    yield* logStartupInfo("app ready");

    yield* updater.configure;
    yield* window.installApplicationMenu;
    yield* bootstrap.pipe(Effect.catchCause(cause => fatalStartupCause("bootstrap", cause)));
}).pipe(Effect.withSpan("desktop.startup"));

const scopedProgram = Effect.scoped(
    Effect.gen(function* () {
        const runId = yield* makeRunId;
        yield* Effect.annotateLogsScoped({ scope: "desktop", runId });
        yield* Effect.annotateCurrentSpan({ scope: "desktop", runId });

        const shutdown = yield* DesktopShutdown.DesktopShutdown;
        const manager = yield* DesktopBackendManager.DesktopBackendManager;

        yield* Effect.addFinalizer(() => manager.stop.pipe(Effect.ensuring(shutdown.markComplete)));

        yield* startup;
        yield* shutdown.awaitRequest;
    }),
);

export const program = scopedProgram.pipe(Effect.withSpan("desktop.app"));
