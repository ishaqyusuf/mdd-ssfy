"use server";

import { _revalidate } from "@/app-deps/(v1)/_actions/_revalidate";
import { prisma } from "@/db";
import { INSURANCE_DOCUMENT_TITLE } from "@gnd/utils/insurance-documents";

export async function _saveDocUpload(data) {
	data.createdAt = data.updatedAt = new Date();
	data.title = data.title || INSURANCE_DOCUMENT_TITLE;
	data.meta = {
		...(data.meta || {}),
		status: "pending",
		approvedAt: null,
		approvedBy: null,
		rejectedAt: null,
		rejectedBy: null,
	};
	await prisma.userDocuments.create({
		data: data,
	});

	_revalidate("contractor-overview");
}
