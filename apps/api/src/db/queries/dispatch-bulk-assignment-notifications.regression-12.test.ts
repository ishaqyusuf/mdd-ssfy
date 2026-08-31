import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./dispatch.ts", import.meta.url), "utf8");

describe("bulk driver assignment notifications", () => {
	test("routes each changed dispatch through the notification-aware updater", () => {
		const bulk = source.slice(
			source.indexOf("export async function bulkAssignDispatchDriver"),
			source.indexOf("export async function bulkCancelDispatches"),
		);
		expect(bulk).toContain("await updateDispatchDriver(ctx");
		expect(bulk).toContain("notificationResults: updated.notificationResults");
		expect(bulk).not.toContain("orderDelivery.updateMany");
	});
});
