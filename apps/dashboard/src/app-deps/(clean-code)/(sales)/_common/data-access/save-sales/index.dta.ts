import { SalesFormFields } from "../../../types";
import { queueSalesInventoryLineItemsSync } from "@gnd/sales/sales-inventory-sync-job";
import { SaveQuery, SaveSalesClass } from "./save-sales-class";

export async function saveSalesFormDta(
    form: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery,
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
