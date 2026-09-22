export const EMPLOYEE_DOCUMENT_OWNER_TYPE = "user";
export const EMPLOYEE_DOCUMENT_KIND = "attachment";
export const EMPLOYEE_DOCUMENT_WORKFLOW = "employee_document";
export const EMPLOYEE_DOCUMENT_PRIVATE_ACCESS = "private";

export type EmployeeDocumentAccessInput = {
	actorId: number;
	employeeId: number;
	canViewEmployeeDocument?: boolean;
	canEditEmployeeDocument?: boolean;
};

export function canAccessEmployeeDocument(input: EmployeeDocumentAccessInput) {
	return (
		input.actorId === input.employeeId ||
		input.canViewEmployeeDocument === true ||
		input.canEditEmployeeDocument === true
	);
}

export function employeeDocumentAccessPath(documentId: number) {
	if (!Number.isSafeInteger(documentId) || documentId <= 0) {
		throw new Error("Employee document id must be a positive integer.");
	}
	return `/api/employee-documents/${documentId}`;
}

export function parseEmployeeStoredDocumentId(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
	const value = (meta as Record<string, unknown>).storedDocumentId;
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isPrivateEmployeeDocumentMeta(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
	const value = meta as Record<string, unknown>;
	return (
		value.workflow === EMPLOYEE_DOCUMENT_WORKFLOW &&
		value.storageAccess === EMPLOYEE_DOCUMENT_PRIVATE_ACCESS
	);
}

export type LegacyEmployeeDocumentSourceClassification =
	| { kind: "missing" }
	| { kind: "internal_application_route" }
	| { kind: "relative_path" }
	| { kind: "bare_storage_reference" }
	| { kind: "unsupported_protocol" }
	| { kind: "trusted_vercel_public_blob"; url: string }
	| { kind: "trusted_cloudinary"; url: string }
	| { kind: "untrusted_https_host" }
	| { kind: "invalid_url" };

export function classifyLegacyEmployeeDocumentSource(
	value: string | null | undefined,
): LegacyEmployeeDocumentSourceClassification {
	const candidate = value?.trim();
	if (!candidate) return { kind: "missing" };
	if (/^\/api\/employee-documents\/\d+(?:[/?#]|$)/.test(candidate)) {
		return { kind: "internal_application_route" };
	}
	if (candidate.startsWith("/")) return { kind: "relative_path" };
	if (!/^[a-z][a-z\d+.-]*:/i.test(candidate)) {
		return { kind: "bare_storage_reference" };
	}

	try {
		const url = new URL(candidate);
		if (url.protocol !== "https:") return { kind: "unsupported_protocol" };
		if (url.hostname.endsWith(".public.blob.vercel-storage.com")) {
			return { kind: "trusted_vercel_public_blob", url: url.toString() };
		}
		if (
			url.hostname === "res.cloudinary.com" &&
			url.pathname.split("/").includes("contractor-document")
		) {
			return { kind: "trusted_cloudinary", url: url.toString() };
		}
		return { kind: "untrusted_https_host" };
	} catch {
		return { kind: "invalid_url" };
	}
}

export function trustedLegacyEmployeeDocumentUrl(
	value: string | null | undefined,
) {
	const source = classifyLegacyEmployeeDocumentSource(value);
	return source.kind === "trusted_vercel_public_blob" ||
		source.kind === "trusted_cloudinary"
		? source.url
		: null;
}

export function trustedLegacyEmployeeDocumentUrlFromRecord(input: {
	url: string;
	meta: unknown;
}) {
	const direct = trustedLegacyEmployeeDocumentUrl(input.url);
	if (direct) return direct;

	const primaryReference = input.url.trim();
	if (
		classifyLegacyEmployeeDocumentSource(primaryReference).kind !==
			"bare_storage_reference" ||
		primaryReference.length < 8 ||
		primaryReference.includes("..") ||
		/[?#\\]/.test(primaryReference) ||
		!input.meta ||
		typeof input.meta !== "object" ||
		Array.isArray(input.meta)
	) {
		return null;
	}

	const metadataUrl = (input.meta as Record<string, unknown>).url;
	if (typeof metadataUrl !== "string") return null;
	const classified = classifyLegacyEmployeeDocumentSource(metadataUrl);
	if (
		classified.kind !== "trusted_vercel_public_blob" &&
		classified.kind !== "trusted_cloudinary"
	) {
		return null;
	}

	try {
		const providerPath = decodeURIComponent(new URL(classified.url).pathname);
		const referenceStart = providerPath.indexOf(`/${primaryReference}`);
		if (referenceStart === -1) return null;
		const suffix = providerPath.slice(
			referenceStart + primaryReference.length + 1,
		);
		return !suffix || suffix.startsWith(".") || suffix.startsWith("/")
			? classified.url
			: null;
	} catch {
		return null;
	}
}
