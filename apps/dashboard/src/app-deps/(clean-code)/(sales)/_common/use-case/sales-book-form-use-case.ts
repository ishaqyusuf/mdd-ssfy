"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";

import { SalesFormFields } from "../../types";
import {
    createSalesBookFormDataDta,
    GetSalesBookFormDataProps,
    getTransformedSalesBookFormDataDta,
} from "../data-access/sales-form-dta";
import { loadSalesFormData } from "../../../../../actions/sales-settings";
import { getPricingListDta } from "../data-access/sales-pricing-dta";

import { saveSalesFormDta } from "../data-access/save-sales/index.dta";
import { SaveQuery } from "../data-access/save-sales/save-sales-class";
import { composeSalesPricing } from "../utils/sales-pricing-utils";
import { composeStepRouting } from "../utils/sales-step-utils";
import { getSalesLaborCost } from "@/actions/sales-labor-cost";
export type GetSalesBookForm = AsyncFnType<typeof getSalesBookFormUseCase>;
export async function getSalesBookFormUseCase(data: GetSalesBookFormDataProps) {
    const result = await getTransformedSalesBookFormDataDta(data);
    return await composeBookForm(result);
}
async function composeBookForm<T>(data: T) {
    const [laborConfig, salesFormSettings, pricingList] = await Promise.all([
        getSalesLaborCost(),
        loadSalesFormData(),
        getPricingListDta(),
    ]);

    return {
        ...data,
        salesSetting: composeStepRouting(salesFormSettings),
        pricing: composeSalesPricing(pricingList),
        laborConfig,
    };
}
export async function createSalesBookFormUseCase(
    data: GetSalesBookFormDataProps,
) {
    const resp = await createSalesBookFormDataDta(data);
    return await composeBookForm(resp);
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
