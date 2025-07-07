"use server";

import { cookies } from "next/headers";

export async function getSideMenuMode() {
    const cookie = await cookies();
    const value = cookie.get("sidebar_state_")?.value || "collapsed";

    return value;
}

export async function setSideMenuMode(value) {
    const cookie = await cookies();
    cookie.set("sidebar_state_", value);
}
