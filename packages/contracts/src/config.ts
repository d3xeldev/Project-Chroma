import { Schema } from "effect";
import { DesktopUpdateChannel } from "./desktop.ts";
import { Library } from "./gallery.ts";

export const DesktopSettingsSchema = Schema.Struct({
    setupCompleted: Schema.Boolean,
    libraries: Schema.Array(Library),
    selectedLibrary: Schema.optional(Schema.String),
    theme: Schema.Literals(["dark", "light"]),
    accentColor: Schema.String,
    updateChannel: DesktopUpdateChannel,
    libraryZoom: Schema.Int,
    libraryExpanded: Schema.Boolean,
    searchEnabled: Schema.Boolean,
    importOptions: Schema.Struct({
        livePhotos: Schema.Boolean,
        edits: Schema.Boolean,
    }),
    exportOptions: Schema.Struct({
        livePhotos: Schema.Boolean,
        edits: Schema.Boolean,
        adjustments: Schema.Boolean,
        nameByTakenDate: Schema.Boolean,
        dateFormat: Schema.String,
    }),
});
export type DesktopSettings = typeof DesktopSettingsSchema.Type;

export const DesktopSettingsSchemaDoc = Schema.Struct({
    setupCompleted: Schema.optionalKey(Schema.Boolean),
    libraries: Schema.optionalKey(Schema.Array(Library)),
    selectedLibrary: Schema.optionalKey(Schema.String),
    theme: Schema.optionalKey(Schema.Literals(["dark", "light"])),
    accentColor: Schema.optionalKey(Schema.String),
    updateChannel: Schema.optionalKey(DesktopUpdateChannel),
    libraryZoom: Schema.optionalKey(Schema.Int),
    libraryExpanded: Schema.optionalKey(Schema.Boolean),
    searchEnabled: Schema.optionalKey(Schema.Boolean),
    importOptions: Schema.Struct({
        livePhotos: Schema.optionalKey(Schema.Boolean),
        edits: Schema.optionalKey(Schema.Boolean),
    }),
    exportOptions: Schema.Struct({
        livePhotos: Schema.optionalKey(Schema.Boolean),
        edits: Schema.optionalKey(Schema.Boolean),
        adjustments: Schema.optionalKey(Schema.Boolean),
        nameByTakenDate: Schema.optionalKey(Schema.Boolean),
        dateFormat: Schema.optionalKey(Schema.String),
    }),
});
export type DesktopSettingsSchemaDoc = typeof DesktopSettingsSchemaDoc.Type;

export const defaultDesktopSettings = {
    setupCompleted: false,
    libraries: [],
    selectedLibrary: undefined,
    theme: "dark",
    accentColor: "skyaqua",
    updateChannel: "latest",
    libraryZoom: 2,
    libraryExpanded: false,
    searchEnabled: false,
    importOptions: {
        livePhotos: false,
        edits: false,
    },
    exportOptions: {
        livePhotos: false,
        edits: false,
        adjustments: false,
        nameByTakenDate: false,
        dateFormat: "yyyy-MM-dd HH.mm.ss",
    },
} satisfies DesktopSettings;
