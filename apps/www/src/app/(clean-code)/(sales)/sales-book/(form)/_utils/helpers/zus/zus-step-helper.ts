import { deleteStepComponentsUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { ZusSales } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { toast } from "sonner";

interface LoadStepComponentsProps {
    stepUid: string;
    zus: ZusSales;
}

export async function zusDeleteComponents({
    stepUid,
    zus,
    productUid,
    selection,
}: LoadStepComponentsProps & { productUid: string[]; selection?: boolean }) {
    let uids = productUid?.filter(Boolean);
    const [uid, _stepUid] = stepUid?.split("-");

    if (uids.length) {
        await deleteStepComponentsUseCase(uids);
        toast.message("Deleted.");
    }
    // const stepComponents = zus.kvStepComponentList[_stepUid];
    // zus.dotUpdate(
    //     `kvStepComponentList.${_stepUid}`,
    //     stepComponents?.filter((c) => uids.every((u) => u != c.uid))
    // );
}
