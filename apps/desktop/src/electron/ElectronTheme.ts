import { nativeTheme } from "electron";
import { Context, Effect, Layer, Schema } from "effect";
import { DesktopTheme } from "@recall/contracts/desktop";

export class ElectronThemeSetSourceError extends Schema.TaggedError<ElectronThemeSetSourceError>()("ElectronThemeSetSourceError", {
    source: DesktopTheme,
    cause: Schema.Defect(),
}) {
    override get message(): string {
        return `Failed to set the Electron theme source to ${this.source}.`;
    }
}

export class ElectronTheme extends Context.Service<
    ElectronTheme,
    {
        readonly shouldUseDarkColors: Effect.Effect<boolean>;
        readonly setSource: (theme: DesktopTheme) => Effect.Effect<void, ElectronThemeSetSourceError>;
    }
>()("@app/desktop/electron/ElectronTheme") {}

export const make = ElectronTheme.of({
    shouldUseDarkColors: Effect.sync(() => nativeTheme.shouldUseDarkColors),
    setSource: theme =>
        Effect.try({
            try: () => {
                nativeTheme.themeSource = theme;
            },
            catch: cause => new ElectronThemeSetSourceError({ source: theme, cause }),
        }),
});

export const layer = Layer.succeed(ElectronTheme, make);
