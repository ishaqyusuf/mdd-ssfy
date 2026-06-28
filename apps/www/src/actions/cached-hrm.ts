"use server";

import { prisma } from "@/db";
import { unstable_cache } from "next/cache";

export async function getPermissions() {
	const tags = ["permissions"];
	return unstable_cache(
		async () => {
			return await prisma.permissions.findMany({
				select: {
					id: true,
					name: true,
				},
			});
		},
		tags,
		{ tags },
	)();
}
