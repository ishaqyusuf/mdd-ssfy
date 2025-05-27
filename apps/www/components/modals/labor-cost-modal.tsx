"use client";

import { useLaborCostModal } from "@/hooks/use-labor-cost-modal";
import { Dialog, DialogContent, DialogTitle } from "@gnd/ui/dialog";

export function LaborCostModal() {
    const { params } = useLaborCostModal();

    return (
        <Dialog open={params.laborCostModal}>
            <DialogContent className="min-w-max max-w-lg">
                <DialogTitle>Labor Cost</DialogTitle>
            </DialogContent>
        </Dialog>
    );
}
