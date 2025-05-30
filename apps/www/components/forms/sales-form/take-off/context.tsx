import { getStepProductImg } from "@/actions/get-step-product-img";
import { getTakeOffContext } from "@/actions/get-takeoff-context";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { rndTimeout } from "@/lib/timeout";
import { generateRandomString } from "@/lib/utils";
import { createContextFactory } from "@/utils/context-factory";
import { useState } from "react";
import { useAsyncMemo } from "use-async-memo";

export const { Provider: TakeOffProvider, useContext: useTakeoff } =
    createContextFactory(() => {
        const zus = useFormDataStore();
        // const r = generateRandomString();
        const [refresh, setRefresh] = useState(null);
        const res = useAsyncMemo(async () => {
            await rndTimeout();
            const res = await getTakeOffContext();
            return res;
        }, [refresh]);
        return {
            zus,
            sections: res?.sections,
            refresh() {
                setRefresh(generateRandomString());
            },
        };
    });
export const { Provider: TakeoffItemProvider, useContext: useTakeoffItem } =
    createContextFactory((itemUid) => {
        const ctx = useTakeoff();
        const [openTemplateForm, setOpenTemplateForm] = useState(false);
        const stepSequence = ctx?.zus?.sequence?.stepComponent?.[itemUid];
        const section = ctx.sections?.find(
            (a) =>
                ctx.zus?.kvStepForm?.[`${itemUid}-${a.stepUid}`]
                    ?.componentUid == a.componentUid,
        );
        const itemForm = ctx.zus.kvFormItem[itemUid];
        const doorStepProductId = itemForm?.groupItem?.doorStepProductId;
        const door = useAsyncMemo(async () => {
            let resp = { img: section?.img, title: null };
            if (doorStepProductId) {
                const src = await getStepProductImg(doorStepProductId);
                if (src?.title) resp = src;
            }
            return resp;
        }, [doorStepProductId, section?.img]);
        const doorUid = itemForm?.groupItem?.doorStepProductUid;
        // const sizeList
        // itemForm.groupItem
        return {
            itemUid,
            doorUid,
            stepSequence,
            door,
            section,
            itemForm,
            openTemplateForm,
            setOpenTemplateForm,
            ...ctx,
        };
    });
