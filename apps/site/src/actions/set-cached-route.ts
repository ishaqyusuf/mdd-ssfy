"use server";

import { cookies } from "next/headers";

export async function setCachedRoute(name, page) {
    await (await cookies()).set(name, page);
}
