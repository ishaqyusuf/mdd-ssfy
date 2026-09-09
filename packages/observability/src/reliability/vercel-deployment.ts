import { createHash } from "node:crypto";
import { prepareIncidentIntake } from "./intake";
import type { VercelLogSource } from "./vercel-log";
import { verifyVercelSignature } from "./vercel-signature";

export function verifyVercelDeploymentFailure(
	request: { rawBody: Uint8Array; signature: string },
	registration: VercelLogSource & { secret: string },
	now: Date,
) {
	verifyVercelSignature(request, registration.secret);
	const event: unknown = JSON.parse(
		new TextDecoder("utf-8", { fatal: true }).decode(request.rawBody),
	);
	return prepareVercelDeploymentFailure(event, registration, now);
}

function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("Invalid Vercel deployment event");
	return value as Record<string, unknown>;
}

/** Authenticated current deployment.error payloads only; other lifecycle events differ. */
export function prepareVercelDeploymentFailure(
	input: unknown,
	source: VercelLogSource,
	now: Date,
) {
	const event = record(input);
	if (event.type !== "deployment.error")
		throw new Error("Unsupported Vercel deployment event");
	if (typeof event.id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(event.id))
		throw new Error("Invalid Vercel delivery identity");
	const payload = record(event.payload);
	if (
		record(payload.team).id !== source.account ||
		record(payload.project).id !== source.project
	)
		throw new Error("Unregistered Vercel deployment scope");
	if (
		payload.target === null ||
		payload.target === "staging" ||
		payload.target === "preview"
	)
		return null;
	if (payload.target !== "production")
		throw new Error("Unverified Vercel deployment target");
	const deploymentId = record(payload.deployment).id;
	if (
		typeof deploymentId !== "string" ||
		!/^[A-Za-z0-9_-]{1,160}$/.test(deploymentId)
	)
		throw new Error("Invalid Vercel deployment identity");
	let occurredAt = event.createdAt;
	if (typeof occurredAt === "number") {
		if (
			!Number.isSafeInteger(occurredAt) ||
			occurredAt < 0 ||
			!Number.isFinite(new Date(occurredAt).getTime())
		)
			throw new Error("Invalid Vercel event time");
		occurredAt = new Date(occurredAt).toISOString();
	}
	const identity = createHash("sha256")
		.update(JSON.stringify(["deployment.error", deploymentId]))
		.digest("hex");
	return {
		deliveryId: event.id,
		intake: prepareIncidentIntake(
			{
				provider: "vercel",
				account: source.account,
				project: source.project,
				environment: "production",
				eventId: identity,
				groupId: identity,
				operation: source.operation,
				impact: "unknown",
				occurredAt,
				evidence: { deploymentId },
			},
			source.service,
			now,
		),
	};
}
