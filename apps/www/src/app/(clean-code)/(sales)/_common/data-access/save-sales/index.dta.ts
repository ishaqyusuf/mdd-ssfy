import { SalesFormFields } from "@/app-deps/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { SaveQuery, SaveSalesClass } from "./save-sales-class";
import { syncSalesInventoryLineItems } from "@sales/sync-sales-inventory-line-items";

export async function saveSalesFormDta(
    form: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery
) {
    const worker = new SaveSalesClass(form, oldFormState, query);
    await worker.execute();
    const result = worker.result();

    if (!result?.data?.error && result?.salesId) {
        await prisma.$transaction((tx) =>
            syncSalesInventoryLineItems(tx as any, {
                salesOrderId: result.salesId,
                source: "old-form",
            })
        );
    }

    return result;
}
