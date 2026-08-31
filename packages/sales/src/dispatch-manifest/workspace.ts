import type { DispatchDueBucket } from "./driver-work-queue";
import type { DispatchWorkspaceStage } from "./status";

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

export type DispatchRiskInput = {
	stage: DispatchWorkspaceStage;
	dueDate?: Date | string | null;
	hasOpenException?: boolean;
	proofSyncFailed?: boolean;
	now?: Date;
};

export type DispatchWorkspaceMembershipInput = {
	section: DispatchWorkspaceSection;
	stage: DispatchWorkspaceStage;
	driverId?: number | null;
	deliveryMode?: string | null;
	dueBucket?: DispatchDueBucket | null;
};

export function isDispatchWorkspaceSectionMatch(
	input: DispatchWorkspaceMembershipInput,
) {
	if (input.section === "completed") return input.stage === "fulfilled";
	if (
		input.section !== "active" &&
		input.section !== "due-today" &&
		input.section !== "past-due"
	) {
		return true;
	}
	if (input.stage === "fulfilled" || input.stage === "cancelled") return false;

	const isActive = input.deliveryMode === "pickup" || Boolean(input.driverId);
	if (!isActive) return false;
	if (input.section === "due-today") return input.dueBucket === "today";
	if (input.section === "past-due") return input.dueBucket === "overdue";

	return true;
}

export function projectDispatchRisks(input: DispatchRiskInput) {
	const risks: DispatchRiskCode[] = [];
	const dueDate = input.dueDate ? new Date(input.dueDate) : null;
	const isActive = input.stage !== "fulfilled" && input.stage !== "cancelled";
	if (!dueDate && isActive) risks.push("unscheduled");
	if (dueDate && !Number.isNaN(dueDate.getTime()) && isActive) {
		if (dueDate.getTime() < (input.now || new Date()).getTime()) {
			risks.push("overdue");
		}
	}
	if (input.stage === "packing_blocked") risks.push("missing_items");
	if (input.stage === "ready_to_assign") risks.push("unassigned");
	if (input.hasOpenException) risks.push("open_exception");
	if (input.proofSyncFailed) risks.push("proof_sync_failed");
	return risks;
}
