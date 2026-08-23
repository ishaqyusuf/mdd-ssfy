import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

async function source(path: string) {
	return readFile(new URL(path, import.meta.url), "utf8");
}

describe("dispatch deletion packing-report hold", () => {
	it("guards direct soft deletion inside a serializable transaction", async () => {
		const dispatch = await source("./dispatch.ts");
		const start = dispatch.indexOf("export async function deleteDispatch");
		const implementation = dispatch.slice(start, start + 1_800);

		expect(start).toBeGreaterThanOrEqual(0);
		expect(implementation).toContain(
			"await assertDispatchDeletionPackingAllowed",
		);
		expect(implementation).toContain("tx.orderDelivery.update");
		expect(implementation).toContain('isolationLevel: "Serializable"');
		expect(
			implementation.indexOf("assertDispatchDeletionPackingAllowed"),
		).toBeLessThan(implementation.indexOf("tx.orderDelivery.update"));
	});

	it("guards duplicate cleanup before its batch soft-delete writer", async () => {
		const dispatch = await source("./dispatch.ts");
		const start = dispatch.indexOf(
			"export async function resolveDuplicateDispatchGroup",
		);
		const implementation = dispatch.slice(start, start + 4_000);

		expect(start).toBeGreaterThanOrEqual(0);
		expect(implementation).toContain(
			"await assertDispatchDeletionPackingAllowed",
		);
		expect(implementation).toContain("tx.orderDelivery.updateMany");
		expect(implementation).toContain('isolationLevel: "Serializable"');
		expect(
			implementation.indexOf("assertDispatchDeletionPackingAllowed"),
		).toBeLessThan(implementation.indexOf("tx.orderDelivery.updateMany"));
	});

	it("keeps the protected route thin and manager-authorized", async () => {
		const route = await source("../../trpc/routers/dispatch.route.ts");
		const start = route.indexOf("deleteDispatch: protectedProcedure");
		const implementation = route.slice(start, start + 650);

		expect(start).toBeGreaterThanOrEqual(0);
		expect(implementation).toContain("await requireDispatchManager(props.ctx)");
		expect(implementation).toContain(
			"await deleteDispatch(props.ctx, props.input.dispatchId)",
		);
	});
});
