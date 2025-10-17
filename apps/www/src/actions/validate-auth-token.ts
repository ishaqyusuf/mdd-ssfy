import { prisma } from "@/db";
import dayjs from "dayjs";

export async function validateAuthToken(id) {
    const token = await prisma.emailTokenLogin.findFirst({
        where: {
            id,
        },
        select: {
            id: true,
            createdAt: true,
            userId: true,
        },
    });
    const user = await prisma.users.findUnique({
        where: {
            id: token?.userId,
        },
        select: {
            id: true,
            email: true,
        },
    });
    const createdAt = token.createdAt;
    const createdAgo = dayjs().diff(createdAt, "minutes");

    if (createdAgo > 3)
        return {
            status: "Expired",
        };
    return {
        email: user.email,
    };
}

