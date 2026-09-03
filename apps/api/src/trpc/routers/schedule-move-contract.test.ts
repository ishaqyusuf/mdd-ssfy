import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

function source(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const salesRoute = source("./sales.route.ts");
const dispatchRoute = source("./dispatch.route.ts");
const dispatchQuery = source("../../db/queries/dispatch.ts");
const productionQuery = source(
	"../../../../../packages/sales/src/sales-production.ts",
);

describe("schedule move API contract", () => {
	it("enforces admin authority and keeps Production workers read-only", () => {
		expect(salesRoute).toContain(
			"const session = await requireProductionEditor(props.ctx)",
		);
		expect(salesRoute).toContain(
			"canReschedule: session.can.editProduction === true",
		);
		expect(salesRoute).toContain("canReschedule: false");
		expect(salesRoute).toContain("workerMode: true");
		expect(dispatchRoute).toContain(
			"const session = await requireDispatchManager(props.ctx)",
		);
	});

	it("projects server-owned capability and revision fields to every calendar", () => {
		for (const query of [productionQuery, dispatchQuery]) {
			expect(query).toContain("expectedEvidenceRevision");
			expect(query).toContain("canReschedule");
			expect(query).toContain("rescheduleLockReason");
		}
		expect(productionQuery).toContain("assignmentIds");
		expect(productionQuery).toContain("assignmentCount");
		expect(dispatchQuery).toContain("dispatchScheduleCapability(rest)");
		expect(dispatchQuery).toContain("getFulfillmentCalendar(");
	});

	it("emits notifications only after a non-replayed domain command succeeds", () => {
		const productionCommand = salesRoute.indexOf(
			"await moveProductionScheduleGroup(",
		);
		const productionNotification = salesRoute.indexOf(
			"if (!result.idempotentReplay && result.workerIds.length)",
		);
		expect(productionCommand).toBeGreaterThan(-1);
		expect(productionNotification).toBeGreaterThan(productionCommand);

		const fulfillmentCommand = dispatchRoute.indexOf(
			"await moveFulfillmentSchedule(",
		);
		const fulfillmentNotification = dispatchRoute.indexOf(
			"if (!result.idempotentReplay && result.driverId)",
		);
		expect(fulfillmentCommand).toBeGreaterThan(-1);
		expect(fulfillmentNotification).toBeGreaterThan(fulfillmentCommand);
	});
});
