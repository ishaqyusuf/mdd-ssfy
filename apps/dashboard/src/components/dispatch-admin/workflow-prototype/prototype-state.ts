export const prototypeScenarios = [
	"assigned",
	"packing",
	"blocked",
	"denied",
	"ready",
	"retry",
	"backorder",
	"fulfilled",
	"duplicate",
	"stale",
	"reassigned",
] as const;

export type PrototypeScenario = (typeof prototypeScenarios)[number];

export type WorkflowEvent =
	| { type: "assign"; driver: string }
	| { type: "start-packing" }
	| { type: "report-shortage"; short: number }
	| { type: "approve-partial" }
	| { type: "deny-assistance" }
	| { type: "resolve-assistance" }
	| { type: "pack-all" }
	| { type: "confirm-load" }
	| { type: "start-trip" }
	| { type: "arrive" }
	| { type: "fail-proof" }
	| { type: "submit-proof"; requestId: string }
	| { type: "mark-stale" }
	| { type: "reassign"; driver: string };

export type PrototypeState = {
	orderStatus:
		| "Ready to fulfill"
		| "Packing"
		| "Ready to dispatch"
		| "Out for delivery"
		| "Partially fulfilled"
		| "Fulfilled";
	dispatchStatus:
		| "Assigned"
		| "Packing"
		| "Packing blocked"
		| "Ready to load"
		| "In transit"
		| "Delivered";
	assignedTo: string;
	ordered: number;
	allocated: number;
	packed: number;
	short: number;
	delivered: number;
	assistance: "none" | "waiting" | "denied" | "resolved";
	proof: "not-started" | "ready" | "retry" | "submitted";
	network: "online" | "weak";
	backOrder: boolean;
	stale: boolean;
	revision: number;
	lastRequestId?: string;
	history: string[];
};

export const initialPrototypeState: PrototypeState = {
	orderStatus: "Ready to fulfill",
	dispatchStatus: "Assigned",
	assignedTo: "Unassigned",
	ordered: 12,
	allocated: 12,
	packed: 0,
	short: 0,
	delivered: 0,
	assistance: "none",
	proof: "not-started",
	network: "online",
	backOrder: false,
	stale: false,
	revision: 1,
	history: ["Order became ready to fulfill"],
};

function record(
	state: PrototypeState,
	message: string,
	patch: Partial<PrototypeState>,
): PrototypeState {
	return {
		...state,
		...patch,
		revision: state.revision + 1,
		history: [...state.history, message],
	};
}

export function prototypeWorkflowReducer(
	state: PrototypeState,
	event: WorkflowEvent,
): PrototypeState {
	switch (event.type) {
		case "assign":
			return record(state, `Assigned to ${event.driver}`, {
				assignedTo: event.driver,
				dispatchStatus: "Assigned",
			});
		case "start-packing":
			return record(state, "Packing started", {
				orderStatus: "Packing",
				dispatchStatus: "Packing",
				packed: 8,
			});
		case "report-shortage":
			return record(state, `${event.short} items reported unavailable`, {
				dispatchStatus: "Packing blocked",
				short: event.short,
				allocated: state.ordered - event.short,
				assistance: "waiting",
			});
		case "approve-partial":
			return record(state, "Partial dispatch approved", {
				dispatchStatus: "Ready to load",
				orderStatus: "Ready to dispatch",
				packed: state.allocated,
				assistance: "resolved",
				backOrder: true,
			});
		case "deny-assistance":
			return record(state, "Assistance request denied", {
				assistance: "denied",
			});
		case "resolve-assistance":
			return record(state, "Missing items made available", {
				allocated: state.ordered,
				short: 0,
				assistance: "resolved",
				dispatchStatus: "Packing",
			});
		case "pack-all":
			return record(state, "All available items packed", {
				packed: state.allocated,
				orderStatus: "Ready to dispatch",
				dispatchStatus: "Ready to load",
			});
		case "confirm-load":
			return record(state, "Load confirmed", { proof: "ready" });
		case "start-trip":
			return record(state, "Trip started", {
				orderStatus: "Out for delivery",
				dispatchStatus: "In transit",
			});
		case "arrive":
			return record(state, "Driver arrived at the stop", {
				proof: "ready",
			});
		case "fail-proof":
			return record(state, "Proof upload queued for retry", {
				network: "weak",
				proof: "retry",
			});
		case "submit-proof":
			if (state.lastRequestId === event.requestId) return state;
			return record(state, "Delivery proof submitted", {
				network: "online",
				proof: "submitted",
				dispatchStatus: "Delivered",
				delivered: state.packed,
				orderStatus:
					state.packed < state.ordered ? "Partially fulfilled" : "Fulfilled",
				lastRequestId: event.requestId,
			});
		case "mark-stale":
			return record(state, "A newer dispatch revision is available", {
				stale: true,
			});
		case "reassign":
			return record(state, `Reassigned to ${event.driver}`, {
				assignedTo: event.driver,
				stale: false,
			});
	}
}

const scenarioEvents: Record<PrototypeScenario, WorkflowEvent[]> = {
	assigned: [{ type: "assign", driver: "Marcus Reed" }],
	packing: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
	],
	blocked: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "report-shortage", short: 4 },
	],
	denied: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "report-shortage", short: 4 },
		{ type: "deny-assistance" },
	],
	ready: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "report-shortage", short: 4 },
		{ type: "resolve-assistance" },
		{ type: "pack-all" },
	],
	retry: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "pack-all" },
		{ type: "confirm-load" },
		{ type: "start-trip" },
		{ type: "arrive" },
		{ type: "fail-proof" },
	],
	backorder: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "report-shortage", short: 4 },
		{ type: "approve-partial" },
		{ type: "confirm-load" },
		{ type: "start-trip" },
		{ type: "submit-proof", requestId: "proof-partial-001" },
	],
	fulfilled: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "pack-all" },
		{ type: "confirm-load" },
		{ type: "start-trip" },
		{ type: "submit-proof", requestId: "proof-complete-001" },
	],
	duplicate: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "pack-all" },
		{ type: "confirm-load" },
		{ type: "start-trip" },
		{ type: "submit-proof", requestId: "proof-duplicate-001" },
		{ type: "submit-proof", requestId: "proof-duplicate-001" },
	],
	stale: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "mark-stale" },
	],
	reassigned: [
		{ type: "assign", driver: "Marcus Reed" },
		{ type: "start-packing" },
		{ type: "mark-stale" },
		{ type: "reassign", driver: "Elena Brooks" },
	],
};

export function getPrototypeScenarioState(
	scenario: PrototypeScenario,
): PrototypeState {
	return scenarioEvents[scenario].reduce(
		prototypeWorkflowReducer,
		initialPrototypeState,
	);
}

export function getRemainingQuantity(state: PrototypeState) {
	return Math.max(0, state.ordered - state.delivered);
}
