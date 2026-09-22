"use server";

import { _revalidate } from "@/app-deps/(v1)/_actions/_revalidate";
import { prisma } from "@/db";
import { requireEmployeeDocumentEditor } from "@/lib/employee-document-auth";
import { getActiveCompanyMemberWhere } from "@gnd/auth/company-member";
import { parseInsuranceDocumentMeta } from "@gnd/utils/insurance-documents";
import { noteTag, saveNote } from "@gnd/utils/note";

export async function reviewEmployeeDocument(
	id: number,
	status: "approved" | "rejected",
) {
	const actor = await requireEmployeeDocumentEditor();
	const actorId = actor.id;
	const existing = await prisma.userDocuments.findFirstOrThrow({
		where: {
			id,
			deletedAt: null,
			user: { is: getActiveCompanyMemberWhere() },
		},
		select: {
			meta: true,
			title: true,
			userId: true,
		},
	});
	const meta = parseInsuranceDocumentMeta(existing.meta);
	const now = new Date().toISOString();

	await prisma.userDocuments.update({
		where: {
			id,
			deletedAt: null,
			user: { is: getActiveCompanyMemberWhere() },
		},
		data: {
			meta: {
				...meta,
				status,
				approvedAt: status === "approved" ? now : null,
				approvedBy: status === "approved" ? actorId : null,
				rejectedAt: status === "rejected" ? now : null,
				rejectedBy: status === "rejected" ? actorId : null,
			},
		},
	});

	await saveNote(
		prisma as never,
		{
			headline:
				status === "approved"
					? `${existing.title || "Document"} approved`
					: `${existing.title || "Document"} rejected`,
			subject: "Document review update",
			note:
				status === "approved"
					? "Document approved for employee use."
					: "Document rejected and requires a new upload.",
			type: "activity",
			status: "public",
			tags: [
				noteTag("channel", "employee_document_review"),
				noteTag("documentId", id),
				noteTag("userId", existing.userId),
			],
		},
		actorId,
	);

	await Promise.all([
		_revalidate("document-approvals"),
		_revalidate("contractor-overview"),
	]);
}
