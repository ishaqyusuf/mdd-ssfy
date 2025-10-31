import { prisma } from "@/db";

export async function getSalesProdWorkersdta() {
    return await prisma.users.findMany({
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
}
