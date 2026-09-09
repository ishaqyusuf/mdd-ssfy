import {
	type PreparedIncidentIntake,
	type VercelLogSource,
	verifyVercelDeploymentFailure,
} from "@gnd/observability/reliability";

export async function handleVercelDeploymentRequest(
	request: Request,
	dependencies: {
		registration: (VercelLogSource & { secret: string }) | null;
		now: () => Date;
		persist: (intake: PreparedIncidentIntake) => Promise<unknown>;
	},
) {
	const registration = dependencies.registration;
	const response = (status: number, code: string) =>
		Response.json({ code }, { status });
	if (!registration) return response(404, "NOT_CONFIGURED");
	if (request.method !== "POST") return response(405, "METHOD_NOT_ALLOWED");
	const encoding = request.headers.get("content-encoding");
	if (encoding && encoding.toLowerCase() !== "identity")
		return response(415, "UNSUPPORTED_COMPRESSION");
	if (
		request.headers.get("content-type")?.split(";")[0]?.trim() !==
		"application/json"
	)
		return response(415, "INVALID_FORMAT");
	const reader = request.body?.getReader();
	if (!reader) return response(400, "EMPTY_BODY");
	let event: ReturnType<typeof verifyVercelDeploymentFailure>;
	try {
		const chunks: Uint8Array[] = [];
		let size = 0;
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 1_048_576) {
				await reader.cancel();
				return response(413, "PAYLOAD_TOO_LARGE");
			}
			chunks.push(value);
		}
		event = verifyVercelDeploymentFailure(
			{
				rawBody: Buffer.concat(chunks),
				signature: request.headers.get("x-vercel-signature") ?? "",
			},
			registration,
			dependencies.now(),
		);
	} catch (error) {
		return error instanceof Error &&
			error.message === "Invalid Vercel signature"
			? response(401, "INVALID_SIGNATURE")
			: response(400, "INVALID_EVENT");
	} finally {
		reader.releaseLock();
	}
	if (!event) return response(200, "IGNORED_NONPRODUCTION");
	try {
		await dependencies.persist(event.intake);
		return response(200, "PERSISTED");
	} catch {
		return response(503, "PERSISTENCE_UNAVAILABLE");
	}
}
