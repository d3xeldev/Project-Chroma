import { Context, Effect, FileSystem, Layer, Option, Path, Schema, SynchronizedRef } from "effect";
import { defaultDesktopSettings, DesktopSettingsSchemaDoc, DesktopTheme, DesktopUpdateChannel, type DesktopSettings as DesktopSettingsType } from "@recall/contracts";
import { writeFileStringAtomically } from "@recall/shared/atomicWrite";

import * as DesktopEnvironment from "./DesktopEnvironment.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const DesktopSettingsJson = Schema.fromJsonString(DesktopSettingsSchemaDoc);
const decodeDesktopSettingsJson = Schema.decodeUnknownEffect(DesktopSettingsJson);
const encodeDesktopSettingsJson = Schema.encodeUnknownEffect(DesktopSettingsJson);

export interface DesktopSettingsChange {
    readonly settings: DesktopSettingsType;
    readonly changed: boolean;
}

const settingsChange = (settings: DesktopSettingsType, changed: boolean): DesktopSettingsChange => ({
    settings,
    changed,
});

export class DesktopSettingsWriteError extends Schema.TaggedError<DesktopSettingsWriteError>()("DesktopSettingsWriteError", {
    path: Schema.String,
    cause: Schema.Defect(),
}) {
    override get message(): string {
        return `Failed to persist desktop settings at ${this.path}.`;
    }
}

export class DesktopSettings extends Context.Service<
    DesktopSettings,
    {
        readonly load: Effect.Effect<DesktopSettingsType>;
        readonly get: Effect.Effect<DesktopSettingsType>;
        readonly setTheme: (theme: DesktopTheme) => Effect.Effect<DesktopSettingsChange, DesktopSettingsWriteError>;
        readonly setAccentColor: (theme: string) => Effect.Effect<DesktopSettingsChange, DesktopSettingsWriteError>;
        readonly setUpdateChannel: (channel: DesktopUpdateChannel) => Effect.Effect<DesktopSettingsChange, DesktopSettingsWriteError>;
    }
>()("@app/desktop/settings/DesktopSettings") {}

function normalizeDocument(parsed: DesktopSettingsSchemaDoc): DesktopSettingsType {
    return {
        setupCompleted: parsed.setupCompleted ?? defaultDesktopSettings.setupCompleted,
        libraries: parsed.libraries ?? defaultDesktopSettings.libraries,
        selectedLibrary: parsed.selectedLibrary ?? defaultDesktopSettings.selectedLibrary,
        theme: parsed.theme ?? defaultDesktopSettings.theme,
        accentColor: parsed.accentColor ?? defaultDesktopSettings.accentColor,
        updateChannel: parsed.updateChannel ?? defaultDesktopSettings.updateChannel,
        libraryZoom: parsed.libraryZoom ?? defaultDesktopSettings.libraryZoom,
        libraryExpanded: parsed.libraryExpanded ?? defaultDesktopSettings.libraryExpanded,
        searchEnabled: parsed.searchEnabled ?? defaultDesktopSettings.searchEnabled,
        importOptions: {
            livePhotos: parsed.importOptions?.livePhotos ?? defaultDesktopSettings.importOptions.livePhotos,
            edits: parsed.importOptions?.edits ?? defaultDesktopSettings.importOptions.edits,
        },
        exportOptions: {
            livePhotos: parsed.exportOptions?.livePhotos ?? defaultDesktopSettings.exportOptions.livePhotos,
            edits: parsed.exportOptions?.edits ?? defaultDesktopSettings.exportOptions.edits,
            adjustments: parsed.exportOptions?.adjustments ?? defaultDesktopSettings.exportOptions.adjustments,
            nameByTakenDate: parsed.exportOptions?.nameByTakenDate ?? defaultDesktopSettings.exportOptions.nameByTakenDate,
            dateFormat: parsed.exportOptions?.dateFormat ?? defaultDesktopSettings.exportOptions.dateFormat,
        },
    };
}

function toDocument(settings: DesktopSettingsType, defaults: DesktopSettingsType): DesktopSettingsSchemaDoc {
    const document: Mutable<DesktopSettingsSchemaDoc> = {
        importOptions: {},
        exportOptions: {},
    };
    if (settings.setupCompleted !== defaults.setupCompleted) document.setupCompleted = settings.setupCompleted;
    if (JSON.stringify(settings.libraries) !== JSON.stringify(defaults.libraries)) document.libraries = settings.libraries;
    if (settings.selectedLibrary !== defaults.selectedLibrary && settings.selectedLibrary !== undefined) document.selectedLibrary = settings.selectedLibrary;
    if (settings.theme !== defaults.theme) document.theme = settings.theme;
    if (settings.accentColor !== defaults.accentColor) document.accentColor = settings.accentColor;
    if (settings.updateChannel !== defaults.updateChannel) document.updateChannel = settings.updateChannel;
    if (settings.libraryZoom !== defaults.libraryZoom) document.libraryZoom = settings.libraryZoom;
    if (settings.libraryExpanded !== defaults.libraryExpanded) document.libraryExpanded = settings.libraryExpanded;
    if (settings.searchEnabled !== defaults.searchEnabled) document.searchEnabled = settings.searchEnabled;

    const importOptions: Mutable<DesktopSettingsSchemaDoc["importOptions"]> = {};
    if (settings.importOptions.livePhotos !== defaults.importOptions.livePhotos) importOptions.livePhotos = settings.importOptions.livePhotos;
    if (settings.importOptions.edits !== defaults.importOptions.edits) importOptions.edits = settings.importOptions.edits;
    document.importOptions = importOptions;

    const exportOptions: Mutable<DesktopSettingsSchemaDoc["exportOptions"]> = {};
    if (settings.exportOptions.livePhotos !== defaults.exportOptions.livePhotos) exportOptions.livePhotos = settings.exportOptions.livePhotos;
    if (settings.exportOptions.edits !== defaults.exportOptions.edits) exportOptions.edits = settings.exportOptions.edits;
    if (settings.exportOptions.adjustments !== defaults.exportOptions.adjustments) exportOptions.adjustments = settings.exportOptions.adjustments;
    if (settings.exportOptions.nameByTakenDate !== defaults.exportOptions.nameByTakenDate) exportOptions.nameByTakenDate = settings.exportOptions.nameByTakenDate;
    if (settings.exportOptions.dateFormat !== defaults.exportOptions.dateFormat) exportOptions.dateFormat = settings.exportOptions.dateFormat;
    document.exportOptions = exportOptions;

    return document;
}

function setTheme(settings: DesktopSettingsType, theme: DesktopTheme): DesktopSettingsType {
    return settings.theme === theme ? settings : { ...settings, theme };
}

function setAccentColor(settings: DesktopSettingsType, accentColor: string): DesktopSettingsType {
    return settings.accentColor === accentColor ? settings : { ...settings, accentColor };
}

function setUpdateChannel(settings: DesktopSettingsType, updateChannel: DesktopUpdateChannel): DesktopSettingsType {
    return settings.updateChannel === updateChannel ? settings : { ...settings, updateChannel };
}

function readSettings(fileSystem: FileSystem.FileSystem, settingsPath: string): Effect.Effect<DesktopSettingsType> {
    return fileSystem.readFileString(settingsPath).pipe(
        Effect.option,
        Effect.flatMap(
            Option.match({
                onNone: () => Effect.succeed(defaultDesktopSettings),
                onSome: raw =>
                    decodeDesktopSettingsJson(raw).pipe(
                        Effect.map(normalizeDocument),
                        Effect.orElseSucceed(() => defaultDesktopSettings),
                    ),
            }),
        ),
    );
}

export const make = Effect.gen(function* () {
    const environment = yield* DesktopEnvironment.DesktopEnvironment;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const settingsRef = yield* SynchronizedRef.make(environment.defaultDesktopSettings);

    const persist = (update: (settings: DesktopSettingsType) => DesktopSettingsType): Effect.Effect<DesktopSettingsChange, DesktopSettingsWriteError> =>
        SynchronizedRef.modifyEffect(settingsRef, settings => {
            const nextSettings = update(settings);
            if (nextSettings === settings) {
                return Effect.succeed([settingsChange(settings, false), settings] as const);
            }
            return Effect.gen(function* () {
                const contents = yield* encodeDesktopSettingsJson(toDocument(nextSettings, environment.defaultDesktopSettings));
                yield* writeFileStringAtomically({
                    filePath: environment.desktopSettingsPath,
                    contents: `${contents}\n`,
                });
                return [settingsChange(nextSettings, true), nextSettings] as const;
            }).pipe(
                Effect.provideService(FileSystem.FileSystem, fileSystem),
                Effect.provideService(Path.Path, path),
                Effect.mapError(
                    cause =>
                        new DesktopSettingsWriteError({
                            path: environment.desktopSettingsPath,
                            cause,
                        }),
                ),
            );
        });

    return DesktopSettings.of({
        get: SynchronizedRef.get(settingsRef),
        load: Effect.gen(function* () {
            const settings = yield* readSettings(fileSystem, environment.desktopSettingsPath);
            return yield* SynchronizedRef.setAndGet(settingsRef, settings);
        }).pipe(Effect.withSpan("desktop.settings.load")),
        setTheme: theme => persist(settings => setTheme(settings, theme)).pipe(Effect.withSpan("desktop.settings.setTheme", { attributes: { theme } })),
        setAccentColor: accentColor => persist(settings => setAccentColor(settings, accentColor)).pipe(Effect.withSpan("desktop.settings.setAccentColor", { attributes: { accentColor } })),
        setUpdateChannel: channel =>
            persist(settings => setUpdateChannel(settings, channel)).pipe(
                Effect.withSpan("desktop.settings.setUpdateChannel", {
                    attributes: { channel },
                }),
            ),
    });
});

export const layer = Layer.effect(DesktopSettings, make);

// In-memory Test

export const layerTest = (initialSettings: DesktopSettingsType = defaultDesktopSettings) =>
    Layer.effect(
        DesktopSettings,
        Effect.gen(function* () {
            const settingsRef = yield* SynchronizedRef.make(initialSettings);
            const update = (f: (settings: DesktopSettingsType) => DesktopSettingsType) =>
                SynchronizedRef.modify(settingsRef, settings => {
                    const nextSettings = f(settings);
                    return [settingsChange(nextSettings, nextSettings !== settings), nextSettings] as const;
                });

            return DesktopSettings.of({
                get: SynchronizedRef.get(settingsRef),
                load: SynchronizedRef.get(settingsRef),
                setTheme: theme => update(settings => setTheme(settings, theme)),
                setAccentColor: accentColor => update(settings => setAccentColor(settings, accentColor)),
                setUpdateChannel: channel => update(settings => setUpdateChannel(settings, channel)),
            });
        }),
    );
