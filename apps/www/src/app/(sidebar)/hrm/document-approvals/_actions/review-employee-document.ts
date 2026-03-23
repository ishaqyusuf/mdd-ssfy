"use server";

import { _revalidate } from "@/app-deps/(v1)/_actions/_revalidate";
import { userId } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { noteTag, saveNote } from "@gnd/utils/note";
import { parseInsuranceDocumentMeta } from "@gnd/utils/insurance-documents";

export async function reviewEmployeeDocument(
	id: number,
	status: "approved" | "rejected",
) {
	const actorId = await userId();
	const existing = await prisma.userDocuments.findUniqueOrThrow({
		where: { id },
		select: {
			meta: true,
			title: true,
			userId: true,
		},
	});
	const meta = parseInsuranceDocumentMeta(existing.meta);
	const now = new Date().toISOString();

	await prisma.userDocuments.update({
		where: { id },
		data: {
			meta: {
				...meta,
				status,
				approvedAt: status === "approved" ? now : null,
				approvedBy: status === "approved" ? (actorId ?? null) : null,
				rejectedAt: status === "rejected" ? now : null,
				rejectedBy: status === "rejected" ? (actorId ?? null) : null,
			},
		},
	});

	if (actorId) {
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
	}

	await Promise.all([
		_revalidate("document-approvals"),
		_revalidate("contractor-overview"),
	]);
}
