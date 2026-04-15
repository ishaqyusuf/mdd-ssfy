"use server";

import { AsyncFnType } from "@/app-deps/(clean-code)/type";

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
} from "@/actions/sales-settings";
import { getPricingListDta } from "../data-access/sales-pricing-dta";

import { saveSalesFormDta } from "../data-access/save-sales/index.dta";
import { SaveQuery } from "../data-access/save-sales/save-sales-class";
import { composeSalesPricing } from "../utils/sales-pricing-utils";
import { composeStepRouting } from "../utils/sales-step-utils";
import { getSalesLaborCost } from "@/actions/sales-labor-cost";
import { copySales } from "@sales/copy-sales";
import { authUser } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { createNoteAction } from "@/modules/notes/actions/create-note-action";
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

export async function saveSalesSettingUseCase(meta) {
    await saveSalesSettingData(meta);
}
