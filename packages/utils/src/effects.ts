export const attempt = <A>(run: () => A): Effect.Effect<A, ChromaError> => Effect.try({ try: run, catch: toChromaError });
export const attemptPromise = <A>(run: (signal: AbortSignal) => PromiseLike<A>): Effect.Effect<A, ChromaError> => Effect.tryPromise({ try: run, catch: toChromaError });
