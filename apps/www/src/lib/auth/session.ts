import "server-only";

import {
    buildWebAppSession,
    type WebActiveSessionInfo,
} from "@gnd/auth/better-auth/www";
import type { Roles, Users } from "@/db";
import type { ICan } from "@/types/auth";
import { headers as nextHeaders } from "next/headers";
import { webAuth } from "./web-auth";

export type AppSession = {
    user: Users;
    can: ICan;
    role: Roles | null;
    activeSession?: WebActiveSessionInfo | null;
    rememberMe?: boolean;
};
export type ActiveSessionInfo = WebActiveSessionInfo;

export async function getServerAuthSession(headers?: Headers) {
    const requestHeaders = headers ?? headersToMutable(await nextHeaders());
    const authSession = await webAuth.api.getSession({
        headers: requestHeaders,
    });

    return (await buildWebAppSession(authSession)) as AppSession | null;
}

function headersToMutable(headers: Headers) {
    const next = new Headers();
    headers.forEach((value, key) => {
        next.set(key, value);
    });
    return next;
}
