import { openDoorSizeSelectModal } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/open-modal";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";

export function HptAddDoorSize({ cls }) {
    const addDoorSize = () => {
        openDoorSizeSelectModal(cls);
    };
    return (
        <>
            <Button onClick={addDoorSize}>
                <Icons.add className="mr-2 size-4" />
                <span>Size</span>
            </Button>
        </>
    );
}
