import { getServerAuthSession } from "@/lib/auth/session";
import { completeConfiguredSalesRequestMailboxCallback } from "@gnd/api/services/sales-request-mailbox-callback";

type RouteContext = { params: Promise<{ provider: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
	const session = await getServerAuthSession(new Headers(request.headers));
	const actorUserId = Number(session?.user?.id);
	if (!Number.isSafeInteger(actorUserId) || actorUserId < 1) {
		return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
	}
	const provider = (await context.params).provider;
	if (provider !== "gmail" && provider !== "microsoft-graph") {
		return Response.json({ error: "NOT_FOUND" }, { status: 404 });
	}
	const url = new URL(request.url);
	const state = url.searchParams.get("state") ?? "";
	const code = url.searchParams.get("code") ?? undefined;
	const cancelled = url.searchParams.has("error");
	if (!state || (!code && !cancelled)) {
		return Response.json({ error: "INVALID_CALLBACK" }, { status: 400 });
	}
	let outcome = "error";
	try {
		outcome = await completeConfiguredSalesRequestMailboxCallback({
			actorUserId,
			provider,
			state,
			code,
			cancelled,
			signal: request.signal,
		});
	} catch {
		// The browser returns to a fixed local target without exposing provider or
		// persistence failures in the callback response.
	}
	return Response.redirect(
		new URL(`/sales-book/requests?mailbox=${outcome}`, request.url),
		302,
	);
}
