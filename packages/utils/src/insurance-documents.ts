export const INSURANCE_DOCUMENT_TITLE = "Insurance";
export const WORKERS_COMP_EXEMPTION_DOCUMENT_TITLE = "Workers comp exemption";
export const INSURANCE_DOCUMENT_TITLES = [
	INSURANCE_DOCUMENT_TITLE,
	WORKERS_COMP_EXEMPTION_DOCUMENT_TITLE,
] as const;

export type InsuranceDocumentApprovalStatus =
	| "pending"
	| "approved"
	| "rejected";

export type InsuranceDocumentMeta = {
	approvedAt?: string | null;
	approvedBy?: number | null;
	assetId?: string | null;
	expiresAt?: string | null;
	rejectedAt?: string | null;
	rejectedBy?: number | null;
	status?: InsuranceDocumentApprovalStatus | null;
	url?: string | null;
};

export type InsuranceDocumentLike = {
	createdAt?: Date | string | null;
	id?: number | string;
	meta?: unknown;
	title?: string | null;
	url?: string | null;
};

export type InsuranceRequirementState =
	| "valid"
	| "expiring_soon"
	| "pending"
	| "expired"
	| "rejected"
	| "missing";

export type InsuranceRequirement = {
	blocking: boolean;
	expiresAt: string | null;
	message: string;
	state: InsuranceRequirementState;
};

function normalizeDate(value?: Date | string | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function parseInsuranceDocumentMeta(
	raw: unknown,
): InsuranceDocumentMeta {
	if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		return raw as InsuranceDocumentMeta;
	}

	return {};
}

export function isInsuranceDocumentTitle(title?: string | null) {
	const normalizedTitle = title?.trim().toLowerCase();
	if (!normalizedTitle) return false;

	return INSURANCE_DOCUMENT_TITLES.some(
		(documentTitle) => documentTitle.toLowerCase() === normalizedTitle,
	);
}

export function getInsuranceDocuments<T extends InsuranceDocumentLike>(
	documents: T[],
) {
	return documents
		.filter((document) => isInsuranceDocumentTitle(document.title))
		.sort((left, right) => {
			const leftDate = normalizeDate(left.createdAt);
			const rightDate = normalizeDate(right.createdAt);

			return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
		});
}

export function getInsuranceRequirement<T extends InsuranceDocumentLike>(
	documents: T[],
	now = new Date(),
): InsuranceRequirement {
	const insuranceDocuments = getInsuranceDocuments(documents);

	if (insuranceDocuments.length === 0) {
		return {
			blocking: true,
			expiresAt: null,
			message: "No insurance on file. You cannot submit new job.",
			state: "missing",
		};
	}

	const approvedDocument = insuranceDocuments.find((document) => {
		const meta = parseInsuranceDocumentMeta(document.meta);
		if (meta.status !== "approved") return false;

		const expiresAt = normalizeDate(meta.expiresAt);
		return !expiresAt || expiresAt >= now;
	});

	if (approvedDocument) {
		const meta = parseInsuranceDocumentMeta(approvedDocument.meta);
		const expiresAt = normalizeDate(meta.expiresAt);

		if (expiresAt && expiresAt <= addDays(now, 30)) {
			return {
				blocking: false,
				expiresAt: meta.expiresAt ?? null,
				message: "Insurance will expire next month.",
				state: "expiring_soon",
			};
		}

		return {
			blocking: false,
			expiresAt: meta.expiresAt ?? null,
			message: "Insurance is approved.",
			state: "valid",
		};
	}

	const pendingDocument = insuranceDocuments.find(
		(document) =>
			parseInsuranceDocumentMeta(document.meta).status === "pending",
	);

	if (pendingDocument) {
		return {
			blocking: true,
			expiresAt:
				parseInsuranceDocumentMeta(pendingDocument.meta).expiresAt ?? null,
			message: "Insurance is pending approval.",
			state: "pending",
		};
	}

	const rejectedDocument = insuranceDocuments.find(
		(document) =>
			parseInsuranceDocumentMeta(document.meta).status === "rejected",
	);

	if (rejectedDocument) {
		return {
			blocking: true,
			expiresAt:
				parseInsuranceDocumentMeta(rejectedDocument.meta).expiresAt ?? null,
			message: "Insurance was rejected. Upload a new insurance document.",
			state: "rejected",
		};
	}

	const expiredApprovedDocument = insuranceDocuments.find((document) => {
		const meta = parseInsuranceDocumentMeta(document.meta);
		const expiresAt = normalizeDate(meta.expiresAt);

		return meta.status === "approved" && !!expiresAt && expiresAt < now;
	});

	if (expiredApprovedDocument) {
		return {
			blocking: true,
			expiresAt:
				parseInsuranceDocumentMeta(expiredApprovedDocument.meta).expiresAt ??
				null,
			message: "Insurance has expired. You cannot submit new job.",
			state: "expired",
		};
	}

	return {
		blocking: true,
		expiresAt: null,
		message: "No insurance on file. You cannot submit new job.",
		state: "missing",
	};
}
