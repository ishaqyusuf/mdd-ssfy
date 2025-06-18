"use server";

import { revalidateTag } from "next/cache";
import { updateSalesDueAmount } from "./update-sales-due-amount";
import { createResolution } from "./create-resolution";
import z from "zod";
import { actionClient } from "./safe-action";

const schema = z.object({
    salesId: z.number(),
});
async function salesResolveUpdatePayment(salesId) {
    await updateSalesDueAmount(salesId);
    await createResolution({
        salesId,
        action: "update sales payment",
    });
    revalidateTag(`sales-resolvables`);
}
 
export const salesResolveUpdatePaymentAction = actionClient
    .schema(schema)
    .action(async ({ parsedInput: data }) => {
        await salesResolveUpdatePayment(data.salesId);
    });
