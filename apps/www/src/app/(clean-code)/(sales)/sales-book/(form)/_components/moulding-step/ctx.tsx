import { createContext, useContext, useEffect, useMemo } from "react";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";

import { MouldingClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/moulding-class";
export const Context = createContext<ReturnType<typeof useCreateContext>>(
    null as any
);
export const useCtx = () => useContext(Context);

export const useCreateContext = (itemStepUid) => {
    const zus = useFormDataStore();
    const ctx = useMemo(() => {
        const ctx = new MouldingClass(itemStepUid);

        const itemForm = ctx.getItemForm();
        return {
            zus,
            ctx,
            itemForm,
            ...ctx.getMouldingLineItemForm(),
        };
    }, [
        itemStepUid,
        zus,
        // itemStepUid, zus
    ]);
    return {
        ...ctx,
    };
};
