"use server";

import { cookies } from "next/headers";
import { setCachedRoute } from "./set-cached-route";
import { redirect } from "next/navigation";
import { ROUTE_VERSIONS } from "@/utils/constants";

export async function getCachedRoute(name, currentPage: "old" | "new") {
    const r = (await cookies()).get(name)?.value;
    if (!r) await setCachedRoute(name, currentPage);
    else {
        if (currentPage != r) {
            const route = ROUTE_VERSIONS[name]?.[currentPage];
            if (route) redirect(route);
        }
    }
}
