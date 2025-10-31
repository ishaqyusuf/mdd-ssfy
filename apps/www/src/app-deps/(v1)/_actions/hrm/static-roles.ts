"use server";

import { prisma } from "@/db";
import { _cache } from "../_cache/load-data";

export async function staticRolesAction() {
    return await _cache(
        "roles",
        async () => {
            const roles = await prisma.roles.findMany({});
            return roles;
        },
        "roles"
    );
}
