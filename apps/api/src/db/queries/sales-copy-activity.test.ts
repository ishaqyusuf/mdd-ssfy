import { expect, test } from "bun:test";
import { activityOr, activityTag, getActivityTree } from "@notifications/activity-tree";
import { recordSalesCopyActivity } from "@sales/copy-sales-activity";

test("copy writer supplies the channel required by the real Activity reader", async () => {
  type Tag = { tagName: string; tagValue: string };
  let savedTags: Tag[] = [];
  const db = {
    users: { findFirstOrThrow: async () => ({ id: 7, name: "Sales Rep" }) },
    notePadContacts: { findFirst: async () => ({ id: 70 }) },
    notePad: {
      create: async ({ data }: { data: { tags: { createMany: { data: Tag[] } } } }) => {
        savedTags = data.tags.createMany.data;
        return { id: 8 };
      },
      findMany: async ({ where }: { where: {
        tags: { some: { tagName: string; tagValue: { in: string[] } } };
        OR: unknown[];
      } }) => {
        const requiredChannel = where.tags.some;
        const matchesChannel = (tags: Tag[]) => tags.some(tag =>
          tag.tagName === requiredChannel.tagName && requiredChannel.tagValue.in.includes(tag.tagValue),
        );
        expect(matchesChannel(savedTags)).toBe(true);
        // The legacy copy writer supplied salesId but no channel.
        expect(matchesChannel(savedTags.filter(tag => tag.tagName !== "channel"))).toBe(false);
        expect(where.OR).toHaveLength(2);
        return [];
      },
    },
  };
  await recordSalesCopyActivity(db as never, {
    authorId: 7, sourceId: 100, sourceNumber: "00010PC", sourceType: "order",
    salesId: 900, orderNo: "00012PC", operation: "copy",
  });
  await getActivityTree(db as never, {
    filter: activityOr([activityTag("salesId", "900"), activityTag("salesNo", "00012PC")]),
    includeChildren: false,
  });
});
