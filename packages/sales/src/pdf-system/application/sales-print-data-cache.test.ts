// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	buildSalesPrintDocumentTypeKey,
	createOrRefreshSalesPrintData,
	expireCurrentSalesPrintData,
	resolveCurrentSalesPrintData,
} from "./sales-print-data-cache";

function createMockDb(input?: {
	sourceUpdatedAt?: Date | null;
	printData?: any[];
}) {
	const state = {
		sourceUpdatedAt: input?.sourceUpdatedAt ?? new Date("2026-05-12T10:00:00Z"),
		printData: [...(input?.printData ?? [])],
		nextId: 1,
	};

	const db = {
		salesOrders: {
			findUnique: async () =>
				state.sourceUpdatedAt ? { updatedAt: state.sourceUpdatedAt } : null,
		},
		salesPrintData: {
			findFirst: async ({ where }: any) =>
				state.printData.find((row) => {
					if (row.salesOrderId !== where.salesOrderId) return false;
					if (row.documentType !== where.documentType) return false;
					if (row.templateId !== where.templateId) return false;
					if (where.deletedAt === null && row.deletedAt != null) return false;
					return true;
				}) ?? null,
			findMany: async ({ where }: any) =>
				state.printData.filter((row) => {
					if (where.salesOrderId && row.salesOrderId !== where.salesOrderId) {
						return false;
					}
					if (where.status && row.status !== where.status) return false;
					if (where.deletedAt === null && row.deletedAt != null) return false;
					return true;
				}),
			create: async ({ data }: any) => {
				const row = {
					id: `spd-${state.nextId++}`,
					createdAt: new Date("2026-05-12T10:00:00Z"),
					updatedAt: new Date("2026-05-12T10:00:00Z"),
					...data,
				};
				state.printData.push(row);
				return row;
			},
			update: async ({ where, data }: any) => {
				const row = state.printData.find((item) => item.id === where.id);
				if (!row) throw new Error(`Missing SalesPrintData ${where.id}`);
				Object.assign(row, data, {
					updatedAt: new Date("2026-05-12T10:01:00Z"),
				});
				return row;
			},
		},
	};

	return { db: db as any, state };
}

function readyRow(overrides: Partial<any> = {}) {
	return {
		id: "spd-existing",
		salesOrderId: 10,
		documentType: "invoice_pdf",
		templateId: "template-2",
		mode: "invoice",
		dispatchId: null,
		scopeKey: "order",
		title: "INV-10",
		firstOrderId: "INV-10",
		companyAddress: { address1: "Main", address2: "", phone: "555" },
		pages: [{ meta: {}, billing: {}, shipping: {}, sections: [] }],
		sourceUpdatedAt: new Date("2026-05-12T10:00:00Z"),
		generatedAt: new Date("2026-05-12T10:00:00Z"),
		invalidatedAt: null,
		failedAt: null,
		status: "ready",
		reason: null,
		errorMessage: null,
		meta: null,
		deletedAt: null,
		...overrides,
	};
}

const loadPrintDocumentData = async () => ({
	pages: [{ meta: {}, billing: {}, shipping: {}, sections: [] }],
	title: "INV-10",
	firstOrderId: "INV-10",
	companyAddress: { address1: "Main", address2: "", phone: "555" },
});

describe("sales print data cache", () => {
	it("resolves a ready cache hit when source data is fresh", async () => {
		const { db } = createMockDb({ printData: [readyRow()] });

		const record = await resolveCurrentSalesPrintData(db, {
			salesOrderId: 10,
			mode: "invoice",
		});

		expect(record?.id).toBe("spd-existing");
		expect(record?.title).toBe("INV-10");
	});

	it("treats cache rows older than the sales order as stale", async () => {
		const { db } = createMockDb({
			sourceUpdatedAt: new Date("2026-05-12T11:00:00Z"),
			printData: [readyRow()],
		});

		const record = await resolveCurrentSalesPrintData(db, {
			salesOrderId: 10,
			mode: "invoice",
		});

		expect(record).toBeNull();
	});

	it("creates print data on miss", async () => {
		const { db, state } = createMockDb();

		const result = await createOrRefreshSalesPrintData(db, {
			salesOrderId: 10,
			mode: "invoice",
			loadPrintDocumentData: loadPrintDocumentData as any,
		});

		expect(result.cacheStatus).toBe("miss");
		expect(result.generated).toBe(true);
		expect(result.record.status).toBe("ready");
		expect(state.printData).toHaveLength(1);
	});

	it("force-refreshes existing print data", async () => {
		const { db, state } = createMockDb({ printData: [readyRow()] });

		const result = await createOrRefreshSalesPrintData(db, {
			salesOrderId: 10,
			mode: "invoice",
			forceRefresh: true,
			loadPrintDocumentData: loadPrintDocumentData as any,
		});

		expect(result.cacheStatus).toBe("forced");
		expect(result.record.id).toBe("spd-existing");
		expect(state.printData).toHaveLength(1);
	});

	it("marks generated rows as failed when refresh generation fails", async () => {
		const { db, state } = createMockDb();

		await expect(
			createOrRefreshSalesPrintData(db, {
				salesOrderId: 10,
				mode: "invoice",
				loadPrintDocumentData: (async () => {
					throw new Error("print failed");
				}) as any,
			}),
		).rejects.toThrow("print failed");

		expect(state.printData[0]?.status).toBe("failed");
		expect(state.printData[0]?.errorMessage).toBe("print failed");
	});

	it("expires ready rows matching document prefixes", async () => {
		const { db, state } = createMockDb({
			printData: [
				readyRow({ id: "invoice", documentType: "invoice_pdf" }),
				readyRow({ id: "packing", documentType: "packing_slip_pdf:dispatch:5" }),
				readyRow({ id: "production", documentType: "production_pdf" }),
			],
		});

		const result = await expireCurrentSalesPrintData(db, {
			salesOrderId: 10,
			reason: "payment_applied",
			documentPrefixes: ["invoice_pdf"],
		});

		expect(result.expiredCount).toBe(1);
		expect(state.printData.find((row) => row.id === "invoice")?.status).toBe(
			"stale",
		);
		expect(state.printData.find((row) => row.id === "packing")?.status).toBe(
			"ready",
		);
	});

	it("builds dispatch-scoped packing slip document types", () => {
		expect(
			buildSalesPrintDocumentTypeKey({
				mode: "packing-slip",
				dispatchId: 5,
			}),
		).toBe("packing_slip_pdf:dispatch:5");
	});
});
