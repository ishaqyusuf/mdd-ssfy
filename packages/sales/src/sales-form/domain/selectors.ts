import { normalizeSalesFormTitle } from "./step-engine";
import { getSelectedProdUids } from "./mutation-engine";
import { readSalesFormObjectMetadata } from "./metadata";

function snapshotSelectedComponent(component: any) {
	return {
		id: component?.id ?? null,
		uid: component?.uid || "",
		title: component?.title || "",
		img: component?.img || null,
		inventoryId: component?.inventoryId ?? null,
		inventoryVariantId: component?.inventoryVariantId ?? null,
		salesPrice:
			component?.salesPrice == null ? null : Number(component.salesPrice || 0),
		basePrice:
			component?.basePrice == null ? null : Number(component.basePrice || 0),
		pricing: component?.pricing || null,
		supplierVariants: Array.isArray(component?.supplierVariants)
			? component.supplierVariants
			: [],
		redirectUid: component?.redirectUid || null,
		sectionOverride: component?.sectionOverride || null,
	};
}

function stepMetadataRecords(step: any) {
	return [
		readSalesFormObjectMetadata(step?.meta),
		readSalesFormObjectMetadata(readSalesFormObjectMetadata(step?.step)?.meta),
	].filter(Boolean) as Array<Record<string, any>>;
}

function getStepSelectedComponents(step: any) {
	const byUid = new Map<string, ReturnType<typeof snapshotSelectedComponent>>();
	for (const meta of stepMetadataRecords(step)) {
		const components = Array.isArray(meta.selectedComponents)
			? meta.selectedComponents
			: [];
		for (const component of components) {
			const snapshot = snapshotSelectedComponent(component);
			const uid = String(snapshot?.uid || "").trim();
			if (!uid || byUid.has(uid)) continue;
			byUid.set(uid, snapshot);
		}
	}
	return Array.from(byUid.values());
}

export function findLineStepByTitle(line: any, title: string) {
	const normalized = normalizeSalesFormTitle(title);
	return (line?.formSteps || []).find(
		(step: any) => normalizeSalesFormTitle(step?.step?.title) === normalized,
	);
}

export function getItemType(line: any) {
	const step = (line?.formSteps || []).find(
		(s: any) => normalizeSalesFormTitle(s?.step?.title) === "item type",
	);
	return normalizeSalesFormTitle(step?.value);
}

export function isMouldingItem(line: any) {
	const type = getItemType(line);
	return (
		type === "moulding" ||
		type === "mouldings" ||
		type === "molding" ||
		type === "moldings"
	);
}

export function isServiceItem(line: any) {
	const type = getItemType(line);
	return type === "services" || type === "service";
}

export function isShelfItem(line: any) {
	return getItemType(line) === "shelf items";
}

export function getSelectedDoorComponentsForLine(
	line: any,
	options?: {
		availableComponents?: Array<Record<string, unknown>> | null;
	},
) {
	const doorStep = findLineStepByTitle(line, "Door");
	const doorStepMeta = readSalesFormObjectMetadata(doorStep?.meta) || {};
	const selected = getStepSelectedComponents(doorStep);
	const availableComponents = Array.isArray(options?.availableComponents)
		? options?.availableComponents || []
		: [];
	const availableByUid = new Map(
		availableComponents
			.map(
				(component: Record<string, unknown>) =>
					[String(component?.uid || "").trim(), component] as const,
			)
			.filter(([uid]) => !!uid),
	);
	const availableById = new Map(
		availableComponents
			.map(
				(component: Record<string, unknown>) =>
					[Number(component?.id || 0), component] as const,
			)
			.filter(([id]) => id > 0),
	);

	const resolved = [...selected];
	const resolvedUids = new Set(
		resolved
			.map((component) => String(component?.uid || "").trim())
			.filter(Boolean),
	);
	const resolvedIds = new Set(
		resolved
			.map((component) => Number(component?.id || 0))
			.filter((id) => id > 0),
	);

	for (const uid of getSelectedProdUids(doorStep)) {
		const normalizedUid = String(uid || "").trim();
		if (!normalizedUid || resolvedUids.has(normalizedUid)) continue;
		const available = availableByUid.get(normalizedUid);
		if (available) {
			const snapshot = snapshotSelectedComponent(available);
			resolved.push(snapshot);
			resolvedUids.add(normalizedUid);
			if (Number(snapshot?.id || 0) > 0)
				resolvedIds.add(Number(snapshot.id || 0));
			continue;
		}
		if (normalizedUid === String(doorStep?.prodUid || "").trim()) {
			const fallback = {
				id: doorStep?.componentId ?? null,
				uid: normalizedUid,
				title: doorStep?.value || "Door",
				img: doorStepMeta.img || null,
				inventoryId: doorStepMeta.inventoryId ?? null,
				inventoryVariantId: doorStepMeta.inventoryVariantId ?? null,
				salesPrice:
					doorStep?.price == null ? null : Number(doorStep.price || 0),
				basePrice:
					doorStep?.basePrice == null ? null : Number(doorStep.basePrice || 0),
				pricing: null,
				supplierVariants: [],
				redirectUid: doorStepMeta.redirectUid || null,
				sectionOverride: doorStepMeta.sectionOverride || null,
			};
			resolved.push(fallback);
			resolvedUids.add(normalizedUid);
			if (Number(fallback?.id || 0) > 0)
				resolvedIds.add(Number(fallback.id || 0));
		}
	}

	const storedRows = Array.isArray(line?.housePackageTool?.doors)
		? line.housePackageTool.doors
		: [];
	for (const row of storedRows as Array<Record<string, unknown>>) {
		const stepProductId = Number(row?.stepProductId || 0);
		if (!stepProductId || resolvedIds.has(stepProductId)) continue;
		const available = availableById.get(stepProductId);
		if (!available) continue;
		const snapshot = snapshotSelectedComponent(available);
		if (!snapshot?.uid || resolvedUids.has(snapshot.uid)) continue;
		resolved.push(snapshot);
		resolvedUids.add(snapshot.uid);
		resolvedIds.add(stepProductId);
	}

	if (resolved.length) return resolved;
	const prodUid = String(doorStep?.prodUid || "").trim();
	if (!prodUid) return [];
	return [
		{
			id: doorStep?.componentId ?? null,
			uid: prodUid,
			title: doorStep?.value || "Door",
			img: doorStepMeta.img || null,
			inventoryId: doorStepMeta.inventoryId ?? null,
			inventoryVariantId: doorStepMeta.inventoryVariantId ?? null,
			salesPrice: doorStep?.price == null ? null : Number(doorStep.price || 0),
			basePrice:
				doorStep?.basePrice == null ? null : Number(doorStep.basePrice || 0),
			pricing: null,
			supplierVariants: [],
			redirectUid: doorStepMeta.redirectUid || null,
			sectionOverride: doorStepMeta.sectionOverride || null,
		},
	];
}

export function getSelectedMouldingComponentsForLine(line: any) {
	const mouldingStep = findLineStepByTitle(line, "Moulding");
	const mouldingStepMeta =
		readSalesFormObjectMetadata(mouldingStep?.meta) || {};
	const selected = getStepSelectedComponents(mouldingStep);
	const resolved = [...selected];
	const resolvedUids = new Set(
		resolved
			.map((component) => String(component?.uid || "").trim())
			.filter(Boolean),
	);

	for (const uid of getSelectedProdUids(mouldingStep)) {
		const normalizedUid = String(uid || "").trim();
		if (!normalizedUid || resolvedUids.has(normalizedUid)) continue;
		if (normalizedUid === String(mouldingStep?.prodUid || "").trim()) {
			resolved.push({
				id: mouldingStep?.componentId ?? null,
				uid: normalizedUid,
				title: mouldingStep?.value || "Moulding",
				img: mouldingStepMeta.img || null,
				inventoryId: mouldingStepMeta.inventoryId ?? null,
				inventoryVariantId: mouldingStepMeta.inventoryVariantId ?? null,
				salesPrice:
					mouldingStep?.price == null ? null : Number(mouldingStep.price || 0),
				basePrice:
					mouldingStep?.basePrice == null
						? null
						: Number(mouldingStep.basePrice || 0),
				pricing: null,
				supplierVariants: [],
				redirectUid: mouldingStepMeta.redirectUid || null,
				sectionOverride: mouldingStepMeta.sectionOverride || null,
			});
			resolvedUids.add(normalizedUid);
		}
	}

	const lineMeta = readSalesFormObjectMetadata(line?.meta) || {};
	const storedRows = Array.isArray(lineMeta.mouldingRows)
		? lineMeta.mouldingRows
		: [];
	for (const row of storedRows as Array<Record<string, unknown>>) {
		const uid = String(row?.uid || "").trim();
		if (!uid || resolvedUids.has(uid)) continue;
		resolved.push({
			id: null,
			uid,
			title: String(row?.title || row?.description || "Moulding"),
			img: row?.img || null,
			inventoryId: null,
			inventoryVariantId: null,
			salesPrice:
				row?.salesPrice == null ? null : Number(row.salesPrice || 0),
			basePrice: row?.basePrice == null ? null : Number(row.basePrice || 0),
			pricing: null,
			supplierVariants: [],
			redirectUid: null,
			sectionOverride: null,
		});
		resolvedUids.add(uid);
	}

	if (resolved.length) return resolved;
	const prodUid = String(mouldingStep?.prodUid || "").trim();
	if (!prodUid) return [];
	return [
		{
			id: mouldingStep?.componentId ?? null,
			uid: prodUid,
			title: mouldingStep?.value || "Moulding",
			img: mouldingStepMeta.img || null,
			inventoryId: mouldingStepMeta.inventoryId ?? null,
			inventoryVariantId: mouldingStepMeta.inventoryVariantId ?? null,
			salesPrice:
				mouldingStep?.price == null ? null : Number(mouldingStep.price || 0),
			basePrice:
				mouldingStep?.basePrice == null
					? null
					: Number(mouldingStep.basePrice || 0),
			pricing: null,
			supplierVariants: [],
			redirectUid: mouldingStepMeta.redirectUid || null,
			sectionOverride: mouldingStepMeta.sectionOverride || null,
		},
	];
}
