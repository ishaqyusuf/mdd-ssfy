import { useLegacyDykeFormStep } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { useModal } from "@/components/common/modal/provider";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";

import { useStepItemCtx } from "./use-step-items";

export function BatchSelectionAction() {
    const _ctx = useLegacyDykeFormStep();
    const step = useStepItemCtx();
    const modal = useModal();
    function batchDelete() {
        let products = (Object.values(_ctx.selections) as any[])
            .filter((c) => c.selected)
            .map((c) => c.item);

        // console.log({ products });
        _ctx.cancelSelection();
        step.deleteStepItemModal(products);
    }
    if (_ctx.selectCount)
        return (
            <div className="smd:grid-cols-[220px_minmax(0,1fr)] fixed bottom-0  left-0 right-0 z-10  mb-24 md:grid lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="hidden md:block"></div>
                <div className="flex justify-center">
                    <div className="flex items-center justify-center space-x-4 rounded-xl border bg-white p-1 px-3 shadow-lg shadow-muted-foreground">
                        <Label>
                            {_ctx.selectCount} {" Selected"}
                        </Label>
                        <ConfirmBtn
                            onClick={batchDelete}
                            size="sm"
                            className="h-8"
                            variant="destructive"
                            Icon={Icons.trash}
                        >
                            Delete
                        </ConfirmBtn>
                        <Button
                            onClick={() => {
                                _ctx.cancelSelection();
                            }}
                            size="sm"
                            className="h-8"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        );
    return <div className="fixed bottom-0 "></div>;
}
