export const ipc = {
    GET_APP_INFO: "desktop:get-app-info",
    SET_THEME: "desktop:set-theme",
    OPEN_EXTERNAL: "desktop:open-external",
    CONFIRM_DIALOG: "desktop:confirm-dialog",
    PICK_FOLDER: "desktop:pick-folder",
    SHOW_CONTEXT_MENU: "desktop:show-context-menu",

    GET_UPDATE_STATE: "desktop:get-update-state",
    SET_UPDATE_CHANNEL: "desktop:set-update-channel",
    CHECK_FOR_UPDATE: "desktop:check-for-update",
    DOWNLOAD_UPDATE: "desktop:download-update",
    INSTALL_UPDATE: "desktop:install-update",

    UPDATE_STATE: "desktop:update-state",
    MENU_ACTION: "desktop:menu-action",
} as const;
