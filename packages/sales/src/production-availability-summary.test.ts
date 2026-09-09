import { expect, test } from "bun:test";
import { summarizeProductionAvailability } from "./production-availability-summary";

const needs = [10, 20, 16, 12].map((qty, index) => ({
	id: String(index),
	componentIds: [index + 1],
	name: "Door",
	description: `Size ${index}`,
	qtyPending: qty,
	qtyAvailableToMark: qty,
}));
const base = {
	needs,
	inboundCount: 0,
	pendingInboundCount: 0,
	open: true,
	setupReady: true,
	canMarkAvailable: true,
	workerMode: false,
};
test("09602PC shows four missing needs and 58 units independently of reported production", () => {
	expect(summarizeProductionAvailability(base)).toMatchObject({
		state: "missing_inbound",
		itemCount: 4,
		pendingQty: 58,
		markableQty: 58,
		canMarkAvailable: true,
	});
});
test("an unfinished inbound wins; a completed inbound leaves truthful remainder attention", () => {
	expect(
		summarizeProductionAvailability({
			...base,
			inboundCount: 1,
			pendingInboundCount: 1,
		}).state,
	).toBe("pending_inbound");
	expect(
		summarizeProductionAvailability({
			...base,
			inboundCount: 1,
			needs: [{ ...needs[0]!, qtyPending: 6, qtyAvailableToMark: 6 }],
		}),
	).toMatchObject({ state: "remaining_needs", pendingQty: 6 });
});
test("covered materials hide only this alert while allocation review cannot receive twice", () => {
	expect(summarizeProductionAvailability({ ...base, needs: [] }).state).toBe(
		"covered",
	);
	expect(
		summarizeProductionAvailability({
			...base,
			needs: [{ ...needs[0]!, qtyAvailableToMark: 0 }],
		}),
	).toMatchObject({ state: "review", canMarkAvailable: false });
});
test("unknown inventory and closed orders never permit the shortcut", () => {
	expect(
		summarizeProductionAvailability({ ...base, setupReady: false }),
	).toMatchObject({ state: "unknown", canMarkAvailable: false });
	expect(
		summarizeProductionAvailability({ ...base, open: false }),
	).toMatchObject({ state: "readonly", canMarkAvailable: false });
	expect(
		summarizeProductionAvailability({
			...base,
			canMarkAvailable: false,
			workerMode: true,
		}),
	).toMatchObject({
		state: "missing_inbound",
		canMarkAvailable: false,
		workerMode: true,
	});
});
