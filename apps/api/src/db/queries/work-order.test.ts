import { describe, expect, test } from "bun:test";
import { workOrderFormSchema } from "./work-order";

describe("workOrderFormSchema", () => {
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
