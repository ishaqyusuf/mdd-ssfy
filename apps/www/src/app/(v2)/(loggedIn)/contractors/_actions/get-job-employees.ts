"use server";

import { _cache } from "@/app/(v1)/_actions/_cache/load-data";
import { prisma } from "@/db";

export async function getContractorsAction() {
    return await _cache("employees.contractors", async () => {
        return await prisma.users.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: {
                                in: [
                                    "punchout",
                                    "1099 contractor",
                                    "deco-shutter installer",
                                ],
                            },
                        },
                    },
                },
            },
        });
    });
}
