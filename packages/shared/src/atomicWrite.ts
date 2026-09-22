import { Effect, FileSystem, Path } from "effect";

export const writeFileStringAtomically = Effect.fn("shared.atomicWrite.writeFileStringAtomically")(function* (input: { readonly filePath: string; readonly contents: string }) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const targetDirectory = path.dirname(input.filePath);

    yield* fs.makeDirectory(targetDirectory, { recursive: true });
    const tempDirectory = yield* fs.makeTempDirectoryScoped({
        directory: targetDirectory,
        prefix: `${path.basename(input.filePath)}.`,
    });
    const tempPath = path.join(tempDirectory, "contents.tmp");

    yield* fs.writeFileString(tempPath, input.contents);
    yield* fs.rename(tempPath, input.filePath);
}, Effect.scoped);
