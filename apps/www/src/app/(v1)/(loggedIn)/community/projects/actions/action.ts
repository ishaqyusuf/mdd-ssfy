"use server";

import { prisma } from "@/db";
import { slugModel } from "@/lib/utils";
import { IProject } from "@/types/community";

export async function updateProjectAction(data: IProject) {
    data.slug = await slugModel(data.title, prisma.projects, 0, data.id);
    await prisma.projects.update({
        where: {
            id: data.id,
        },
        data: {
            slug: data.slug,
            title: data.title,
            address: data.address,
            meta: data.meta as any,
            builderId: data.builderId,
        },
    });
}
