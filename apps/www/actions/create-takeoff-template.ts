"use server";

import { prisma } from "@/db";
import { TakeOffTemplateData } from "@/types/sales";
import { Tags } from "@/utils/constants";
import { revalidateTag } from "next/cache";

interface Props {
    data: TakeOffTemplateData;
    sectionUid;
    title;
}
export async function createTakeoffTemplate(props: Props) {
    const template = await prisma.salesTakeOffTemplates.create({
        data: {
            data: props.data,
            sectionUid: props.sectionUid,
            title: props.title,
        },
    });
    revalidateTag(Tags.takeOffTemplates);
    return template;
}
