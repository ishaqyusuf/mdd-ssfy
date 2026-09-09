import { expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import {
	prepareVercelDeploymentFailure,
	verifyVercelDeploymentFailure,
} from "./vercel-deployment";
const source = {
	account: "team",
	project: "project",
	operation: "deployment.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["deployment.error"],
		sources: [
			{ provider: "vercel" as const, account: "team", project: "project" },
		],
	},
};
const now = new Date("2026-09-09T12:00:00Z");

it("authenticates raw deployment bytes before interpreting the event", () => {
	const secret = "webhook-secret";
	const rawBody = Buffer.from(JSON.stringify(event));
	const signature = createHmac("sha1", secret).update(rawBody).digest("hex");
	expect(
		verifyVercelDeploymentFailure(
			{ rawBody, signature },
			{ ...source, secret },
			now,
		)?.deliveryId,
	).toBe("delivery1");
	expect(() =>
		verifyVercelDeploymentFailure(
			{ rawBody, signature },
			{ ...source, secret: "wrong" },
			now,
		),
	).toThrow("Invalid Vercel signature");
	expect(() =>
		verifyVercelDeploymentFailure(
			{ rawBody: Buffer.from("invalid json"), signature: "" },
			{ ...source, secret },
			now,
		),
	).toThrow("Invalid Vercel signature");
});
const event = {
	id: "delivery1",
	type: "deployment.error",
	createdAt: now.toISOString(),
	payload: {
		team: { id: "team" },
		project: { id: "project" },
		target: "production",
		deployment: { id: "dpl_1", meta: { private: "secret" } },
	},
};
it("keeps delivery identity separate from the failed deployment occurrence", () => {
	const first = prepareVercelDeploymentFailure(event, source, now);
	const second = prepareVercelDeploymentFailure(
		{ ...event, id: "delivery2" },
		source,
		now,
	);
	expect(first?.intake.occurrence.key).toBe(second?.intake.occurrence.key);
	expect(first?.deliveryId).toBe("delivery1");
	expect(first?.intake.incident.severity).toBe("P2");
	expect(first?.intake.occurrence.evidence).toEqual({ deploymentId: "dpl_1" });
	expect(JSON.stringify(first)).not.toContain("secret");
});
it("requires exact team/project and explicit production target", () => {
	expect(() =>
		prepareVercelDeploymentFailure(
			{ ...event, payload: { ...event.payload, team: { id: "other" } } },
			source,
			now,
		),
	).toThrow();
	expect(() =>
		prepareVercelDeploymentFailure(
			{ ...event, payload: { ...event.payload, target: undefined } },
			source,
			now,
		),
	).toThrow();
	expect(
		prepareVercelDeploymentFailure(
			{ ...event, payload: { ...event.payload, target: null } },
			source,
			now,
		),
	).toBeNull();
	expect(() =>
		prepareVercelDeploymentFailure(
			{ ...event, type: "deployment.succeeded" },
			source,
			now,
		),
	).toThrow();
});
