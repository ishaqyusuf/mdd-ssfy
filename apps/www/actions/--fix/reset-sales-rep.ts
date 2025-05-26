"use server";

import { prisma } from "@/db";
import { revalidateTag } from "next/cache";

export async function resetSalesRep() {
    await prisma.payrollHistory.deleteMany({
        where: {},
    });
    await prisma.payroll.deleteMany({
        where: {
            deletedAt: {},
        },
    });
    revalidateTag(`sales_rep_commission_summary`);
}
