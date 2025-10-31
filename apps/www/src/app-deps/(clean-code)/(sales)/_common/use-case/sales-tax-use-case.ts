"use server";

import { getTaxesDta } from "../data-access/tax.dta";

export async function getTaxListUseCase() {
    const res = await getTaxesDta();
    return res;
}
export async function getTaxListOptionUseCase() {
    const res = await getTaxesDta();
    return [{ title: "None", taxCode: null }, ...res];
}
