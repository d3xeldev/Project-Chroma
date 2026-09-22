import { shell } from "electron";
import { Context, Effect, Layer, Option } from "effect";

const SAFE_EXTERNAL_PROTOCOLS = new Set(["https:"]);

export function parseSafeExternalUrl(rawUrl: unknown): Option.Option<string> {
    if (typeof rawUrl !== "string") {
        return Option.none();
    }
    try {
        const url = new URL(rawUrl);
        return SAFE_EXTERNAL_PROTOCOLS.has(url.protocol) ? Option.some(url.href) : Option.none();
    } catch {
        return Option.none();
    }
}

export class ElectronShell extends Context.Service<
    ElectronShell,
    {
        readonly openExternal: (rawUrl: unknown) => Effect.Effect<boolean>;
    }
>()("@app/desktop/electron/ElectronShell") {}

export const make = ElectronShell.of({
    openExternal: rawUrl =>
        Option.match(parseSafeExternalUrl(rawUrl), {
            onNone: () => Effect.succeed(false),
            onSome: externalUrl =>
                Effect.promise(() =>
                    shell.openExternal(externalUrl).then(
                        () => true,
                        () => false,
                    ),
                ),
        }),
});

export const layer = Layer.succeed(ElectronShell, make);
