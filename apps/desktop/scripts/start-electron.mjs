import * as NodeChildProcess from "node:child_process";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { ensureElectronRuntime } from "./ensure-electron-runtime.mjs";

const __dirname = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const desktopDir = NodePath.resolve(__dirname, "..");

const electronPath = ensureElectronRuntime();

const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

const child = NodeChildProcess.spawn(electronPath, ["dist-electron/main.cjs", ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: desktopDir,
    env: childEnv,
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 0);
});
