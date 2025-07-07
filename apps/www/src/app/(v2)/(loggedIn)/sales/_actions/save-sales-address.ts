"use server";

import { ISalesAddressForm } from "@/types/sales";
import { _saveSalesAddress } from "../_data-access/save-sales-address.dac";
import { createSafeAction } from "@/lib/create-safe-action";

async function saveSalesAddressActionHandler(form: ISalesAddressForm) {
    const response = _saveSalesAddress(form);
    return response;
}

export const saveSalesAddressAction = saveSalesAddressActionHandler;
//createSafeAction(
//  saveSalesAddressActionHandler
//);
