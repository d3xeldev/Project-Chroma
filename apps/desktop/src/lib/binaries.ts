import fs from "node:fs";
import path from "node:path";
import { attempt } from "@project-chroma/utils";
import { BinaryNotFoundError } from "@project-chroma/utils/errors";

export type ChromaBinary = "ffmpeg" | "ffprobe";

const extension = process.platform === "win32" ? ".exe" : "";
const developmentDirectory = path.join(process.cwd(), "resources", "bin");
const packagedDirectory = path.join(process.resourcesPath ?? developmentDirectory, "bin");

export function getBinaryPath(binary: ChromaBinary) {
    return attempt(() => {
        const binaryPath = path.join(process.env.ELECTRON_START_URL ? developmentDirectory : packagedDirectory, `${binary}${extension}`);

        if (!fs.existsSync(binaryPath)) {
            throw new BinaryNotFoundError({ message: `Bundled ${binary} binary is not available.`, details: { binary, binaryPath } });
        }

        return binaryPath;
    });
}
