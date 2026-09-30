import { Config, Context, Effect, Layer, Option, Path } from "effect";
import { defaultDesktopSettings, type DesktopSettings, type DesktopAppInfo } from "@recall/contracts";

const APP_BASE_NAME = "Project Chroma";

export interface MakeDesktopEnvironmentInput {
    readonly dirname: string;
    readonly homeDirectory: string;
    readonly platform: NodeJS.Platform;
    readonly appVersion: string;
    readonly appPath: string;
    readonly isPackaged: boolean;
    readonly resourcesPath: string;
    readonly appDataDirectory: Option.Option<string>;
    readonly xdgConfigHome: Option.Option<string>;
    readonly devServerUrl: Option.Option<URL>;
}

export class DesktopEnvironment extends Context.Service<
    DesktopEnvironment,
    {
        readonly path: Path.Path;
        readonly platform: DesktopAppInfo["platform"];
        readonly isPackaged: boolean;
        readonly isDevelopment: boolean;
        readonly appVersion: string;
        readonly appPath: string;
        readonly resourcesPath: string;
        readonly homeDirectory: string;
        readonly baseDir: string;
        readonly desktopSettingsPath: string;
        readonly logDir: string;
        readonly preloadPath: string;
        readonly devServerUrl: Option.Option<URL>;
        readonly appInfo: DesktopAppInfo;
        readonly displayName: string;
        readonly defaultDesktopSettings: DesktopSettings;
    }
>()("@app/desktop/app/DesktopEnvironment") {}

function normalizePlatform(platform: NodeJS.Platform): DesktopAppInfo["platform"] {
    if (platform === "win32") return "win32";
    if (platform === "darwin") return "darwin";
    return "linux";
}

export function makeWith(input: MakeDesktopEnvironmentInput, path: Path.Path): DesktopEnvironment["Service"] {
    const platform = normalizePlatform(input.platform);
    const isDevelopment = Option.isSome(input.devServerUrl);
    const displayName = isDevelopment ? `${APP_BASE_NAME} (Dev)` : APP_BASE_NAME;

    const appDataDirectory =
        platform === "win32"
            ? Option.getOrElse(input.appDataDirectory, () => path.join(input.homeDirectory, "AppData", "Roaming"))
            : platform === "darwin"
              ? path.join(input.homeDirectory, "Library", "Application Support")
              : Option.getOrElse(input.xdgConfigHome, () => path.join(input.homeDirectory, ".config"));
    const baseDir = path.join(appDataDirectory, "Project Chroma");
    const logDir = path.join(baseDir, "logs");
    const desktopSettingsPath = path.join(baseDir, "settings.json");
    const preloadPath = path.join(input.dirname, "preload.cjs");

    const appInfo: DesktopAppInfo = {
        name: displayName,
        version: input.appVersion,
        platform,
        isPackaged: input.isPackaged,
    };

    return DesktopEnvironment.of({
        path,
        platform,
        isPackaged: input.isPackaged,
        isDevelopment,
        appVersion: input.appVersion,
        appPath: input.appPath,
        resourcesPath: input.resourcesPath,
        homeDirectory: input.homeDirectory,
        baseDir,
        desktopSettingsPath,
        logDir,
        preloadPath,
        devServerUrl: input.devServerUrl,
        appInfo,
        displayName,
        defaultDesktopSettings,
    });
}

export function layer(
    metadata: Pick<MakeDesktopEnvironmentInput, "dirname" | "homeDirectory" | "platform" | "appVersion" | "appPath" | "isPackaged" | "resourcesPath">,
): Layer.Layer<DesktopEnvironment> {
    return Layer.effect(
        DesktopEnvironment,
        Effect.gen(function* () {
            const path = yield* Path.Path;
            const appDataDirectory = yield* Config.string("APPDATA").pipe(Config.option);
            const xdgConfigHome = yield* Config.string("XDG_CONFIG_HOME").pipe(Config.option);
            const devServerUrl = yield* Config.url("APP_DEV_WEB_URL").pipe(Config.option);
            return makeWith(
                {
                    ...metadata,
                    appDataDirectory,
                    xdgConfigHome,
                    devServerUrl,
                },
                path,
            );
        }).pipe(Effect.orDie),
    ).pipe(Layer.provide(Path.layer));
}
