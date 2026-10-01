import { salesFormLineItemSchema } from "../../sales-form/contracts/schemas";
import { getSalesDoorActiveIdentity } from "../../sales-form/domain/door-identity";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

/** Only an identity-free configured door line absent from the baseline is new. */
export function getApprovedNewHousePackageLines(input: {
	beforeLines: unknown[];
	proposedLines: unknown[];
}) {
	const beforeUids = new Set(
		input.beforeLines.map((line) => String(record(line).uid || "")),
	);
	const beforeIds = new Set(
		input.beforeLines.map((line) => Number(record(line).id || 0)),
	);
	const proposedUids = new Set<string>();
	const proposedIds = new Set<number>();
	return input.proposedLines.flatMap((value) => {
		const original = record(value);
		const uid = String(original.uid || "").trim();
		if (!uid || proposedUids.has(uid))
			throw new Error("Approved sale lines require unique stable identities.");
		proposedUids.add(uid);
		if (original.id != null && original.id !== 0) {
			const id = Number(original.id);
			if (!Number.isInteger(id) || !beforeIds.has(id) || id <= 0) {
				throw new Error(
					"An approved sale line cannot use a foreign persisted identity.",
				);
			}
			if (proposedIds.has(id))
				throw new Error(
					"Approved sale lines cannot share a persisted identity.",
				);
			proposedIds.add(id);
			return [];
		}
		if (beforeUids.has(uid))
			throw new Error(
				"An existing approved sale line is missing its persisted identity.",
			);
		const line = salesFormLineItemSchema.parse(original);
		const hpt = line.housePackageTool;
		if (
			!hpt?.doors?.length ||
			!line.formSteps?.length ||
			line.qty <= 0 ||
			line.shelfItems?.length ||
			(Array.isArray(line.meta?.serviceRows) && line.meta.serviceRows.length) ||
			(Array.isArray(line.meta?.mouldingRows) && line.meta.mouldingRows.length)
		)
			throw new Error(
				"New approved sale lines currently require a configured door item.",
			);
		if (
			hpt.id ||
			line.formSteps?.some((step) => step.id) ||
			hpt.doors.some((door) => door.id)
		) {
			throw new Error(
				"A new approved door line cannot reuse persisted child identities.",
			);
		}
		const stepIdentities = new Set<string>();
		for (const step of line.formSteps) {
			const stepId = Number(step.stepId || step.step?.id || 0);
			const identity = `${stepId}|${step.componentId || 0}|${step.prodUid || ""}`;
			if (
				!Number.isInteger(stepId) ||
				stepId <= 0 ||
				stepIdentities.has(identity)
			) {
				throw new Error(
					"A new approved door line requires distinct valid workflow steps.",
				);
			}
			stepIdentities.add(identity);
		}
		const identities = new Set<string>();
		let quantity = 0;
		let total = 0;
		for (const door of hpt.doors) {
			const qty =
				Number(door.totalQty || 0) ||
				Number(door.lhQty || 0) + Number(door.rhQty || 0);
			const identity = getSalesDoorActiveIdentity(door);
			if (
				!door.dimension?.trim() ||
				!Number.isInteger(qty) ||
				qty <= 0 ||
				identities.has(identity)
			) {
				throw new Error(
					"A new approved door line requires distinct configured door rows with positive quantities.",
				);
			}
			identities.add(identity);
			quantity += qty;
			total += Number(door.lineTotal || 0);
		}
		if (quantity !== line.qty || Math.abs(total - line.lineTotal) > 0.011) {
			throw new Error(
				"A new approved door line must match its configured quantities and total.",
			);
		}
		return [{ original, line, hpt }];
	});
}
