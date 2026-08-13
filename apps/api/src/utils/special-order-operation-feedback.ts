import { AsyncLocalStorage } from "node:async_hooks";
import {
	attachSpecialOrderOperationFeedback,
	type SpecialOrderOperationalDecision,
} from "@gnd/sales/special-order";

export { attachSpecialOrderOperationFeedback } from "@gnd/sales/special-order";

export function createSpecialOrderOperationFeedbackCollector() {
	const decisions: SpecialOrderOperationalDecision[] = [];
	const keys = new Set<string>();

	return {
		capture(decision: SpecialOrderOperationalDecision) {
			if (!decision.warning) return;
			const key = [
				decision.salesOrderId,
				decision.operation,
				decision.enforcementMode,
				decision.statusLabel,
			].join(":");
			if (keys.has(key)) return;
			keys.add(key);
			decisions.push(decision);
		},
		get warnings() {
			return decisions;
		},
	};
}

type FeedbackCollector = ReturnType<
	typeof createSpecialOrderOperationFeedbackCollector
>;

const specialOrderOperationFeedback = new AsyncLocalStorage<FeedbackCollector>();

export function captureSpecialOrderOperationDecision(
	decision: SpecialOrderOperationalDecision,
) {
	specialOrderOperationFeedback.getStore()?.capture(decision);
}

export async function withSpecialOrderOperationFeedback<T>(
	run: () => Promise<T>,
): Promise<T> {
	const collector = createSpecialOrderOperationFeedbackCollector();
	return specialOrderOperationFeedback.run(collector, async () => {
		const result = await run();
		if (
			result &&
			typeof result === "object" &&
			!Array.isArray(result) &&
			"ok" in result &&
			result.ok === true &&
			"data" in result
		) {
			return {
				...result,
				data: attachSpecialOrderOperationFeedback(
					result.data,
					collector.warnings,
				),
			} as T;
		}
		return attachSpecialOrderOperationFeedback(result, collector.warnings) as T;
	});
}
