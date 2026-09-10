import path from "node:path";
import { spawn } from "node:child_process";
import { Effect } from "effect";
import { attempt, attemptPromise, Errors } from "@project-chroma/utils";
import { getBinaryPath } from "../lib/binaries.ts";
import type { Sharp } from "sharp";

export function generateImageThumbnail(image: Sharp, { destination, size = 512 }: { destination?: string; size?: number }) {
    return Effect.gen(function* () {
        const gen = yield* attempt(() => image.resize(size, size, { fit: "inside" }).webp());
        if (destination) {
            yield* files.makeDirectory(path.dirname(destination));
            yield* attemptPromise(() => gen.toFile(destination));
        } else return yield* attemptPromise(() => gen.toBuffer());
    }).pipe(Effect.mapError(error => new Errors.MediaProcessingFailedError({ cause: error })));
}

export function generateVideoThumbnail(input: string, options: { destination?: string; size?: number }) {
    return runMedia("ffmpeg", ["-ss", "0.1", "-autorotate", "1", "-i", input, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1"]).pipe(
        Effect.flatMap(frame => decodeImage(frame).pipe(Effect.flatMap(image => generateImageThumbnail(image, options)))),
    );
}

function runMedia(binary: ChromaBinary, args: string[]) {
    return Effect.gen(function* () {
        const binaryPath = yield* getBinaryPath(binary);
        return yield* Effect.callback<Buffer, ChromaError>(resume => {
            let child: ReturnType<typeof spawn>;
            try {
                child = spawn(binaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });
            } catch (error) {
                resume(Effect.fail(new Errors.MediaProcessingFailedError({ cause: error })));
                return;
            }

            let stderr = "";
            const chunks: Buffer[] = [];

            child.stdout!.on("data", (chunk: Buffer) => chunks.push(chunk));
            child.stderr!.on("data", (chunk: Buffer) => {
                stderr = (stderr + chunk.toString()).slice(-8192);
            });

            child.once("error", error => resume(Effect.fail(new Errors.MediaProcessingFailedError({ cause: error }))));
            child.once("close", code =>
                resume(code === 0 ? Effect.succeed(Buffer.concat(chunks)) : Effect.fail(new Errors.MediaProcessingFailedError({ details: { binary, exitCode: code, stderr } }))),
            );

            return Effect.sync(() => {
                if (child.exitCode === null) child.kill();
            });
        });
    }).pipe(Effect.timeoutOrElse({ duration: "2 minutes", orElse: () => Effect.fail(new Errors.MediaProcessingFailedError({ message: `${binary} timed out` })) }));
}

interface FFprobeOutput {
    format?: {
        duration?: string | number;
    };
    streams?: FFprobeStream[];
}

export function getVideoMetadata(filePath: string): Promise<Result<VideoMetadata, AppError>> {
    const binaryPath = getBinaryPath("ffprobe");
    if (!binaryPath.success) return Promise.resolve(binaryPath);

    return new Promise(resolve => {
        let child;
        try {
            child = spawn(binaryPath.data, ["-v", "error", "-select_streams", "v:0", "-show_streams", "-show_format", "-of", "json", filePath]);
        } catch (error) {
            resolve(Result.reject(Errors.mediaProcessingFailed({ message: "Unable to start FFprobe.", error, details: { filePath } })));
            return;
        }

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => (stdout += data.toString()));
        child.stderr.on("data", (data: Buffer) => (stderr += data.toString()));

        child.on("error", error => resolve(Result.reject(Errors.mediaProcessingFailed({ message: "FFprobe could not inspect the media", error, details: { filePath } }))));
        child.on("close", code => {
            if (code !== 0) {
                resolve(Result.reject(Errors.mediaProcessingFailed({ message: "FFprobe could not read the media metadata", details: { filePath, exitCode: code, stderr: stderr.trim() } })));
                return;
            }

            try {
                const data = JSON.parse(stdout) as FFprobeOutput;
                const stream = data.streams?.[0];

                if (!stream) {
                    resolve(Result.reject(Errors.mediaProcessingFailed({ message: "No video stream was found", details: { filePath } })));
                    return;
                }

                let width = Number(stream.width ?? 0);
                let height = Number(stream.height ?? 0);

                const sideDataRotation = stream.side_data_list?.map(item => item.rotation).find(rotation => rotation !== undefined);
                const tagRotation = stream.tags?.rotate;
                const rotation = Number(sideDataRotation ?? tagRotation ?? 0);
                const normalizedRotation = ((rotation % 360) + 360) % 360;
                if (normalizedRotation === 90 || normalizedRotation === 270) {
                    [width, height] = [height, width];
                }

                resolve(
                    Result.accept({
                        duration: Number(data.format?.duration ?? 0),
                        width,
                        height,
                    }),
                );
            } catch (error) {
                resolve(Result.reject(Errors.mediaProcessingFailed({ message: "Unable to read the video metadata", error, details: { filePath } })));
            }
        });
    });
}
