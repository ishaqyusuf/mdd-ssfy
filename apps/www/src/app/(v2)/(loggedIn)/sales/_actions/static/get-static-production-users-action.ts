"use server";

import { _cache } from "@/app/(v1)/_actions/_cache/load-data";
import { prisma } from "@/db";

export async function getStaticProductionUsersAction() {
    // await _cache("employees.sales-productions", async () => {
    return await prisma.users.findMany({
        include: {
            _count: {
                select: {
                    reppedProductions: {
                        where: {
                            // prodDueDate:{}
                            prodStatus: {
                                notIn: ["Completed"],
                            },
                        },
                    },
                },
            },
        },
        where: {
            deletedAt: null,
            roles: {
                some: {
                    role: {
                        name: "Production",
                    },
                },
            },
        },
    });

    // });
    // return users;
}
