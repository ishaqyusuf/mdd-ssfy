"use server";
import { TypedExport } from "@/app/(clean-code)/_common/export/type";
import { prisma } from "@/db";

export async function getExportConfigs(type) {
    return (await prisma.exportConfig.findMany({
        where: {
            type,
        },
    })) as any as TypedExport[];
}
