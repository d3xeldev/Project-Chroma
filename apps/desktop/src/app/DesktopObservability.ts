import { Effect, Layer, Logger, References } from "effect";

export type DesktopLogAnnotations = Record<string, unknown>;

export interface DesktopComponentLogger {
    readonly annotate: <A, E, R>(effect: Effect.Effect<A, E, R>, annotations?: DesktopLogAnnotations) => Effect.Effect<A, E, R>;
    readonly logDebug: (message: string, annotations?: DesktopLogAnnotations) => Effect.Effect<void>;
    readonly logInfo: (message: string, annotations?: DesktopLogAnnotations) => Effect.Effect<void>;
    readonly logWarning: (message: string, annotations?: DesktopLogAnnotations) => Effect.Effect<void>;
    readonly logError: (message: string, annotations?: DesktopLogAnnotations) => Effect.Effect<void>;
}

export function makeComponentLogger(component: string): DesktopComponentLogger {
    const annotate: DesktopComponentLogger["annotate"] = (effect, annotations) => effect.pipe(Effect.annotateLogs({ component, ...annotations }));

    return {
        annotate,
        logDebug: (message, annotations) => annotate(Effect.logDebug(message), annotations),
        logInfo: (message, annotations) => annotate(Effect.logInfo(message), annotations),
        logWarning: (message, annotations) => annotate(Effect.logWarning(message), annotations),
        logError: (message, annotations) => annotate(Effect.logError(message), annotations),
    };
}

export const layer = Layer.mergeAll(Logger.layer([Logger.consolePretty()], { mergeWithExisting: false }), Layer.succeed(References.MinimumLogLevel, "Info"));
