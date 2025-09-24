"use server";

import { prisma } from "@/db";
import {
    getStepComponents as __getStepComponents,
    GetStepComponentsSchema,
} from "@api/db/queries/sales-form";

export async function getStepComponents(props: GetStepComponentsSchema) {
    return await __getStepComponents({ db: prisma }, props);
}
