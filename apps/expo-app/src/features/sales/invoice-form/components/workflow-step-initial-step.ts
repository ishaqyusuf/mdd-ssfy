import {
	type WorkflowStepRecord,
	firstPendingStepIndex,
	resolveInteractiveStepIndex,
} from "@gnd/sales/sales-form-core";

export type WorkflowInitialStepPreference = "first" | "first-pending" | "last";

export function getWorkflowInitialStepIndex({
	steps,
	presentation,
	preference,
}: {
	steps: WorkflowStepRecord[];
	presentation: "overlay" | "inline";
	preference?: WorkflowInitialStepPreference;
}) {
	if (preference === "last") {
		return resolveInteractiveStepIndex(steps, Math.max(0, steps.length - 1));
	}
	if (preference === "first-pending") {
		return resolveInteractiveStepIndex(steps, firstPendingStepIndex(steps));
	}
	if (preference === "first") return resolveInteractiveStepIndex(steps, 0);
	if (presentation === "inline") return 0;
	return resolveInteractiveStepIndex(steps, firstPendingStepIndex(steps));
}
