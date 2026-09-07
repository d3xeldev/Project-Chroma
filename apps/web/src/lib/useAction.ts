import { useQueryClient } from "@tanstack/react-query";
import { useLibrary } from "@/lib/useLibrary";
import { useMutationSafe } from "@/lib/useMutationSafe";
import { useNotifications } from "@/lib/useNotifications";
import type { ChromaIpcMap } from "@project-chroma/contracts/ipc";

type Params<T extends keyof ChromaIpcMap> = Parameters<ChromaIpcMap[T]>[0];

export function useAction() {
    const { libraries, selectedLibrary, setLibraries, selectLibraryById } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();


    const removeLibrary = useMutationSafe({
        mutationFn: (opts: Params<"chroma:library:remove">) => window.chroma!.library.remove(opts),
        onSuccess: (_, data) => setLibraries(libraries.filter(lib => lib.id !== data.libraryId)),
    });
    const setItemsFavorite = useMutationSafe({
        mutationFn: (opts: Params<"chroma:items:set-favorite">) => window.chroma!.items.setItemsFavorite(opts),
        onSuccess: (_, vars) =>
            syncItems(vars.libraryId, items =>
                items.map(i => {
                    if (vars.itemIds.includes(i.id)) return { ...i, isFavorite: vars.value };
                    return i;
                }),
            ),
    });
    const deleteItems = useMutationSafe({
        mutationFn: (opts: Params<"chroma:items:delete">) => window.chroma!.items.deleteItems(opts),
        onSuccess: (_, vars) => syncItems(vars.libraryId, items => items.filter(item => !vars.itemIds.includes(item.id))),
    });
    const createAlbum = useMutationSafe({
        mutationFn: (opts: Params<"chroma:albums:create">) => window.chroma!.albums.create(opts),
        onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: queryKeys.albums(vars.libraryId, vars.album.parent) }),
    });
    const addItemsToAlbum = useMutationSafe({
        mutationFn: (opts: Params<"chroma:albums:add-items">) =>
            window.chroma!.albums.addItems({
                libraryId: opts.libraryId,
                albumId: opts.albumId,
                itemIds: opts.itemIds,
            }),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.albumItems(vars.libraryId, vars.albumId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.albums(vars.libraryId, vars.parent) });
        },
    });
        createLibrary: (name: string, icon: string, color: string, path: string, onSuccess?: () => void) => {
            if (!window.chroma) return;

            pushNoti({
                title: "Creating library",
                description: `Library "${name}" is being created...`,
                type: "promise",
                promise: window.chroma.library.create({ name, icon, color, path }),
                peek: "Creating library",
                success: () => ({
                    title: "Library created",
                    description: `The library "${name}" was created successfully!`,
                }),
                error: () => ({
                    title: "Error creating library",
                    description: "An error occurred while creating the library",
                }),
                onSuccess: async d => {
                    await selectLibraryById(d.id);
                    onSuccess?.();
                },
            });
        },
        addLibrary: (name: string, path: string, onSuccess?: () => void, onError?: () => void) => {
            if (!window.chroma) return;

            pushNoti({
                title: "Adding library",
                description: `Library "${name}" is being added...`,
                type: "promise",
                promise: window.chroma.library.add({ path }),
                peek: "Adding library",
                success: () => ({
                    title: "Library added",
                    description: `The library "${name}" was added successfully!`,
                }),
                error: () => ({
                    title: "Error adding library",
                    description: "An error occurred while adding the library",
                }),
                onError,
                onSuccess: async d => {
                    await selectLibraryById(d.id);
                    onSuccess?.();
                },
            });
        },
        removeLibrary: async (libraryId: string) => {
            await removeLibrary.mutateAsync({ libraryId });

            const idx = libraries.findIndex(lib => lib.id === libraryId);
            const rest = libraries.filter(lib => lib.id !== libraryId);

            setLibraries(rest);
            await selectLibraryById(rest.length >= idx + 1 ? rest[idx].id : rest.length > 0 ? rest[idx - 1].id : null);
        },
        setItemsFavorite: (itemIds: string[], value: boolean) => {
            if (!selectedLibrary || !itemIds.length) return;
            return setItemsFavorite.mutateAsync({ libraryId: selectedLibrary.id, itemIds, value });
        },
        deleteItems: (itemIds: string[], onSuccess?: () => unknown) => {
            if (!selectedLibrary || !itemIds.length) return;
            pushNoti({
                title: "Deleting items",
                description: `Deleting ${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} from "${selectedLibrary.name}"`,
                type: "promise",
                promise: deleteItems.mutateAsync({ libraryId: selectedLibrary.id, itemIds }),
                peek: "Deleting " + (itemIds.length === 1 ? "item" : "items"),
                success: () => ({
                    title: (itemIds.length === 1 ? "Item" : "Items") + " deleted",
                    description: `${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} have been deleted`,
                }),
                error: () => ({
                    title: "Delete failed",
                    description: "Unable to delete the selected items",
                }),
                onSuccess,
            });
        },
            if (!selectedLibrary) return;
            return createAlbum.mutateAsync({
                libraryId: selectedLibrary.id,
                name,
                description: "",
                parent,
                color,
                icon,
            });
        },
            if (!selectedLibrary) return;
            return removeLibrary.mutateAsync({ libraryId: selectedLibrary.id });
        },
