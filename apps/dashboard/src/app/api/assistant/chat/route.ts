export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function forward(request: Request, suffix = "") {
	const { assistantChatRouter } = await import("@api/rest/routers/assistant");
	const url = new URL(request.url);
	url.pathname = `/${suffix}`;
	return assistantChatRouter.fetch(new Request(url, request));
}

export function POST(request: Request) {
	return forward(request);
}
