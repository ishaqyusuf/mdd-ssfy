import { SalesFormFields } from "@/app-deps/(clean-code)/(sales)/types";
import { SaveQuery, SaveSalesClass } from "./save-sales-class";
import { queueSalesInventoryLineItemsSync } from "@gnd/sales/sales-inventory-sync-job";

export async function saveSalesFormDta(
    form: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery
) {
    const worker = new SaveSalesClass(form, oldFormState, query);
    await worker.execute();
    const result = worker.result();

    if (!result?.data?.error && result?.salesId) {
        await queueSalesInventoryLineItemsSync({
            salesOrderId: result.salesId,
            source: "old-form",
        });
    }

    return result;
}
