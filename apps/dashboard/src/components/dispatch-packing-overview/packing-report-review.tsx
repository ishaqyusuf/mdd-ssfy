export function packingReportStatusPresentation(status: string) {
	switch (status) {
		case "PENDING":
			return {
				label: "Physically verified · awaiting review",
				className: "border-amber-300 bg-amber-50 text-amber-900",
				description:
					"Not yet included in Packed Quantity or dispatch readiness.",
			};
		case "APPROVED":
			return {
				label: "Finalized Packed Quantity",
				className: "border-emerald-300 bg-emerald-50 text-emerald-900",
				description: "Approved through canonical packing authority.",
			};
		case "REJECTED":
			return {
				label: "Rejected",
				className: "border-slate-300 bg-slate-50 text-slate-700",
				description: "No canonical packing quantity was changed.",
			};
		default:
			return {
				label: status,
				className: "",
				description: "",
			};
	}
}

export function canShowPackingReviewActions(capability: {
	canReview: boolean;
}) {
	return capability.canReview;
}

export function packingReportDecisionInput(
	report: { id: number; updatedAt: Date | string },
	action: "APPROVE" | "REJECT",
	note: string,
) {
	return {
		reportId: report.id,
		expectedUpdatedAt: new Date(report.updatedAt),
		action,
		note,
	};
}
