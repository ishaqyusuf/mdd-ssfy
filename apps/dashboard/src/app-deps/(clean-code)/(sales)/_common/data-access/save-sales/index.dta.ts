import { normalizeSalesInventoryLegacyStatus } from "@gnd/sales/sales-inventory-legacy-compatibility";
import { queueSalesInventoryLineItemsSync } from "@gnd/sales/sales-inventory-sync-job";
import type { SalesFormFields } from "../../../types";
import { type SaveQuery, SaveSalesClass } from "./save-sales-class";

export async function saveSalesFormDta(
    form: SalesFormFields,
    oldFormState?: SalesFormFields,
    query?: SaveQuery,
) {
    const worker = new SaveSalesClass(form, oldFormState, query);
    await worker.execute();
    const result = worker.result();

	if (
		!result?.data?.error &&
		result?.salesId &&
		!normalizeSalesInventoryLegacyStatus(result.inventoryStatus)
	) {
        await queueSalesInventoryLineItemsSync({
            salesOrderId: result.salesId,
            source: "old-form",
        });
    }

    return result;
}
