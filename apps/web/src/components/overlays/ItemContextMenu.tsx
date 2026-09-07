import { useState } from "react";
import { IconArchive, IconCircleMinus, IconEyeOff, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconPhotoPlus, IconShare2, IconTag, IconTrash } from "@tabler/icons-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@project-chroma/ui/context-menu";
import { DeleteItemDialog } from "@/components/overlays/DeleteItemDialog";
import { ExportDialog } from "@/components/overlays/ExportDialog";
import { SelectAlbumDialog } from "@/components/overlays/SelectAlbumDialog";
import { TagManagementPalette } from "@/components/overlays/TagManagementPalette";
import { TransferItemsDialog } from "@/components/overlays/TransferItemsDialog";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import type { Item } from "@project-chroma/contracts/gallery";

interface ItemContextMenuProps<T extends Item> {
    children: React.ReactNode;
    isAlbum?: boolean;
    selected: T[];
    setSelected: (selected: T[]) => unknown;
}

export function ItemContextMenu<T extends Item>({ children, isAlbum = false, selected, setSelected }: ItemContextMenuProps<T>) {
    const [addToAlbumDialog, setAddToAlbumDialog] = useState(false);
    const [transferItemDialog, setTransferItemDialog] = useState(false);
    const [tagManagementPalette, setTagManagementPalette] = useState(false);
    const [exportItemDialog, setExportItemDialog] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState(false);
    const action = useAction();
    const { libraries } = useLibrary();

    const isAllFavorite = selected.every(p => p.isFavorite);

    return (
        <ContextMenu>
            <ContextMenuTrigger className="contents">
                {children}
                <DeleteItemDialog
                    open={deleteItemDialog}
                    onOpenChange={setDeleteItemDialog}
                    items={selected}
                    onConfirm={() =>
                        action.deleteItems(
                            selected.map(p => p.id),
                            () => setSelected([]),
                        )
                    }
                />
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem
                    onClick={() =>
                        action.setItemsFavorite(
                            selected.map(p => p.id),
                            !isAllFavorite,
                        )
                    }
                >
                    {selected.length !== 0 && isAllFavorite ? (
                        <>
                            <IconHeartFilled />
                            Unfavorite
                        </>
                    ) : (
                        <>
                            <IconHeart />
                            Favorite
                        </>
                    )}
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
                <ContextMenuItem variant="destructive" onClick={() => setDeleteItemDialog(true)}>
                    <IconTrash />
                    Delete
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
