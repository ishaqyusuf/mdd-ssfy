export const dispatchWorkspaceSections = [
	"dashboard",
	"backlog",
	"active",
	"due-today",
	"past-due",
	"completed",
	"dispatches",
	"calendar",
	"drivers",
	"exceptions",
] as const;

export type DispatchWorkspaceSection =
	(typeof dispatchWorkspaceSections)[number];

export const dispatchRiskCodes = [
	"overdue",
	"unscheduled",
	"missing_items",
	"unassigned",
	"open_exception",
	"proof_sync_failed",
] as const;

export type DispatchRiskCode = (typeof dispatchRiskCodes)[number];
