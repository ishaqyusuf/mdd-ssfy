import { prisma } from "@/db";

export const transaction = async <T>(
    fn: (tx: typeof prisma) => Promise<T>,
): Promise<T> => {
    return prisma.$transaction(fn, {
        timeout: 20000,
    });
};

