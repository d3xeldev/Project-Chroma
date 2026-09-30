import { Context, Effect, Layer, Ref } from "effect";

export class DesktopState extends Context.Service<
    DesktopState,
    {
        readonly quitting: Ref.Ref<boolean>;
    }
>()("@app/desktop/app/DesktopState") {}

const make = Effect.all({
    quitting: Ref.make(false),
});

export const layer = Layer.effect(DesktopState, make);
