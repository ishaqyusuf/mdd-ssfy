"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";
import {
    createSalesDispatchDta,
    deleteSalesDispatchDta,
    getSalesDispatchListDta,
    getSalesDispatchFormDta,
    SalesDispatchFormData,
    getDispatchStatusDta,
    updateSalesDispatchStatusDta,
} from "../data-access/sales-dispatch-dta";

export type GetSalesDispatchList = AsyncFnType<
    typeof getSalesDispatchListUseCase
>;
export async function getSalesDispatchListUseCase(query) {
    return await getSalesDispatchListDta(query);
}
export type SalesDispatchForm = SalesDispatchFormData;
export async function salesDispatchFormUseCase(shipping) {
    return await getSalesDispatchFormDta(shipping);
}
export async function createSalesDispatchUseCase(data: SalesDispatchForm) {
    return await createSalesDispatchDta(data);
}
export async function deleteSalesDispatchUseCase(id) {
    return await deleteSalesDispatchDta(id);
}
export async function updateDispatchStatusUseCase(id, status) {
    const currentStatus = await getDispatchStatusDta(id);
    const resp = await updateSalesDispatchStatusDta(id, status, currentStatus);
}
