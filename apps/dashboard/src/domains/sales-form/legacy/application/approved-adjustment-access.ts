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
			newFormHref: string;
	  };

export function resolveApprovedAdjustmentLegacyAccess(
	source: LegacySalesFormAccessSource,
): ApprovedAdjustmentLegacyAccess {
	if (!source.adjustmentSnapshotAuthority) return { readOnly: false };

	return {
		readOnly: true,
		title: "Customer-approved change in effect",
		description:
			"This legacy view is read-only. Continue in the new sales form to make further changes.",
		newFormHref: `/sales-form/edit-${source.order?.type}/${source.order?.slug}`,
	};
}
