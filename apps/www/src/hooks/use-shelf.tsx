import React, {
    createContext,
    useContext,
    useDeferredValue,
    useEffect,
    useMemo,
    useState,
} from "react";
import { getShelfCateogriesAction } from "@/actions/cache/get-shelf-categories";
import { getShelfProductsAction } from "@/actions/cache/get-shelf-products";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { CostingClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class";
import { SettingsClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { StepHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import useEffectLoader from "@/lib/use-effect-loader";
import { generateRandomString } from "@/lib/utils";
import { FieldPath } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";

import { ComboboxContent } from "@gnd/ui/combobox";

export const ShelfContext = createContext<ReturnType<typeof useShelfContext>>(
    null as any,
);

export const useShelf = () => useContext(ShelfContext);
export function useShelfContext(itemStepUid) {
    const { data: categories } = useEffectLoader(getShelfCateogriesAction);
    const [itemUid, stepUid] = itemStepUid?.split("-");
    const costCls = new CostingClass(
        new SettingsClass(itemStepUid, itemUid, stepUid),
    );
    const zus = useFormDataStore();
    const shelfItemUids =
        zus?.kvFormItem?.[itemUid]?.shelfItems?.lineUids || [];
    const basePath = `kvFormItem.${itemUid}.shelfItems`;
    function newProductLine(shelfUid, productUids = []) {
        const puid = generateRandomString();
        zus.dotUpdate(`${basePath}.lines.${shelfUid}.productUids` as any, [
            ...productUids,
            puid,
        ]);
        zus.dotUpdate(
            `${basePath}.lines.${shelfUid}.products.${puid}` as any,
            {} as any,
        );
    }
    function newSection() {
        const uid = generateRandomString();
        zus.dotUpdate(`kvFormItem.${itemUid}.shelfItems.lineUids`, [
            ...shelfItemUids,
            uid,
        ]);
        zus.dotUpdate(
            `kvFormItem.${itemUid}.shelfItems.lines.${uid}.categoryIds`,
            [],
        );

        newProductLine(uid);
    }

    return {
        itemStepUid,
        newProductLine,
        newSection,
        itemUid,
        stepUid,
        categories,
        shelfItemUids,
        costCls,
    };
}
