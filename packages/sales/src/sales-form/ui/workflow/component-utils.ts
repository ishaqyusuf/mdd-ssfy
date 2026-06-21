"use client";

import { readSalesFormObjectMetadata } from "../../domain/metadata";

type WorkflowComponent = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	inventoryId?: number | null;
	inventoryVariantId?: number | null;
	salesPrice?: number | null;
	basePrice?: number | null;
	pricing?: Record<string, unknown> | null;
	supplierVariants?: unknown[];
	redirectUid?: string | null;
	sectionOverride?: Record<string, unknown> | null;
	[key: string]: unknown;
};

export function snapshotSelectedComponent(component: WorkflowComponent) {
	const metaData = readSalesFormObjectMetadata(component?._metaData) || {};
	const custom =
		component?.custom === true || (metaData as { custom?: boolean }).custom === true;

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
		custom,
		_metaData: {
			...metaData,
			custom,
		},
	};
}
