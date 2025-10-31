"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";
import {
    getAddressFormDta,
    searchAddressDta,
} from "../data-access/sales-address-dta";

export type AddressSearchType = AsyncFnType<
    typeof searchAddressUseCase
>[number];
export async function searchAddressUseCase(q) {
    return await searchAddressDta(q);
}
export async function getAddressFormUseCase(id) {
    return await getAddressFormDta(id);
}
