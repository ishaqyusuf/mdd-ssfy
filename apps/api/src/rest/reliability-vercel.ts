import {
	type PreparedIncidentIntake,
	type VercelLogSource,
	prepareVercelLog,
	verifyVercelDrain,
} from "@gnd/observability/reliability";

export type VercelDrainRegistration = VercelLogSource & {
	secret: string;
	format: "json" | "ndjson";
};

export async function handleVercelDrainRequest(
	request: Request,
	dependencies: {
		registration: VercelDrainRegistration | null;
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
	const contentType = request.headers
		.get("content-type")
		?.split(";")[0]
		?.trim();
	if (
		contentType !==
		(registration.format === "json"
			? "application/json"
			: "application/x-ndjson")
	)
		return response(415, "INVALID_FORMAT");
	const reader = request.body?.getReader();
	if (!reader) return response(400, "EMPTY_BODY");
	let intakes: PreparedIncidentIntake[];
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
		const logs = verifyVercelDrain(
			{
				rawBody: Buffer.concat(chunks),
				signature: request.headers.get("x-vercel-signature") ?? "",
			},
			registration.secret,
			registration.format,
		);
		const now = dependencies.now();
		intakes = logs
			.map((log) => prepareVercelLog(log, registration, now))
			.filter((intake) => intake !== null);
	} catch (error) {
		return error instanceof Error &&
			error.message === "Invalid Vercel signature"
			? response(401, "INVALID_SIGNATURE")
			: response(400, "INVALID_BATCH");
	} finally {
		reader.releaseLock();
	}
	try {
		for (const intake of intakes) await dependencies.persist(intake);
		return response(200, "PERSISTED");
	} catch {
		return response(503, "PERSISTENCE_UNAVAILABLE");
	}
}
