"use server";

import { prisma } from "@/db";
import { IUserDoc } from "@/types/hrm";
import { _revalidate } from "../../../../../(v1)/_actions/_revalidate";

export async function _deleteContractorDoc(doc: IUserDoc) {
    await prisma.userDocuments.delete({
        where: {
            id: doc.id,
        },
    });
    _revalidate("contractor-overview");
}
