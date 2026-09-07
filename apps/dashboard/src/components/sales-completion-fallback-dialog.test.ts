import { describe, expect, test } from "bun:test";

const dialogSource = await Bun.file(
	new URL("./sales-completion-fallback-dialog.tsx", import.meta.url),
).text();
const providerSource = await Bun.file(
	new URL("./sales-completion-fallback-provider.tsx", import.meta.url),
).text();
const taskMonitorSource = await Bun.file(
	new URL("../store/task-monitor.ts", import.meta.url),
).text();
const taskEffectsSource = await Bun.file(
	new URL("../hooks/use-task-monitor-effects.ts", import.meta.url),
).text();

describe("Sales completion failed-subset fallback UI", () => {
	test("offers a second explicit confirmation only after unsuccessful full workflow outcomes", () => {
		expect(taskMonitorSource).toContain('numericOutput(data, "failed")');
		expect(taskMonitorSource).toContain(
			'numericOutput(data, "awaitingReview")',
		);
		expect(taskMonitorSource).toContain(
			'numericOutput(data, "reviewRequired")',
		);
		expect(providerSource).toContain(
			"salesCompletionStatusOnlyFallbackPreview",
		);
		expect(dialogSource).toContain(
			"Full workflow could not complete every order",
		);
		expect(dialogSource).toContain("Proceed with status only?");
	});

	test("submits only fresh eligible rows with both revisions and a required reason", () => {
		expect(providerSource).toContain(
			"item.eligible && item.completionRevision && item.pipelineRevision",
		);
		expect(providerSource).toContain("expectedCompletionRevision");
		expect(providerSource).toContain("expectedPipelineRevision");
		expect(providerSource).toContain("administrativeOverrideRequired");
		expect(dialogSource).toContain("Reason (required)");
		expect(dialogSource).toContain("!props.reason.trim()");
	});

	test("recovers the pending confirmation from the persisted global task monitor", () => {
		expect(taskEffectsSource).toContain("addSalesCompletionFallback");
		expect(taskMonitorSource).toContain("pendingSalesCompletionFallbacks");
		expect(taskMonitorSource).toContain("partialize: (state)");
		expect(taskMonitorSource).toContain(
			"pendingSalesCompletionFallbacks: state.pendingSalesCompletionFallbacks",
		);
		expect(providerSource).toContain("pendingSalesCompletionFallbacks");
		expect(providerSource).toContain("removeSalesCompletionFallback");
		expect(providerSource).toContain("key={attempt.id}");
	});

	test("states that successful workflow effects cannot repeat and cancellation writes nothing", () => {
		expect(dialogSource).toContain("successful orders will not run again");
		expect(dialogSource).toContain("Leave unsuccessful orders unchanged");
		expect(dialogSource).toContain("It will not repeat workflow effects");
		for (const fact of [
			"production",
			"inventory",
			"packing",
			"dispatch",
			"delivery",
			"payment",
			"accounting",
		]) {
			expect(dialogSource).toContain(fact);
		}
	});

	test("shows both the original workflow failure and fallback eligibility reason", () => {
		expect(dialogSource).toContain("Workflow outcome: {item.reason}");
		expect(dialogSource).toContain("Fallback unavailable:");
		expect(dialogSource).toContain("item.blockedReason");
	});

	test("keeps a failed preview retryable instead of calling it ineligible", () => {
		expect(dialogSource).toContain("Unable to verify the unsuccessful orders");
		expect(dialogSource).toContain("Retry verification");
		expect(dialogSource).toContain("Dismiss saved attempt");
		expect(dialogSource).toContain(
			"props.preview && !props.previewPending && !eligibleItems.length",
		);
		expect(providerSource).toContain("previewError={previewQuery.isError}");
		expect(providerSource).toContain("if (!open) removeAttempt(attempt.id)");
	});

	test("uses the shared calendar picker instead of a native date input", () => {
		expect(dialogSource).toContain("EffectiveCompletionDateField");
		expect(dialogSource).toContain(
			'from "@/components/sales-production-completion-dialogs"',
		);
		expect(dialogSource).not.toContain('type="date"');
	});
});
