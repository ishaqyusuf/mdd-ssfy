import { createContext, useContext, useEffect, useMemo } from "react";
import { useFormDataStore } from "../../_common/_stores/form-data-store";
import { HptClass } from "../../_utils/helpers/zus/hpt-class";
import { MouldingClass } from "../../_utils/helpers/zus/moulding-class";
import { ServiceClass } from "../../_utils/helpers/zus/service-class";
export const Context = createContext<ReturnType<typeof useCreateContext>>(
    null as any
);
export const useCtx = () => useContext(Context);

export const useCreateContext = (itemStepUid) => {
    const [itemUid, stepUid] = itemStepUid?.split("-");
    const zus = useFormDataStore();

    const itemIds = zus?.kvFormItem?.[itemUid]?.groupItem?.itemIds;
    const ctx = new ServiceClass(itemStepUid);
    useEffect(() => {
        ctx.dotUpdateItemForm("groupItem.type", "SERVICE");
    }, []);
    const _ctx = useMemo(() => {
        const itemForm = ctx.getItemForm();
        return {
            zus,
            ctx,
            itemForm,
            ...ctx.getServiceLineForm(),
        };
    }, [
        itemStepUid,
        // zus?.kvFormItem?.[itemUid]?.groupItem?.itemIds,
        // itemStepUid, zus
    ]);
    return {
        ctx,
        itemIds,
        ..._ctx,
    };
};
