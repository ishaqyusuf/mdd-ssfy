import { createHmac, timingSafeEqual } from "node:crypto";
import { type ReliabilityService, prepareIncidentIntake } from "./intake";

export type SentryAlertRegistration = {
	clientSecret: string;
	installationId: string;
	account: string;
	projectId: string;
	operation: string;
	service: ReliabilityService;
};

function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("Invalid Sentry payload");
	return value as Record<string, unknown>;
}

/** Integration-platform event_alert only; legacy service hooks have a different contract. */
export function prepareSentryAlert(
	request: { rawBody: Uint8Array; signature: string; resource: string },
	registration: SentryAlertRegistration,
	now: Date,
) {
	if (request.rawBody.byteLength > 1_048_576)
		throw new Error("Sentry payload too large");
	if (!registration.clientSecret || !/^[a-f0-9]{64}$/.test(request.signature))
		throw new Error("Invalid Sentry signature");
	const digest = createHmac("sha256", registration.clientSecret)
		.update(request.rawBody)
		.digest();
	if (!timingSafeEqual(digest, Buffer.from(request.signature, "hex")))
		throw new Error("Invalid Sentry signature");
	const payload = record(
		JSON.parse(
			new TextDecoder("utf-8", { fatal: true }).decode(request.rawBody),
		),
	);
	if (request.resource !== "event_alert" || payload.action !== "triggered")
		throw new Error("Unsupported Sentry event");
	if (
		!registration.installationId ||
		record(payload.installation).uuid !== registration.installationId
	)
		throw new Error("Unregistered Sentry installation");
	const event = record(record(payload.data).event);
	const project =
		typeof event.project === "number" && Number.isSafeInteger(event.project)
			? String(event.project)
			: event.project;
	if (project !== registration.projectId)
		throw new Error("Unregistered Sentry project");
	const environments: unknown[] = [];
	if (event.environment !== undefined && event.environment !== null)
		environments.push(event.environment);
	if (Array.isArray(event.tags)) {
		for (const tag of event.tags) {
			if (Array.isArray(tag) && tag[0] === "environment")
				environments.push(tag[1]);
		}
	}
	if (
		!environments.length ||
		environments.some((environment) => environment !== "production")
	)
		throw new Error("Invalid Sentry environment");
	if (
		typeof event.datetime !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(event.datetime)
	)
		throw new Error("Invalid Sentry timestamp");
	// Preserve calendar validation in intake while truncating provider microseconds.
	const occurredAt = event.datetime.replace(
		/\.(\d{1,6})Z$/,
		(_, fraction: string) => `.${fraction.padEnd(3, "0").slice(0, 3)}Z`,
	);
	return prepareIncidentIntake(
		{
			provider: "sentry",
			account: registration.account,
			project: registration.projectId,
			environment: "production",
			eventId: event.event_id,
			groupId: event.issue_id,
			operation: registration.operation,
			impact: "unknown",
			occurredAt,
		},
		registration.service,
		now,
	);
}
