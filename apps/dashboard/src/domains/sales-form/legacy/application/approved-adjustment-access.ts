interface LegacySalesFormAccessSource {
	adjustmentSnapshotAuthority?: boolean;
	order?: {
		type?: string | null;
		slug?: string | null;
	} | null;
}

export type ApprovedAdjustmentLegacyAccess =
	| { readOnly: false }
	| {
			readOnly: true;
			title: string;
			description: string;
			newFormHref: string | null;
	  };

export function resolveApprovedAdjustmentLegacyAccess(
	source: LegacySalesFormAccessSource,
): ApprovedAdjustmentLegacyAccess {
	if (!source.adjustmentSnapshotAuthority) return { readOnly: false };

	const type = source.order?.type;
	const slug = source.order?.slug?.trim();
	return {
		readOnly: true,
		title: "Customer-approved change in effect",
		description:
			"This legacy view is read-only. Continue in the new sales form to make further changes.",
		newFormHref:
			(type === "order" || type === "quote") && slug
				? `/sales-form/edit-${type}/${slug}`
				: null,
	};
}
