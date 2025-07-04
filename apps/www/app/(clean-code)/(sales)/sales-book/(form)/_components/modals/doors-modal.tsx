import { LegacyDoorHPTType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
 
import Button from "@/components/common/button";
import Modal from "@/components/common/modal";

import { ScrollArea } from "@gnd/ui/scroll-area";

interface Props {
    hptCtx: LegacyDoorHPTType;
}
export default function DoorsModal({ hptCtx }: Props) {
    const { filteredComponents } = hptCtx.doorStepCtx;
    function swapDoor() {}
    return (
        <Modal.Content size="xl">
            <Modal.Header title="Select Door" />
            <ScrollArea className="max-h-[70vh]">
                <div className="grid grid-cols-4 gap-4">
                    {filteredComponents.map((item) => (
                        <Button
                            onClick={() => {}}
                            variant="outline"
                            className="h-auto"
                            key={item.id}
                        >
                            <div className="h-56">
                                
                            </div>
                            <div className="">{item.product.description}</div>
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </Modal.Content>
    );
}
