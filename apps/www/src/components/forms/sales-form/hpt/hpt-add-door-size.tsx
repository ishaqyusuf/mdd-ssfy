import { openDoorSizeSelectModal } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/open-modal";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";
import { useHpt } from "../context";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";

export function HptAddDoorSize({ cls }) {
    const ctx = useHpt();
    const addDoorSize = () => {
        // const s = ctx.hpt.getDoorStepForm2();
        // console.log(s.);
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

