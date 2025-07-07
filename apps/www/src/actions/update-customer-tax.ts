"use server";

import { prisma } from "@/db";
import { getCustomerFormAction } from "./get-customer-form";

export async function updateCustomerTax(customerId, taxCode) {
    const form = await getCustomerFormAction(customerId);
    if (form.taxProfileId)
        await prisma.customerTaxProfiles.update({
            where: {
                id: form.taxProfileId,
            },
            data: {
                taxCode,
            },
        });
    else {
        await prisma.customerTaxProfiles.create({
            data: {
                taxCode,
                customerId,
            },
        });
    }
}
