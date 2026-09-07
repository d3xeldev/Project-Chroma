import { Button } from "@project-chroma/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@project-chroma/ui/dialog";

interface DeleteItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    items: unknown[];
    onConfirm: () => unknown;
}

export function DeleteItemDialog({ open, onOpenChange, items, onConfirm }: DeleteItemDialogProps) {
    function confirmAction() {
        onOpenChange(false);
        onConfirm();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {items.length === 1 ? "this item" : items.length + " items"}?</DialogTitle>
                    <DialogDescription>
                        {items.length === 1 ? "This item" : "These items"} and all associated files will be <span className="text-secondary-foreground font-bold">permanently</span> deleted from your
                        library and removed from all albums. This can't be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={confirmAction}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
