import "server-only";

import type { Roles, Users } from "@/db";
import type { ICan } from "@/types/auth";
import {
	type WebActiveSessionInfo,
	buildWebAppSession,
} from "@gnd/auth/better-auth/www";
import { headers as nextHeaders } from "next/headers";
import { cache } from "react";
import {
	type HeadersLike,
	createServerAuthSessionResolver,
} from "./session-resolver";
import { webAuth } from "./web-auth";

export type AppSession = {
	user: Users;
	can: ICan;
	role: Roles | null;
	activeSession?: WebActiveSessionInfo | null;
	rememberMe?: boolean;
};
export type ActiveSessionInfo = WebActiveSessionInfo;

async function loadServerAuthSession(headers: HeadersLike) {
	const requestHeaders = headersToMutable(headers);
	const authSession = await webAuth.api.getSession({
		headers: requestHeaders,
	});

	return (await buildWebAppSession(authSession)) as AppSession | null;
}

export const getServerAuthSession = createServerAuthSessionResolver({
	cache,
	getRequestHeaders: nextHeaders,
	loadSession: loadServerAuthSession,
});

function headersToMutable(headers: HeadersLike) {
	const next = new Headers();
	headers.forEach((value, key) => {
		next.set(key, value);
	});
	return next;
}
