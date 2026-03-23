"use server";

import { _revalidate } from "@/app-deps/(v1)/_actions/_revalidate";
import { userId } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { parseInsuranceDocumentMeta } from "@gnd/utils/insurance-documents";

export async function reviewEmployeeDocument(
	id: number,
	status: "approved" | "rejected",
) {
	const actorId = await userId();
	const existing = await prisma.userDocuments.findUniqueOrThrow({
		where: { id },
		select: { meta: true },
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

	await Promise.all([
		_revalidate("document-approvals"),
		_revalidate("contractor-overview"),
	]);
}
