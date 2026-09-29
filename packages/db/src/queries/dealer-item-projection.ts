export { allocateMoneyByWeight as allocateDealerRowCents } from "@gnd/utils/allocate-money";

export function dealerFormSteps(steps?: Record<string, unknown>[] | null) {
	return (steps || [])
		.map((step) => ({
			stepId: Number(
				step.stepId || (step.step as { id?: number } | null)?.id || 0,
			),
			componentId: Number(step.componentId || 0) || null,
			prodUid: String(step.prodUid || "") || null,
			value: String(step.value || "") || null,
			meta:
				step.meta && typeof step.meta === "object" && !Array.isArray(step.meta)
					? (step.meta as Record<string, unknown>)
					: {},
		}))
		.filter((step) => step.stepId > 0);
}
