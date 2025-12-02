"use server";

import { prisma } from "@/db";
import { _revalidate } from "@/app-deps/(v1)/_actions/_revalidate";

export async function _saveDocUpload(data) {
    data.createdAt = data.updatedAt = new Date();
    await prisma.userDocuments.create({
        data: data,
    });

    _revalidate("contractor-overview");
}
