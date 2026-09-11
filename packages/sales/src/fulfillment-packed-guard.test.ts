import { expect, test } from "bun:test";
import type { TransactionClient } from "@gnd/db";
import { assertFulfillmentHasPackedItems, FulfillmentEmptyLoadError } from "./fulfillment-packed-guard";

test("empty loads reject while packed loads pass", async () => {
  const input = { salesId: 1, fulfillmentId: 2 };
  const client = (count: number) => ({ orderItemDelivery: { count: async () => count } }) as unknown as TransactionClient;
  await expect(assertFulfillmentHasPackedItems(client(0), input)).rejects.toBeInstanceOf(FulfillmentEmptyLoadError);
  await expect(assertFulfillmentHasPackedItems(client(1), input)).resolves.toBeUndefined();
});

test("database failures retain their identity", async () => {
  const failure = new Error("Database unavailable");
  const tx = { orderItemDelivery: { count: async () => { throw failure; } } } as unknown as TransactionClient;
  await expect(assertFulfillmentHasPackedItems(tx, { salesId: 1, fulfillmentId: 2 })).rejects.toBe(failure);
});
