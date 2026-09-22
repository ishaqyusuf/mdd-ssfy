import { getActiveCompanyMemberWhere } from "@gnd/auth/company-member";
import type { Db } from "@gnd/db";
import {
	EMPLOYEE_DOCUMENT_KIND,
	EMPLOYEE_DOCUMENT_OWNER_TYPE,
	canAccessEmployeeDocument,
	isPrivateEmployeeDocumentMeta,
	parseEmployeeStoredDocumentId,
	trustedLegacyEmployeeDocumentUrl,
	trustedLegacyEmployeeDocumentUrlFromRecord,
} from "@gnd/documents";

export type EmployeeDocumentActor = {
	id: number;
	canViewEmployeeDocument?: boolean;
	canEditEmployeeDocument?: boolean;
};

export async function resolveEmployeeDocumentAccess(
	db: Db,
	input: { documentId: number; actor: EmployeeDocumentActor },
) {
	if (!Number.isSafeInteger(input.documentId) || input.documentId <= 0) {
		return null;
	}
	const record = await db.userDocuments.findFirst({
		where: {
			id: input.documentId,
			deletedAt: null,
			user: { is: getActiveCompanyMemberWhere() },
		},
		select: {
			id: true,
			userId: true,
			url: true,
			meta: true,
			title: true,
			user: {
				select: { id: true, deletedAt: true, accessRevokedAt: true },
			},
		},
	});
	if (
		!record?.user ||
		record.user.deletedAt ||
		record.user.accessRevokedAt ||
		!canAccessEmployeeDocument({
			actorId: input.actor.id,
			employeeId: record.userId,
			canViewEmployeeDocument: input.actor.canViewEmployeeDocument,
			canEditEmployeeDocument: input.actor.canEditEmployeeDocument,
		})
	) {
		return null;
	}

	const storedDocumentId = parseEmployeeStoredDocumentId(record.meta);
	if (storedDocumentId) {
		const storedDocument = await db.storedDocument.findFirst({
			where: {
				id: storedDocumentId,
				ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
				ownerId: String(record.userId),
				kind: EMPLOYEE_DOCUMENT_KIND,
				status: "ready",
				deletedAt: null,
			},
			select: {
				id: true,
				provider: true,
				pathname: true,
				url: true,
				filename: true,
				mimeType: true,
				visibility: true,
				meta: true,
			},
		});
		if (!storedDocument) return null;
		if (
			storedDocument.provider === "vercel-blob" &&
			storedDocument.visibility === "private" &&
			isPrivateEmployeeDocumentMeta(storedDocument.meta)
		) {
			return {
				access: "private" as const,
				recordId: record.id,
				pathname: storedDocument.pathname,
				filename:
					storedDocument.filename || record.title || "employee-document",
				mimeType: storedDocument.mimeType,
			};
		}
		const legacyUrl = trustedLegacyEmployeeDocumentUrl(
			storedDocument.url || record.url,
		);
		return legacyUrl
			? {
					access: "legacy" as const,
					recordId: record.id,
					url: legacyUrl,
					filename:
						storedDocument.filename || record.title || "employee-document",
					mimeType: storedDocument.mimeType,
				}
			: null;
	}

	const legacyUrl = trustedLegacyEmployeeDocumentUrlFromRecord(record);
	return legacyUrl
		? {
				access: "legacy" as const,
				recordId: record.id,
				url: legacyUrl,
				filename: record.title || "employee-document",
				mimeType: null,
			}
		: null;
}
