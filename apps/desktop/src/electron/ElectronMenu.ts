import { BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import { Context, Effect, Layer, Option } from "effect";
import type { ContextMenuItem } from "@recall/contracts/desktop";

export interface ElectronMenuPosition {
    readonly x: number;
    readonly y: number;
}

export interface ElectronMenuContextInput {
    readonly window: BrowserWindow;
    readonly items: readonly ContextMenuItem[];
    readonly position: Option.Option<ElectronMenuPosition>;
}

export class ElectronMenu extends Context.Service<
    ElectronMenu,
    {
        readonly showContextMenu: (input: ElectronMenuContextInput) => Effect.Effect<Option.Option<string>>;
        readonly setApplicationMenu: (template: readonly MenuItemConstructorOptions[]) => Effect.Effect<void>;
    }
>()("@app/desktop/electron/ElectronMenu") {}

const normalizePosition = (position: Option.Option<ElectronMenuPosition>): Option.Option<ElectronMenuPosition> =>
    Option.filter(position, ({ x, y }) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0).pipe(Option.map(({ x, y }) => ({ x: Math.floor(x), y: Math.floor(y) })));

function buildTemplate(items: readonly ContextMenuItem[], onSelect: (id: string) => void): MenuItemConstructorOptions[] {
    const template: MenuItemConstructorOptions[] = [];
    for (const item of items) {
        if (typeof item.id !== "string" || typeof item.label !== "string") {
            continue;
        }
        if (item.children && item.children.length > 0) {
            const submenu = buildTemplate(item.children, onSelect);
            if (submenu.length === 0) continue;
            template.push({
                label: item.label,
                enabled: item.disabled !== true,
                submenu,
            });
            continue;
        }
        template.push({
            label: item.label,
            enabled: item.disabled !== true,
            click: () => onSelect(item.id),
        });
    }
    return template;
}

export const make = ElectronMenu.of({
    showContextMenu: input =>
        Effect.callback<Option.Option<string>>(resume => {
            let selectedId: string | null = null;
            const template = buildTemplate(input.items, id => {
                selectedId = id;
            });
            if (template.length === 0) {
                resume(Effect.succeed(Option.none()));
                return;
            }
            try {
                const menu = Menu.buildFromTemplate(template);
                const position = normalizePosition(input.position);
                menu.popup({
                    window: input.window,
                    ...Option.match(position, {
                        onNone: () => ({}),
                        onSome: ({ x, y }) => ({ x, y }),
                    }),
                    callback: () => {
                        resume(Effect.succeed(Option.fromNullishOr(selectedId)));
                    },
                });
            } catch {
                resume(Effect.succeed(Option.none()));
            }
        }),
    setApplicationMenu: template =>
        Effect.sync(() => {
            Menu.setApplicationMenu(Menu.buildFromTemplate([...template]));
        }),
});

export const layer = Layer.succeed(ElectronMenu, make);
