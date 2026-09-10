import { Effect } from "effect";
import sharp, { type Sharp } from "sharp";
import { Errors } from "@project-chroma/utils";

export const decodeImage = (bytes: Buffer) =>
    Effect.try({
        try: () => sharp(bytes),
        catch: cause => new Errors.MediaProcessingFailedError({ cause }),
    });

export const readImageMetadata = (image: Sharp) =>
    Effect.tryPromise({
        try: () => image.metadata(),
        catch: cause => new Errors.MediaProcessingFailedError({ cause }),
    });
