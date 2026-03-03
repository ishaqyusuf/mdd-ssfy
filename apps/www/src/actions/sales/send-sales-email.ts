"use server";
import { actionClient } from "../safe-action";
import { tasks } from "@trigger.dev/sdk/v3";
import { sendSalesEmailSchema } from "@jobs/schema";
import { saveNote } from "@gnd/utils/note";
import { db } from "@gnd/db";
import { user } from "@/app/(v1)/_actions/utils";
export const sendSalesEmail = actionClient
    .schema(
        // z.object({})
        sendSalesEmailSchema,
    )
    .metadata({
        name: "send-sales-email",
    })
    .action(async ({ parsedInput: params, ctx }) => {
        const event = await tasks.trigger("send-sales-email", {
            ...params,
        });
        const sales = await db.salesOrders.findMany({
            where: {
                id: params.salesIds?.length
                    ? {
                          in: params.salesIds,
                      }
                    : undefined,
                orderId: params.salesNos?.length
                    ? {
                          in: params.salesNos,
                      }
                    : undefined,
            },
            select: {
                orderId: true,
                id: true,
            },
        });
        const auth = await user();
        await Promise.all(
            sales?.map((sale) =>
                saveNote(
                    db,
                    {
                        note: `Sales email was sent for salesId: ${sale.orderId}`,
                        headline: `Sales email was sent for salesId: ${sale.orderId}`,
                        subject: `Sales email`,
                        noteColor: "green",
                        tags: [
                            {
                                tagName: "salesId",
                                tagValue: String(sale.id),
                            },
                        ],
                    },
                    auth.id,
                ),
            ),
        );
        return event;
    });

