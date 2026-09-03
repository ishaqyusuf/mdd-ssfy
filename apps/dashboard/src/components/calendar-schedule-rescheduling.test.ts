import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

function source(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const dialog = source("./calendar-schedule-move-dialog.tsx");
const production = source("./sales-production/calendar.tsx");
const fulfillment = source("./dispatch-admin/dispatch-calendar-view.tsx");
const fulfillmentV2 = source("./dispatch-admin/dispatch-calendar-view-v2.tsx");
const events = source("../lib/query-events/registry.ts");

describe("calendar schedule rescheduling", () => {
	it("keeps drag as a proposal and requires explicit confirmation", () => {
		expect(dialog).toContain("Confirm schedule move");
		expect(dialog).toContain("No status,");
		expect(dialog).toContain("assignment, quantity, inventory, packing");
		expect(dialog).toContain("Choose a different date to continue.");
		expect(dialog).toContain("This moves active work into the past.");
		expect(dialog).toContain("pending || !targetDate || sameDate");
		for (const calendar of [production, fulfillment, fulfillmentV2]) {
			expect(calendar).toContain("handleDragEnd");
			expect(calendar).toContain("proposeMove(item, targetDate)");
			expect(calendar).toContain("CalendarScheduleMoveDialog");
			expect(calendar).toContain("crypto.randomUUID()");
		}
	});

	it("uses the shared shadcn date picker instead of a native date input", () => {
		expect(dialog).toContain('import { Calendar } from "@gnd/ui/calendar";');
		expect(dialog).toContain("<PopoverTrigger asChild>");
		expect(dialog).toContain("<Calendar");
		expect(dialog).toContain('aria-label="New schedule date"');
		expect(dialog).not.toContain('type="date"');
	});

	it("provides pointer, touch, keyboard, overlay, and non-drag controls", () => {
		for (const calendar of [production, fulfillment, fulfillmentV2]) {
			expect(calendar).toContain("PointerSensor");
			expect(calendar).toContain("TouchSensor");
			expect(calendar).toContain("KeyboardSensor");
			expect(calendar).toContain("DragOverlay");
			expect(calendar).toContain("Drag to reschedule");
			expect(calendar).toContain('title="Reschedule"');
			expect(calendar).toContain("rescheduleLockReason");
		}
		expect(production).toContain("workerMode || !item.canReschedule");
		expect(production).toContain("disabled: workerMode");
	});

	it("uses one Fulfillment mutation and one deduplicated invalidation event", () => {
		expect(production).toContain("trpc.sales.moveProductionSchedule");
		expect(fulfillment).toContain("trpc.dispatch.moveFulfillmentSchedule");
		expect(fulfillmentV2).toContain("trpc.dispatch.moveFulfillmentSchedule");
		expect(events).toContain(
			'"sales.moveProductionSchedule": ["sales.pipeline.changed"]',
		);
		expect(events).toContain(
			'"dispatch.moveFulfillmentSchedule": ["sales.pipeline.changed"]',
		);
	});
});
