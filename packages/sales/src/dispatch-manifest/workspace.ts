import {
	type SalesPipelineSnapshot,
	resolveCanonicalDispatchWorkspaceMembership,
} from "../sales-pipeline";
import type { DispatchDueBucket } from "./driver-work-queue";
import type { DispatchWorkspaceStage } from "./status";
import type {
	DispatchRiskCode,
	DispatchWorkspaceSection,
} from "./workspace-filter";

export {
	dispatchRiskCodes,
	dispatchWorkspaceSections,
	type DispatchRiskCode,
	type DispatchWorkspaceSection,
} from "./workspace-filter";

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
	fulfillmentState?: SalesPipelineSnapshot["fulfillment"]["state"] | null;
	fulfillmentApplicability?: string | null;
	driverId?: number | null;
	deliveryMode?: string | null;
	dueBucket?: DispatchDueBucket | null;
};

export function isDispatchWorkspaceSectionMatch(
	input: DispatchWorkspaceMembershipInput,
) {
	return resolveCanonicalDispatchWorkspaceMembership(input);
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
