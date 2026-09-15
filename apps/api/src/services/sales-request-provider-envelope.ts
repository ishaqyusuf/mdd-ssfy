function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Lift misplaced line-scoped facts without changing their content or relaxing validation. */
export function normalizeSalesRequestProviderEnvelope(
	value: unknown,
	multipleStepIds: ReadonlySet<number> = new Set(),
): unknown {
	if (
		!isRecord(value) ||
		!Array.isArray(value.lineItems) ||
		!Array.isArray(value.unresolved)
	)
		return value;
	const unresolved = [...value.unresolved];
	const lineItems = value.lineItems.map((line) => {
		if (!isRecord(line)) return line;
		const normalized = { ...line };
		if (Array.isArray(line.formSteps)) {
			normalized.formSteps = line.formSteps.map((step) => {
				if (
					!isRecord(step) ||
					typeof step.stepId !== "number" ||
					!multipleStepIds.has(step.stepId) ||
					typeof step.prodUid !== "string" ||
					Object.keys(step).some((key) => key !== "stepId" && key !== "prodUid")
				)
					return step;
				return {
					stepId: step.stepId,
					meta: { selectedProdUids: [step.prodUid] },
				};
			});
		}
		if (!Array.isArray(line.unresolved)) return normalized;
		// Conflicting scope stays invalid: never silently attach a fact to another line.
		if (
			!line.unresolved.every(
				(entry) => isRecord(entry) && entry.lineUid === line.uid,
			)
		)
			return normalized;
		delete normalized.unresolved;
		unresolved.push(...line.unresolved);
		return normalized;
	});
	return { ...value, lineItems, unresolved };
}
