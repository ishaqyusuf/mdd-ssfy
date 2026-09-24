import { describe, expect, test } from "bun:test";
import {
	CUSTOM_SERVICE_NO_PROJECT,
	saveWorkOrderForm,
	workOrderFormSchema,
} from "./work-order";

describe("workOrderFormSchema", () => {
	test("rejects an empty new work order", () => {
		const result = workOrderFormSchema.safeParse({
			lot: "",
			block: "",
			meta: { lotBlock: "" },
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
				"projectName",
				"meta.lotBlock",
				"homeOwner",
				"description",
			]);
		}
	});
	test("accepts a Custom work order without a unit", () => {
		const result = workOrderFormSchema.safeParse({
			projectName: CUSTOM_SERVICE_NO_PROJECT,
			lot: "",
			block: "",
			meta: { lotBlock: "" },
			homeOwner: "Alex Rivera",
			description: "Repair a cabinet door",
		});
		expect(result.success).toBe(true);
	});
	test("saves Custom work without a project or stale unit", async () => {
		let created: Record<string, unknown> | undefined;
		const db = {
			workOrders: {
				count: async () => 0,
				create: async ({ data }: { data: Record<string, unknown> }) => {
					created = data;
				},
			},
		};
		const input = workOrderFormSchema.parse({
			projectName: CUSTOM_SERVICE_NO_PROJECT,
			lot: "old-lot",
			block: "old-block",
			meta: { lotBlock: "old-lot/old-block" },
			homeOwner: "Alex Rivera",
			description: "Repair a cabinet door",
		});

		await saveWorkOrderForm(
			{ db } as unknown as Parameters<typeof saveWorkOrderForm>[0],
			input,
		);

		expect(created?.projectName).toBeNull();
		expect(created?.lot).toBe("");
		expect(created?.block).toBe("");
		expect(created?.meta).toEqual({ lotBlock: "" });
		expect(created?.slug).toBe("customer-service-alex-rivera");
	});
	test("switches an existing project work order to Custom", async () => {
		let updated: Record<string, unknown> | undefined;
		const db = {
			workOrders: {
				update: async ({ data }: { data: Record<string, unknown> }) => {
					updated = data;
				},
			},
		};
		const input = workOrderFormSchema.parse({
			id: 812,
			slug: "old-project-lot-block",
			projectName: CUSTOM_SERVICE_NO_PROJECT,
			lot: "old-lot",
			block: "old-block",
			meta: { lotBlock: "old-lot/old-block" },
			homeOwner: "Alex Rivera",
			description: "Repair a cabinet door",
		});

		await saveWorkOrderForm(
			{ db } as unknown as Parameters<typeof saveWorkOrderForm>[0],
			input,
		);

		expect(updated?.projectName).toBeNull();
		expect(updated?.lot).toBe("");
		expect(updated?.block).toBe("");
		expect(updated?.meta).toEqual({ lotBlock: "" });
	});
	test("accepts an existing assigned work order hydrated through SuperJSON", () => {
		const assignedAt = new Date("2026-07-24T15:00:00.000Z");

		const result = workOrderFormSchema.safeParse({
			id: 812,
			techId: 41,
			slug: "wildwood-groves-s-f-02-72",
			description: "Remove the existing baseboard and install new baseboard",
			lot: "02",
			block: "72",
			projectName: "WILDWOOD GROVES S F",
			requestDate: new Date("2026-07-24T00:00:00.000Z"),
			supervisor: "Levi Taguiam",
			scheduleDate: new Date("2026-07-28T00:00:00.000Z"),
			scheduleTime: "8AM To 12PM",
			homeAddress: "27340 SW 159 Pl Miami, FL 33031",
			homeOwner: "Hugo Issa",
			homePhone: "3052054316",
			status: "Scheduled",
			assignedAt,
			meta: {
				lotBlock: "02/72",
			},
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.assignedAt).toEqual(assignedAt);
		}
	});
});
