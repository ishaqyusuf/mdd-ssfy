import { expect, it } from "bun:test";
import { getDispatchCalendarPresentation, matchesDispatchCalendarStages } from "./dispatch-calendar-presentation";

it("uses one completed tone for audited status-only and operational completion", () => {
	expect(
		getDispatchCalendarPresentation("administratively_completed", "queue"),
	).toEqual({ tone: "completed", label: "Completed", completed: true });
	expect(getDispatchCalendarPresentation("fulfilled", "fulfilled")).toEqual({
		tone: "completed",
		label: "Completed",
		completed: true,
	});
	expect(
		matchesDispatchCalendarStages(
			["fulfilled"],
			"ready_to_assign",
			"administratively_completed",
		),
	).toBe(true);
	expect(
		matchesDispatchCalendarStages(
			["ready_to_assign"],
			"ready_to_assign",
			"administratively_completed",
		),
	).toBe(false);
});
it("discloses unavailable/conflicting evidence instead of assigning completion colors", () => {
	expect(getDispatchCalendarPresentation("conflict", "fulfilled").tone).toBe("conflict");
	expect(getDispatchCalendarPresentation(undefined, "ready_to_assign").label).toBe("Status unavailable");
	expect(getDispatchCalendarPresentation("fulfilled", "cancelled").tone).toBe("cancelled");
	expect(matchesDispatchCalendarStages(["fulfilled"], "fulfilled", "conflict")).toBe(false);
});
