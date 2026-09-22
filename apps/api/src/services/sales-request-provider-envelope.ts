function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Lift misplaced facts and keep explicit uncertainty ahead of a conflicting optional selection. */
export function normalizeSalesRequestProviderEnvelope(
	value: unknown,
	multipleStepIds: ReadonlySet<number> = new Set(),
	heightContext?: {
		sourceText: string;
		heightStepId: number;
		eightyInchUid: string;
	},
	rootStepIds: ReadonlySet<number> = new Set(),
): unknown {
	if (
		!isRecord(value) ||
		!Array.isArray(value.lineItems)
	)
		return value;
	if (value.unresolved == null)
		value = { ...value, unresolved: [] };
	if (!Array.isArray(value.unresolved)) return value;
	const unresolved = [...value.unresolved];
	const lineItems = value.lineItems.map((line) => {
		if (!isRecord(line)) return line;
		const normalized = {
			...line,
			...(!Object.hasOwn(line, "qty") ? { qty: 1 } : {}),
		};
		if (isRecord(line.housePackageTool) &&
			Array.isArray(line.housePackageTool.doors) &&
			line.housePackageTool.doors.length > 0) {
			const doors = line.housePackageTool.doors.map((door) => {
				if (!isRecord(door)) return door;
				const hasTotalQty = typeof door.totalQty === "number";
				const hasHandedQty =
					typeof door.lhQty === "number" || typeof door.rhQty === "number";
				return hasTotalQty || hasHandedQty ? door : { ...door, totalQty: 1 };
			});
			normalized.housePackageTool = { ...line.housePackageTool, doors };
			const counts = doors.map((door) => {
				if (!isRecord(door)) return null;
				if (typeof door.totalQty === "number" && Number.isInteger(door.totalQty) && door.totalQty >= 0)
					return door.totalQty;
				if (typeof door.lhQty === "number" && Number.isInteger(door.lhQty) && door.lhQty >= 0 &&
					typeof door.rhQty === "number" && Number.isInteger(door.rhQty) && door.rhQty >= 0)
					return door.lhQty + door.rhQty;
				return null;
			});
			if (counts.every((count): count is number => count !== null) &&
				counts.some((count) => count > 0))
				normalized.qty = counts.reduce((total, count) => total + count, 0);
		}
		const mouldingRows = isRecord(line.meta) ? line.meta.mouldingRows : null;
		if (line.qty === 0 && !line.housePackageTool &&
			Array.isArray(mouldingRows) && mouldingRows.length > 0 &&
			Array.isArray(line.formSteps)) {
			const selected = line.formSteps.flatMap((step) =>
				isRecord(step) && isRecord(step.meta) &&
				Array.isArray(step.meta.selectedProdUids)
					? [step.meta.selectedProdUids] : []);
			const rowUids = mouldingRows.map((row) => isRecord(row) ? row.uid : null);
			if (selected.length === 1 && selected[0]?.length === rowUids.length &&
				new Set(rowUids).size === rowUids.length &&
				rowUids.every((uid) => typeof uid === "string" &&
					selected[0]?.includes(uid)) &&
				mouldingRows.every((row) => isRecord(row) &&
					typeof row.qty === "number" && Number.isSafeInteger(row.qty) &&
					row.qty > 0 && !Object.hasOwn(row, "calculation"))) {
				const total = mouldingRows.reduce((sum, row) =>
					sum + (isRecord(row) && typeof row.qty === "number" ? row.qty : 0), 0);
				if (total <= 100000) normalized.qty = total;
			}
		}
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
	const lineUids = new Set(lineItems.filter(isRecord).map((line) => line.uid));
	const normalizedUnresolved = unresolved.map((entry) => {
		const fact = isRecord(entry) && !Object.hasOwn(entry, "stepId")
			? { ...entry, stepId: null }
			: entry;
		return isRecord(fact) &&
			typeof fact.lineUid === "string" &&
			!lineUids.has(fact.lineUid)
				// A rejected door row may still carry a real customer fact. Keep it
				// for review without attaching it to another line or stale step.
				? { ...fact, lineUid: null, stepId: null }
				: fact;
		}).filter((entry) => {
			if (!heightContext || !isRecord(entry) ||
				entry.stepId !== heightContext.heightStepId ||
				typeof entry.lineUid !== "string" ||
				typeof entry.field !== "string" ||
				entry.field.toLowerCase().replace(/[^a-z]/g, "") !== "height" ||
				!/(?:[x×]\s*80\b|\b80\s*(?:["”]|inches?\b))/i.test(heightContext.sourceText) ||
				/\b(?:8[-/]0|8[-/]8|96\s*(?:["”]|inches?\b))\b/i.test(heightContext.sourceText))
				return true;
			const line = lineItems.find((candidate) =>
				isRecord(candidate) && candidate.uid === entry.lineUid);
			return !(
				isRecord(line) && Array.isArray(line.formSteps) &&
				line.formSteps.some((step) =>
					isRecord(step) &&
					step.stepId === heightContext.heightStepId &&
					step.prodUid === heightContext.eightyInchUid)
			);
		});
	const conflicts = new Set(normalizedUnresolved.flatMap((entry) =>
		rootStepIds.size > 0 && isRecord(entry) &&
		typeof entry.lineUid === "string" &&
		typeof entry.stepId === "number" &&
		!rootStepIds.has(entry.stepId) &&
		["ambiguous", "unreadable", "unsupported"].includes(String(entry.status))
			? [`${entry.lineUid}:${entry.stepId}`]
			: [],
	));
	const droppedLineUids = new Set<string>();
	const safeLines = lineItems.flatMap((line) => {
		if (!isRecord(line) || typeof line.uid !== "string" ||
			!Array.isArray(line.formSteps)) return [line];
		const formSteps = line.formSteps.filter((step) =>
			!isRecord(step) || !conflicts.has(`${line.uid}:${step.stepId}`));
		const mouldingRows = isRecord(line.meta) ? line.meta.mouldingRows : null;
		const orphanedMoulding = Array.isArray(mouldingRows) &&
			mouldingRows.length > 0 &&
			line.formSteps.some((step) => isRecord(step) &&
				conflicts.has(`${line.uid}:${step.stepId}`) &&
				isRecord(step.meta) && Array.isArray(step.meta.selectedProdUids) &&
				step.meta.selectedProdUids.length === mouldingRows.length &&
				step.meta.selectedProdUids.every((uid) =>
					mouldingRows.some((row) => isRecord(row) && row.uid === uid))) &&
			formSteps.every((step) => isRecord(step) &&
				typeof step.stepId === "number" && rootStepIds.has(step.stepId)) &&
			normalizedUnresolved.some((entry) => isRecord(entry) &&
				entry.lineUid === line.uid && /moulding/i.test(String(entry.field)));
		if (orphanedMoulding) {
			droppedLineUids.add(line.uid);
			return [];
		}
		return [{ ...line, formSteps }];
	});
	return {
		...value,
		lineItems: safeLines,
		unresolved: normalizedUnresolved.map((entry) =>
			isRecord(entry) && typeof entry.lineUid === "string" &&
			droppedLineUids.has(entry.lineUid)
				? { ...entry, lineUid: null, stepId: null }
				: entry),
		...(Array.isArray(value.interpretations)
			? {
				interpretations: value.interpretations.filter((entry) =>
					!isRecord(entry) ||
					(!droppedLineUids.has(String(entry.lineUid)) &&
						!conflicts.has(`${entry.lineUid}:${entry.stepId}`))),
			}
			: {}),
	};
}
