"use server";

import { cookies } from "next/headers";

export async function setCachedRoute(name, page) {
    await cookies().set(name, page);
}
