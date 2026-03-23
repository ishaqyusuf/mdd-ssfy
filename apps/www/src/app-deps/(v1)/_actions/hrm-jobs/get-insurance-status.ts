"use server";

import { prisma } from "@/db";
import { getInsuranceRequirement } from "@gnd/utils/insurance-documents";
import { userId } from "../utils";

export async function getInsuranceStatusForUser(targetUserId: number) {
	const documents = await prisma.userDocuments.findMany({
		where: {
			userId: targetUserId,
			deletedAt: null,
		},
		select: {
			id: true,
			title: true,
			url: true,
			meta: true,
			createdAt: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	return getInsuranceRequirement(documents);
}

export async function getMyInsuranceStatus() {
	const authId = await userId();
	if (!authId) {
		return getInsuranceRequirement([]);
	}

	return getInsuranceStatusForUser(authId);
}
