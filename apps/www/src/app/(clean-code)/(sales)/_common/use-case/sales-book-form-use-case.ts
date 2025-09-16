"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";

import { SalesFormFields, SalesType } from "../../types";
import { deleteSalesByOrderId } from "../data-access/sales-dta";
import {
    createSalesBookFormDataDta,
    GetSalesBookFormDataProps,
    getTransformedSalesBookFormDataDta,
} from "../data-access/sales-form-dta";
import {
    loadSalesFormData,
    saveSalesSettingData,
} from "../../../../../actions/sales-settings";
import { getPricingListDta } from "../data-access/sales-pricing-dta";

import { saveSalesFormDta } from "../data-access/save-sales/index.dta";
import { SaveQuery } from "../data-access/save-sales/save-sales-class";
import { composeSalesPricing } from "../utils/sales-pricing-utils";
import { composeStepRouting } from "../utils/sales-step-utils";
import { getSalesLaborCost } from "@/actions/sales-labor-cost";
import { copySales } from "@sales/copy-sales";
import { authUser } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { createNoteAction } from "@/modules/notes/actions/create-note-action";
import { consoleLog } from "@gnd/utils";
export type GetSalesBookForm = AsyncFnType<typeof getSalesBookFormUseCase>;
export async function getSalesBookFormUseCase(data: GetSalesBookFormDataProps) {
    const result = await getTransformedSalesBookFormDataDta(data);
    return await composeBookForm(result);
}
async function composeBookForm<T>(data: T) {
    const laborConfig = await getSalesLaborCost();

    return {
        ...data,
        salesSetting: composeStepRouting(await loadSalesFormData()),
        pricing: composeSalesPricing(await getPricingListDta()),
        laborConfig,
    };
}
export async function createSalesBookFormUseCase(
    data: GetSalesBookFormDataProps,
) {
    const resp = await createSalesBookFormDataDta(data);
    return await composeBookForm(resp);
}
export async function saveSalesSettingUseCase(meta) {
    await saveSalesSettingData(meta);
}

export async function saveFormUseCase(
    data: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery,
    // allowRedirect = true
) {
    if (!oldFormState)
        oldFormState = {
            kvFormItem: {},
            kvStepForm: {},
            sequence: {
                formItem: [],
                multiComponent: {},
                stepComponent: {},
            },
            metaData: {} as any,
        };

    return await saveSalesFormDta(data, oldFormState, query);
}
export async function moveOrderUseCase(orderId, to) {
    const resp = await copySalesUseCase(orderId, to);
    if (!resp?.error) await deleteSalesByOrderId(orderId);
    return resp;
}
export async function copySalesUseCase(orderId, as: SalesType) {
    const resp2 = await copySales({
        db: prisma,
        as,
        salesUid: orderId,
        author: await authUser(),
    });
    await createNoteAction({
        note: `Copied from ${orderId}`,
        headline: "Copy Action",
        type: "general",
        tags: [
            {
                tagName: "salesId",
                tagValue: String(resp2?.id),
            },
            {
                tagName: "type",
                tagValue: "general",
            },
            {
                tagName: "status",
                tagValue: "public",
            },
        ],
    });
    consoleLog("Copy action", resp2);
    const link = resp2?.isDyke ? `/sales-book/edit-${as}/${resp2.slug}` : ``;

    return {
        error: resp2?.error,
        link,
        id: resp2.id,
        slug: resp2.slug,
        data: resp2,
    };
}
