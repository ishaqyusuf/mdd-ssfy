import { expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { findPendingFulfillmentNoticeCommands } from "./fulfillment-notification-pending";

test("pending sweep uses its lookahead row only to return a continuation cursor", async () => {
	const db = {
		$queryRaw: async () => [{ id: "a" }, { id: "b" }, { id: "c" }],
	} as unknown as Db;
	expect(await findPendingFulfillmentNoticeCommands(db, { limit: 2 })).toEqual({
		requestIds: ["a", "b"],
		nextCursor: "b",
	});
});

test("pending sweep stops pagination at the last page", async () => {
	const db = { $queryRaw: async () => [{ id: "b" }] } as unknown as Db;
	expect(
		await findPendingFulfillmentNoticeCommands(db, { afterId: "a", limit: 2 }),
	).toEqual({ requestIds: ["b"], nextCursor: null });
});

test("pending sweep returns no continuation for an empty result", async () => {
	const db = { $queryRaw: async () => [] } as unknown as Db;
	expect(await findPendingFulfillmentNoticeCommands(db)).toEqual({
		requestIds: [],
		nextCursor: null,
	});
});
