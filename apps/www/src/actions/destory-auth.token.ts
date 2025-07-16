import { prisma } from "@/db";

export async function destroyAuthToken(token) {
    await prisma.emailTokenLogin.delete({
        where: {
            id: token,
        },
    });
}
