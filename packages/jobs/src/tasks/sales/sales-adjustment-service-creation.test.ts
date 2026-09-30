import { describe, expect, it } from "bun:test";
import type { TransactionClient } from "@gnd/db";
import { projectApprovedGroupedSalesLine } from "./sales-adjustment-grouped-projection";

function fixture() {
	const saved = {
		uid: "sales-item-169382",
		salesItemId: 169382,
		primaryGroupItem: true,
		groupUid: "4IZ4",
		service: "POCKET DOOR HARDWARE BAG",
		qty: 5,
		unitPrice: 16.74,
		lineTotal: 83.7,
		taxxable: true,
		produceable: false,
	};
	const added = {
		uid: "new-bypass-track",
		service: "BI-PASS TRACK & HARDWARE 5-0",
		qty: 2,
		unitPrice: 79.85,
		lineTotal: 159.7,
		taxxable: true,
		produceable: false,
	};
	const beforeLine = {
		id: 169382,
		uid: "4IZ4",
		title: "Services",
		qty: 5,
		lineTotal: 83.7,
		meta: { serviceRows: [saved] },
	};
	const line = {
		...beforeLine,
		qty: 7,
		lineTotal: 243.4,
		meta: {
			serviceRows: [structuredClone(saved), added] as Record<string, unknown>[],
		},
	};
	const creates: Record<string, unknown>[] = [];
	const updates: { where: { id: number }; data: Record<string, unknown> }[] =
		[];
	const retired: Record<string, unknown>[] = [];
	const tx = {
		salesOrderItems: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				creates.push(structuredClone(data));
				return { id: 999001 };
			},
			update: async (args: {
				where: { id: number };
				data: Record<string, unknown>;
			}) => {
				updates.push(structuredClone(args));
				return { id: args.where.id };
			},
			updateMany: async (args: Record<string, unknown>) => {
				retired.push(args);
				return { count: 0 };
			},
		},
		housePackageTools: { updateMany: async () => ({ count: 0 }) },
		dykeSalesDoors: { updateMany: async () => ({ count: 0 }) },
	} as unknown as TransactionClient;
	return {
		tx,
		line,
		beforeLine,
		creates,
		updates,
		retired,
		persistedItemIds: new Set([169382]),
		salesOrderId: 25532,
	};
}

describe("approved new service children", () => {
	it("creates Pablo's new child and retains its identity, flags, price and grouping on replay", async () => {
		const f = fixture();
		await projectApprovedGroupedSalesLine(f);
		expect(f.creates).toHaveLength(1);
		expect(f.line.meta.serviceRows[1]).toMatchObject({
			salesItemId: 999001,
			groupUid: "4IZ4",
			primaryGroupItem: false,
		});
		expect(
			f.updates.find((row) => row.where.id === 999001)?.data,
		).toMatchObject({
			salesOrderId: 25532,
			qty: 2,
			rate: 79.85,
			total: 159.7,
			multiDykeUid: "4IZ4",
			multiDyke: false,
			dykeProduction: false,
			meta: { tax: true, uid: "new-bypass-track" },
		});
		expect(f.retired[0]).toMatchObject({
			where: { id: { notIn: [169382, 999001] } },
		});
		await projectApprovedGroupedSalesLine({
			...f,
			line: structuredClone(f.line),
			persistedItemIds: new Set([169382, 999001]),
		});
		expect(f.creates).toHaveLength(1);
		expect(f.updates[0]?.data).toMatchObject({
			meta: {
				meta: {
					serviceRows: [
						expect.anything(),
						expect.objectContaining({ salesItemId: 999001 }),
					],
				},
			},
		});
	});
	it("rejects an existing baseline row whose saved identity was lost", async () => {
		const f = fixture();
		delete f.line.meta.serviceRows[0]!.salesItemId;
		await expect(projectApprovedGroupedSalesLine(f)).rejects.toThrow(
			"persisted sales-item identity",
		);
		expect(f.creates).toHaveLength(0);
	});
	it("does not recreate a baseline sibling whose identity was lost", async () => {
		const f = fixture();
		f.beforeLine.meta.serviceRows.push({
			...f.beforeLine.meta.serviceRows[0]!,
			uid: "new-bypass-track",
			salesItemId: 169383,
			primaryGroupItem: false,
		});
		f.persistedItemIds.add(169383);
		await expect(projectApprovedGroupedSalesLine(f)).rejects.toThrow(
			"persisted sales-item identity",
		);
		expect(f.creates).toHaveLength(0);
	});
	it("rejects a new child without a stable UID", async () => {
		const f = fixture();
		delete f.line.meta.serviceRows[1]!.uid;
		await expect(projectApprovedGroupedSalesLine(f)).rejects.toThrow(
			"persisted sales-item identity",
		);
		expect(f.creates).toHaveLength(0);
	});
	it("rejects a claimed foreign identity rather than creating a replacement", async () => {
		const f = fixture();
		f.line.meta.serviceRows[1]!.salesItemId = 777;
		await expect(projectApprovedGroupedSalesLine(f)).rejects.toThrow(
			"persisted sales-item identity",
		);
		expect(f.creates).toHaveLength(0);
	});
	it("requires baseline evidence for creating a new child", async () => {
		const f = fixture();
		await expect(
			projectApprovedGroupedSalesLine({ ...f, beforeLine: undefined }),
		).rejects.toThrow("persisted sales-item identity");
		expect(f.creates).toHaveLength(0);
	});
	it("rejects duplicate child UIDs before creating anything", async () => {
		const f = fixture();
		f.line.meta.serviceRows.push({ ...f.line.meta.serviceRows[1] });
		await expect(projectApprovedGroupedSalesLine(f)).rejects.toThrow(
			"duplicate",
		);
		expect(f.creates).toHaveLength(0);
	});
});
