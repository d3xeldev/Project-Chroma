import { Effect, Schema } from "effect";

const diagnostics = {
    cause: Schema.optional(Schema.Unknown),
    details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
};
const defaultText = (value: string) => Schema.String.pipe(Schema.withConstructorDefault(Effect.succeed(value)));

export class LibraryNotFoundError extends Schema.TaggedError<LibraryNotFoundError>()("library:not-found", {
    ...diagnostics,
    title: defaultText("Library not found"),
    message: defaultText("No library was found at the specified location."),
}) {}

export class LibraryOutdatedError extends Schema.TaggedError<LibraryOutdatedError>()("library:outdated", {
    ...diagnostics,
    title: defaultText("Library outdated"),
    message: defaultText("The selected library is outdated and must be upgraded first."),
}) {}

export class InvalidIpcArgumentsError extends Schema.TaggedError<InvalidIpcArgumentsError>()("ipc:invalid-arguments", {
    ...diagnostics,
    title: defaultText("Invalid request"),
    message: defaultText("Invalid request"),
}) {}

export class BinaryNotFoundError extends Schema.TaggedError<BinaryNotFoundError>()("binary:not-found", {
    ...diagnostics,
    title: defaultText("Required binary is unavailable"),
    message: defaultText("Required binary is unavailable"),
}) {}

export class MediaProcessingFailedError extends Schema.TaggedError<MediaProcessingFailedError>()("media:processing-failed", {
    ...diagnostics,
    title: defaultText("Unable to process media"),
    message: defaultText("Unable to process media"),
}) {}

export class UnknownError extends Schema.TaggedError<UnknownError>()("unknown", {
    ...diagnostics,
    title: defaultText("Something went wrong"),
    message: defaultText("An unexpected error occurred"),
}) {}

export const ChromaError = Schema.Union([
    LibraryNotFoundError,
    LibraryOutdatedError,
    InvalidIpcArgumentsError,
    BinaryNotFoundError,
    MediaProcessingFailedError,
    UnknownError,
]);

export type ChromaError = typeof ChromaError.Type;
export type IpcResponse<A> = { readonly _tag: "Success"; readonly value: A } | { readonly _tag: "Failure"; readonly error: typeof ChromaError.Encoded };

export const isChromaError = Schema.is(ChromaError);
export function toChromaError(value: unknown): ChromaError {
    if (isChromaError(value)) return value;
    return new UnknownError({ cause: value, ...(value instanceof Error ? { message: value.message } : {}) });
}
