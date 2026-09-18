import {
	type NewSalesFormSeed,
	newSalesFormSeedDoorQty,
} from "../contracts/new-sales-form-seed";
import { calculateMouldingQuantity } from "../ui/workflow/moulding-calculator";

type SeedLine = NewSalesFormSeed["lineItems"][number];
type SeedDoor = NonNullable<SeedLine["housePackageTool"]>["doors"][number];

function configurationKey(line: SeedLine) {
	const formSteps = [...line.formSteps]
		.map((step) => {
			if ("prodUid" in step) return [step.stepId, "scalar", step.prodUid];
			if ("value" in step) return [step.stepId, "custom", step.value];
			return [step.stepId, "multi", [...step.meta.selectedProdUids].sort()];
		})
		.sort((left, right) => Number(left[0]) - Number(right[0]));
	return JSON.stringify(formSteps);
}

function doorKey(door: SeedDoor) {
	return "totalQty" in door
		? JSON.stringify(["unhanded", door.dimension])
		: JSON.stringify(["handed", door.dimension, door.swing || ""]);
}

function mergeDoors(doors: SeedDoor[]) {
	const byKey = new Map<string, SeedDoor>();
	for (const door of doors) {
		const key = doorKey(door);
		const current = byKey.get(key);
		if (!current) {
			byKey.set(key, { ...door });
			continue;
		}
		if ("totalQty" in current && "totalQty" in door) {
			current.totalQty += door.totalQty;
			continue;
		}
		if (!("totalQty" in current) && !("totalQty" in door)) {
			current.lhQty += door.lhQty;
			current.rhQty += door.rhQty;
		}
	}
	return [...byKey.values()];
}

function normalizeMouldingLine(line: SeedLine): SeedLine {
	if (!("meta" in line) || !line.meta?.mouldingRows?.length) return line;
	const mouldingRows = line.meta.mouldingRows.map((row) => {
		if (!row.calculation) {
			return { uid: row.uid, qty: "qty" in row ? row.qty : 0 };
		}
		const calculation = calculateMouldingQuantity({
			linearFeet: row.calculation.linearFeet,
			pieceLength: row.calculation.pieceLength,
			wastePercentage: row.calculation.wastePercentage,
		});
		return {
			uid: row.uid,
			qty: calculation.pieces,
			calculation: { ...row.calculation },
		};
	});
	return {
		...line,
		qty: mouldingRows.reduce((total, row) => total + row.qty, 0),
		meta: { ...line.meta, mouldingRows },
	};
}

/**
 * Canonicalize AI output before validation and native-form replay.
 * HPT lines with identical selections are one sales line with multiple size rows.
 */
export function normalizeNewSalesFormSeed(
	seed: NewSalesFormSeed,
): NewSalesFormSeed {
	const uidRemap = new Map<string, string>();
	const groupedIndexByKey = new Map<string, number>();
	const lineItems: SeedLine[] = [];

	for (const sourceLine of seed.lineItems) {
		const normalizedSourceLine = normalizeMouldingLine(sourceLine);
		const canGroup =
			Boolean(normalizedSourceLine.housePackageTool) &&
			!("meta" in normalizedSourceLine && normalizedSourceLine.meta);
		const key = canGroup ? configurationKey(normalizedSourceLine) : null;
		const existingIndex = key == null ? undefined : groupedIndexByKey.get(key);
		if (existingIndex === undefined) {
			const doors = normalizedSourceLine.housePackageTool
				? mergeDoors(normalizedSourceLine.housePackageTool.doors)
				: null;
			const line = {
				...normalizedSourceLine,
				...(doors
					? {
							qty: doors.reduce(
								(total, door) => total + newSalesFormSeedDoorQty(door),
								0,
							),
							housePackageTool: { doors },
						}
					: {}),
			} as SeedLine;
			lineItems.push(line);
			if (key != null) groupedIndexByKey.set(key, lineItems.length - 1);
			uidRemap.set(normalizedSourceLine.uid, line.uid);
			continue;
		}

		const existing = lineItems[existingIndex];
		if (!existing?.housePackageTool || !normalizedSourceLine.housePackageTool)
			continue;
		const doors = mergeDoors([
			...existing.housePackageTool.doors,
			...normalizedSourceLine.housePackageTool.doors,
		]);
		lineItems[existingIndex] = {
			...existing,
			qty: doors.reduce(
				(total, door) => total + newSalesFormSeedDoorQty(door),
				0,
			),
			housePackageTool: { doors },
		};
		uidRemap.set(normalizedSourceLine.uid, existing.uid);
	}

	const unresolved = seed.unresolved
		.map((entry) => ({
			...entry,
			lineUid: entry.lineUid
				? uidRemap.get(entry.lineUid) || entry.lineUid
				: null,
		}))
		.filter(
			(entry, index, all) =>
				all.findIndex((candidate) =>
					Object.keys(entry).every(
						(key) =>
							candidate[key as keyof typeof candidate] ===
							entry[key as keyof typeof entry],
					),
				) === index,
		);
	const interpretations = (seed.interpretations ?? [])
		.map((entry) => ({
			...entry,
			lineUid: uidRemap.get(entry.lineUid) || entry.lineUid,
		}))
		.filter(
			(entry, index, all) =>
				all.findIndex((candidate) =>
					Object.keys(entry).every(
						(key) =>
							candidate[key as keyof typeof candidate] ===
							entry[key as keyof typeof entry],
					),
				) === index,
		);

	return {
		...seed,
		lineItems,
		unresolved,
		...(seed.interpretations ? { interpretations } : {}),
	} as NewSalesFormSeed;
}
