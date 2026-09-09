import { createHash, timingSafeEqual } from "node:crypto";

/** Aggregate-only boundary: provider evidence and credentials never leave here. */
export async function handleReliabilityHealthRequest(
	request: Request,
	dependencies: {
		token: string | null;
		read: () => Promise<readonly { status: string }[]>;
	},
) {
	const respond = (status: number, state: string) =>
		Response.json(
			{ status: state },
			{ status, headers: { "cache-control": "no-store" } },
		);
	if (!dependencies.token) return respond(404, "NOT_CONFIGURED");
	if (dependencies.token.length < 32)
		return respond(503, "CONFIGURATION_INVALID");
	if (request.method !== "GET") return respond(405, "METHOD_NOT_ALLOWED");
	const supplied = request.headers.get("authorization") ?? "";
	const digest = (value: string) => createHash("sha256").update(value).digest();
	if (
		!timingSafeEqual(digest(supplied), digest(`Bearer ${dependencies.token}`))
	)
		return respond(401, "UNAUTHORIZED");
	try {
		const sources = await dependencies.read();
		const healthy =
			sources.length > 0 &&
			sources.every((source) => source.status === "healthy");
		return respond(
			healthy ? 200 : 503,
			healthy ? "HEALTHY" : "INGESTION_UNHEALTHY",
		);
	} catch {
		return respond(503, "CHECK_UNAVAILABLE");
	}
}
