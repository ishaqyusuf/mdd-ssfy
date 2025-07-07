import {
    createContext,
    useContext,
    useEffect,
    useState,
    useTransition,
} from "react";
import { useDykeComponentStore } from "./data-store";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import {
    DykeFormDataPath,
    DykeFormItemData,
    DykeFormItemDataPath,
    DykeFormStepData,
    ItemMultiComponentDataPath,
    ItemMultiComponentSizeDataPath,
    OldDykeFormData,
} from "../../../types";
import legacyDykeFormHelper from "../_utils/helpers/legacy-dyke-form-helper";

import { IStepProducts } from "@/app/(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products";

import { generateRandomString } from "@/lib/utils";
import stepHelpers from "../_utils/helpers/step-helper";
import { toast } from "sonner";
import { DykeStep } from "@/app/(v2)/(loggedIn)/sales-v2/type";

export type LegacyDykeFormType = ReturnType<typeof useLegacyDykeFormContext>;
export const LegacyDykeFormContext = createContext<LegacyDykeFormType>(null);

export const useLegacyDykeForm = () => useContext(LegacyDykeFormContext);
export type LegacyDykeFormItemType = ReturnType<
    typeof useLegacyDykeFormItemContext
>;
export const LegacyDykeFormItemContext =
    createContext<LegacyDykeFormItemType>(null);

export const useLegacyDykeFormItem = () =>
    useContext(LegacyDykeFormItemContext);

export function useLegacyDykeFormContext(data: OldDykeFormData) {
    const form = useForm<OldDykeFormData>({
        defaultValues: {
            ...data,
        },
    });
    const [adminMode] = form.watch(["adminMode"]);
    const [loadingStep, startLoadingStep] = useTransition();
    const itemArray = useFieldArray({
        control: form.control,
        name: "itemArray",
    });

    const ctxValue = {
        startLoadingStep,
        form,
        loadingStep,
        itemArray,
        dealerMode: data.dealerMode,
        superAdmin: data.superAdmin,
        status: data.status,
        adminMode,
        footerCtx: useLegacyFooter(form),
    };
    return ctxValue;
}
function useLegacyFooter(form: UseFormReturn<OldDykeFormData>) {
    const taxListFieldArray = useFieldArray({
        name: "_taxForm.taxList",
        control: form.control,
        keyName: "_id",
    });
    // const taxSelection = form.watch("_taxForm.selection");
    const taxSelectionFieldArray = useFieldArray({
        name: "_taxForm.selection",
        control: form.control,
        keyName: "_id",
    });
    // const taxData = useEffectLoader(getTaxListUseCase);
    async function removeTaxSelection(code, index) {
        const tx = taxSelectionFieldArray.fields[index];
        console.log({ tx });
        // if (tx.id)
        taxSelectionFieldArray.remove(index);
        form.setValue(`_taxForm.taxByCode.${code}.selected`, false);
        setTimeout(() => {
            form.setValue("_taxForm.taxChangedCode", generateRandomString(10));
        }, 500);
    }
    async function changeTax(taxCode) {
        if (!taxCode) {
            removeTaxSelection(taxSelectionFieldArray[0]?.taxCode, 0);
            return;
        }
        const c = taxListFieldArray.fields.find((f) => f.taxCode == taxCode);
        taxSelectionFieldArray.update(0, {
            taxCode: c.taxCode,
            deletedAt: null,
            tax: 0,
            title: c.title,
            percentage: c.percentage,
        });
        form.setValue(`_taxForm.taxByCode.${c.taxCode}.selected`, true);
        form.setValue(
            `_taxForm.taxByCode.${c.taxCode}.data.taxCode`,
            c.taxCode
        );
        form.setValue(`_taxForm.taxByCode.${c.taxCode}._tax`, c);
        setTimeout(() => {
            form.setValue("_taxForm.taxChangedCode", generateRandomString(10));
        }, 500);
    }
    return {
        taxListFieldArray,
        removeTaxSelection,
        changeTax,
        taxSelectionFieldArray,
    };
}
export function useLegacyDykeFormItemContext(rowIndex) {
    const ctx = useLegacyDykeForm();

    const rootPath: DykeFormDataPath = `itemArray.${rowIndex}`;
    const formStepPath: DykeFormItemDataPath = `item.formStepArray`;
    // const multiComponentRootPath: DykeFormItemDataPath = `multiComponent`;
    // const multiComponentPath: ItemMultiComponentDataPath = ''
    const componentsPath: DykeFormItemDataPath = "multiComponent.components";
    const _ = {
        rootPath,
        formStepPath,
        formSteps: () => ctx.form.getValues(`${rootPath}.${formStepPath}`),
        rowIndex,
        mainCtx: ctx,
        getPath: {
            item(path: DykeFormItemDataPath) {
                return `${rootPath}.${path}`;
            },
            componentItem(title, path: ItemMultiComponentDataPath) {
                return `${rootPath}.${componentsPath}.${title}.${path}`;
            },
            doorSize(title, size, path: ItemMultiComponentSizeDataPath) {
                return `${rootPath}.${componentsPath}.${title}.${size}.${path}`;
            },
        },
        get: {
            uid: () => ctx.form.getValues(`${_.getPath.item("uid")}` as any),
            // cacheKey
        },
    };
    return _;
}
