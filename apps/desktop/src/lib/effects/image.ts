import { Effect } from "effect";
import sharp, { type Sharp } from "sharp";
import { MediaProcessingFailedError } from "@project-chroma/utils/errors";

export const decodeImage = (bytes: Buffer) =>
    Effect.try({
        try: () => sharp(bytes),
        catch: cause => new MediaProcessingFailedError({ cause }),
    });

export const readImageMetadata = (image: Sharp) =>
    Effect.tryPromise({
        try: () => image.metadata(),
        catch: cause => new MediaProcessingFailedError({ cause }),
    });
