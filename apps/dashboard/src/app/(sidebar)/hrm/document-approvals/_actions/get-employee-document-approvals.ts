"use server";

import { prisma } from "@/db";
import { requireEmployeeDocumentViewer } from "@/lib/employee-document-auth";
import { getActiveCompanyMemberWhere } from "@gnd/auth/company-member";
import { employeeDocumentAccessPath } from "@gnd/documents";
import {
	INSURANCE_DOCUMENT_TITLES,
	parseInsuranceDocumentMeta,
} from "@gnd/utils/insurance-documents";

function statusRank(status?: string | null) {
	switch (status) {
		case "pending":
			return 0;
		case "rejected":
			return 1;
		case "approved":
			return 2;
		default:
			return 3;
	}
}

export async function getEmployeeDocumentApprovals() {
	await requireEmployeeDocumentViewer();
	const documents = await prisma.userDocuments.findMany({
		where: {
			deletedAt: null,
			user: { is: getActiveCompanyMemberWhere() },
			title: {
				in: [...INSURANCE_DOCUMENT_TITLES],
			},
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					meta: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	return documents
		.map((document) => {
			const meta = parseInsuranceDocumentMeta(document.meta);
			const userMeta =
				document.user?.meta &&
				typeof document.user.meta === "object" &&
				!Array.isArray(document.user.meta)
					? (document.user.meta as Record<string, unknown>)
					: {};

			return {
				id: document.id,
				title: document.title,
				description: document.description,
				url: employeeDocumentAccessPath(document.id),
				expiresAt: meta.expiresAt ?? null,
				status: meta.status ?? "pending",
				approvedAt: meta.approvedAt ?? null,
				rejectedAt: meta.rejectedAt ?? null,
				createdAt: document.createdAt,
				user: {
					id: document.user?.id ?? 0,
					name: document.user?.name ?? "Unknown employee",
					email: document.user?.email ?? "",
					avatarUrl:
						typeof userMeta.avatarUrl === "string" ? userMeta.avatarUrl : null,
				},
			};
		})
		.sort((left, right) => {
			const rankDiff = statusRank(left.status) - statusRank(right.status);
			if (rankDiff !== 0) return rankDiff;

			return (
				new Date(right.createdAt ?? 0).getTime() -
				new Date(left.createdAt ?? 0).getTime()
			);
		});
}
