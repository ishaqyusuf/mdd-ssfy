export const SALES_DOCUMENT_READINESS_VALIDATOR_VERSION =
	"sales-document-readiness-v1";

export type SalesDocumentFinancialSnapshot = {
	subTotalCents: number | null;
	taxableSubTotalCents: number | null;
	taxCents: number | null;
	grandTotalCents: number | null;
	amountDueCents: number | null;
};

export type SalesDocumentFinancialComparison = {
	saved: SalesDocumentFinancialSnapshot;
	candidate: SalesDocumentFinancialSnapshot;
	subTotalDeltaCents: number | null;
	taxableSubTotalDeltaCents: number | null;
	taxDeltaCents: number | null;
	grandTotalDeltaCents: number | null;
	amountDueDeltaCents: number | null;
	totalChanged: boolean;
};

export type SalesDocumentRepairOperation = {
	kind: "sync_door_group_totals";
	salesOrderItemId: number;
	housePackageToolId: number;
	before: {
		itemQty: number | null;
		itemTotalCents: number | null;
		hptTotalDoors: number | null;
		hptTotalPriceCents: number | null;
	};
	after: {
		itemQty: number;
		itemTotalCents: number;
		hptTotalDoors: number;
		hptTotalPriceCents: number;
	};
	doorIds: number[];
};

export type SalesDocumentReadinessFinding = {
	kind:
		| "missing_door_group_totals"
		| "conflicting_door_group_totals"
		| "conflicting_form_step_revisions"
		| "incomplete_line_total";
	message: string;
	salesOrderItemId?: number;
};

type SalesDocumentReadinessBase = {
	salesOrderId: number;
	orderNo: string;
	salesType: "order" | "quote";
	validatorVersion: string;
	financial: SalesDocumentFinancialComparison;
	findings: SalesDocumentReadinessFinding[];
};

export type SalesDocumentReadinessEvaluation =
	| (SalesDocumentReadinessBase & {
			status: "ready";
			operations: [];
	  })
	| (SalesDocumentReadinessBase & {
			status: "repair_required";
			operations: SalesDocumentRepairOperation[];
	  })
	| (SalesDocumentReadinessBase & {
			status: "financial_review";
			operations: SalesDocumentRepairOperation[];
	  })
	| (SalesDocumentReadinessBase & {
			status: "manual_review";
			operations: SalesDocumentRepairOperation[];
	  });

export type SalesDocumentReadinessProposal =
	SalesDocumentReadinessEvaluation & {
		proposalId: string;
		validatedSourceUpdatedAt: string;
		createdAt: string;
	};

export type SalesDocumentReadinessPreflight =
	| (SalesDocumentReadinessEvaluation & {
			source: "evaluated" | "attestation";
			signature: string;
			validatedSourceUpdatedAt: string;
			proposalId?: never;
	  })
	| (SalesDocumentReadinessProposal & {
			source: "evaluated" | "attestation";
			signature: string;
	  });

export type SalesDocumentReadinessMeta = {
	validatorVersion: string;
	status: SalesDocumentReadinessEvaluation["status"];
	signature: string;
	validatedSourceUpdatedAt: string;
	validatedAt: string;
	evaluation: SalesDocumentReadinessEvaluation;
	proposal?: SalesDocumentReadinessProposal | null;
};

export type SalesDocumentAutoRepairSource =
	| "dashboard_document_access"
	| "dashboard_document_preflight"
	| "dealer_portal_document_access"
	| "storefront_document_access"
	| "sales_document_delivery"
	| "server_document_assertion";

export type SalesDocumentAutoRepairContext = {
	source: SalesDocumentAutoRepairSource;
	actorId?: number | null;
	actorName?: string | null;
};
