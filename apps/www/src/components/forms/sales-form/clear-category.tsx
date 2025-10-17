import { useShelf } from "@/hooks/use-shelf";
import { useShelfItem } from "@/hooks/use-shelf-item";

import { Button } from "@gnd/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

export function ClearCategoryModal({ onClear, open, openChange }) {
    const shelf = useShelf();
    const shelfItem = useShelfItem();
    function clearCategories() {
        shelfItem.clearCategories();
        openChange(false);
    }
    return (
        <Dialog open={open} onOpenChange={openChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Clear Categories</DialogTitle>
                </DialogHeader>
                <p>Clearing categories will remove all select products</p>
                <DialogFooter>
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            onClick={(e) => {
                                openChange(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={clearCategories}>
                            Continue
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
