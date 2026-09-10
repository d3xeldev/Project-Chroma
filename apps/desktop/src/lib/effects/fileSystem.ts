import { constants } from "node:fs";
import fs from "node:fs/promises";
export const makeDirectory = (directory: string) => attemptPromise(() => fs.mkdir(directory, { recursive: true })).pipe(Effect.asVoid);
export const readFile = (file: string) => attemptPromise(() => fs.readFile(file));
export const copyFile = (source: string, destination: string, exclusive = true) => attemptPromise(() => fs.copyFile(source, destination, exclusive ? constants.COPYFILE_EXCL : 0));
export const removeFile = (file: string, force = false) => attemptPromise(() => fs.rm(file, { force }));
