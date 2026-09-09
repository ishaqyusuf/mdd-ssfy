import type { Db, TransactionClient } from "@gnd/db";
import type { channelNames } from "@gnd/utils/notification-channels";

/** Must be called with the same transaction that creates the destination. */
export async function recordSalesCopyActivity(
  db: Db | TransactionClient,
  input: {
    authorId: number;
    sourceId: number;
    sourceNumber: string;
    sourceType: string;
    salesId: number;
    orderNo: string;
    operation: "copy" | "move";
  },
) {
  const author = await db.users.findFirstOrThrow({
    where: { id: input.authorId, deletedAt: null },
    select: { id: true, name: true },
  });
  const contact =
    (await db.notePadContacts.findFirst({
      where: { profileId: author.id, role: "employee", deletedAt: null },
      select: { id: true },
    })) ??
    (await db.notePadContacts.create({
      data: { profileId: author.id, role: "employee", name: author.name },
      select: { id: true },
    }));
  const tags = {
    channel: "sales_info" satisfies (typeof channelNames)[number],
    source: "system",
    type: "system",
    status: "public",
    activity: "sales_copied",
    salesId: String(input.salesId),
    salesNo: input.orderNo,
    orderNo: input.orderNo,
    sourceSalesId: String(input.sourceId),
    sourceSalesNo: input.sourceNumber,
    sourceSalesType: input.sourceType,
    operation: input.operation,
  };
  return db.notePad.create({
    data: {
      subject: "Sale copied",
      headline: "Copy Action",
      note: Array.from(`Copied from ${input.sourceNumber}`).slice(0, 191).join(""),
      senderContactId: contact.id,
      createdById: author.id,
      tags: {
        createMany: {
          data: Object.entries(tags).map(([tagName, tagValue]) => ({
            tagName,
            tagValue,
          })),
        },
      },
    },
    select: { id: true },
  });
}
