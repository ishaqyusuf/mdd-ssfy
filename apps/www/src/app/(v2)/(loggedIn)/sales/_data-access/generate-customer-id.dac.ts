"use server";

import { prisma } from "@/db";
import { nextId } from "@/lib/nextId";
import dayjs from "dayjs";

export async function generateCustomerIdDac(customer) {
    let { slug, createdAt, id } = customer;
    const date = createdAt ? dayjs(createdAt) : dayjs();
    // ("C240130-123");
    if (!slug)
        slug = [
            `C${date.format("YY")}${date.format("MMDD")}`,
            id ? id : await nextId(prisma.customers),
        ].join("-");

    return { slug };
}
