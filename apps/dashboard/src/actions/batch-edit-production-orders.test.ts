import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./batch-edit-production-orders.ts", import.meta.url),
	"utf8",
);

describe("batch production assignment editing", () => {
	it("requires assignment authority before writing", () => {
		expect(source.includes("requireProductionAssignmentAuthority(actor)")).toBe(
			true,
		);
		expect(
			source.indexOf("requireProductionAssignmentAuthority(actor)") <
				source.indexOf("orderItemProductionAssignments.updateMany"),
		).toBe(true);
	});

	it("updates only active incomplete assignments", () => {
		expect(source.includes("deletedAt: null")).toBe(true);
		expect(source.includes("completedAt: null")).toBe(true);
		expect(source.includes("assignedToId: input.assignedToId")).toBe(true);
		expect(source.includes("dueDate: input.dueDate")).toBe(true);
	});

	it("changes Assigned At only when assignment ownership changes", () => {
		expect(
			source.includes(
				"assignedAt: input.assignedToId == null ? null : new Date()",
			),
		).toBe(true);
		expect(source.includes("OR:")).toBe(true);
		expect(source.includes("data: { dueDate: input.dueDate }")).toBe(true);
	});

	it("creates remaining production assignments when a worker is selected", () => {
		expect(source.includes('typeof input.assignedToId === "number"')).toBe(
			true,
		);
		expect(source.includes("createAssignmentsTask")).toBe(true);
		expect(source.includes("dashboard.production.batch-edit")).toBe(true);
	});
});
