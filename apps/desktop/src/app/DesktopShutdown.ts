import { Context, Deferred, Effect, Layer } from "effect";

export class DesktopShutdown extends Context.Service<
    DesktopShutdown,
    {
        readonly request: Effect.Effect<void>;
        readonly awaitRequest: Effect.Effect<void>;
        readonly markComplete: Effect.Effect<void>;
        readonly awaitComplete: Effect.Effect<void>;
    }
>()("@app/desktop/app/DesktopShutdown") {}

const make = Effect.gen(function* () {
    const requested = yield* Deferred.make<void>();
    const completed = yield* Deferred.make<void>();

    return DesktopShutdown.of({
        request: Deferred.succeed(requested, undefined).pipe(Effect.asVoid),
        awaitRequest: Deferred.await(requested),
        markComplete: Deferred.succeed(completed, undefined).pipe(Effect.asVoid),
        awaitComplete: Deferred.await(completed),
    });
});

export const layer = Layer.effect(DesktopShutdown, make);
