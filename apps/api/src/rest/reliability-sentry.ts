import {
	type PreparedIncidentIntake,
	type SentryAlertRegistration,
	prepareSentryAlert,
} from "@gnd/observability/reliability";

const maxBytes = 1_048_576;
export async function handleSentryAlertRequest(
	request: Request,
	dependencies: {
		registration: SentryAlertRegistration | null;
		now: () => Date;
		persist: (intake: PreparedIncidentIntake) => Promise<unknown>;
	},
) {
	if (!dependencies.registration)
		return Response.json({ error: "NOT_CONFIGURED" }, { status: 404 });
	if (request.method !== "POST")
		return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
	if (
		request.headers.get("content-type")?.split(";")[0]?.trim() !==
		"application/json"
	)
		return Response.json({ error: "JSON_REQUIRED" }, { status: 415 });
	const reader = request.body?.getReader();
	if (!reader)
		return Response.json({ error: "INVALID_EVENT" }, { status: 400 });
	let intake: PreparedIncidentIntake;
	try {
		const chunks: Uint8Array[] = [];
		let size = 0;
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxBytes) {
				await reader.cancel();
				return Response.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
			}
			chunks.push(value);
		}
		intake = prepareSentryAlert(
			{
				rawBody: Buffer.concat(chunks),
				signature: request.headers.get("sentry-hook-signature") ?? "",
				resource: request.headers.get("sentry-hook-resource") ?? "",
			},
			dependencies.registration,
			dependencies.now(),
		);
	} catch (error) {
		const unauthorized =
			error instanceof Error && error.message === "Invalid Sentry signature";
		return Response.json(
			{ error: unauthorized ? "INVALID_SIGNATURE" : "INVALID_EVENT" },
			{ status: unauthorized ? 401 : 400 },
		);
	} finally {
		reader.releaseLock();
	}
	try {
		await dependencies.persist(intake);
		return Response.json({ ok: true });
	} catch {
		return Response.json({ error: "PERSISTENCE_UNAVAILABLE" }, { status: 503 });
	}
}
