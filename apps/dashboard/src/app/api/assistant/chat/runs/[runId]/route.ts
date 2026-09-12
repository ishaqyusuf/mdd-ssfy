export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
	request: Request,
	context: { params: Promise<{ runId: string }> },
) {
	const { runId } = await context.params;
	const { assistantChatRouter } = await import("@api/rest/routers/assistant");
	const url = new URL(request.url);
	url.pathname = `/runs/${encodeURIComponent(runId)}`;
	return assistantChatRouter.fetch(new Request(url, request));
}
