import { expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { handleVercelDeploymentRequest } from "./reliability-vercel-deployment";

const registration = {
	secret: "deployment-fixture",
	account: "team",
	project: "web",
	operation: "deployment.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["deployment.error"],
		sources: [{ provider: "vercel" as const, account: "team", project: "web" }],
	},
};
const now = new Date("2026-09-09T12:00:00Z");
const request = (signature?: string, target: string | null = "production") => {
	const body = JSON.stringify({
		type: "deployment.error",
		id: "delivery1",
		createdAt: now.toISOString(),
		payload: {
			team: { id: "team" },
			project: { id: "web" },
			target,
			deployment: { id: "dpl_1" },
		},
	});
	return new Request("https://api.example/deployment", {
		method: "POST",
		body,
		headers: {
			"content-type": "application/json",
			"x-vercel-signature":
				signature ??
				createHmac("sha1", registration.secret).update(body).digest("hex"),
		},
	});
};
it("rejects invalid signatures and ignores verified nonproduction failures without writes", async () => {
	let writes = 0;
	const deps = {
		registration,
		now: () => now,
		persist: async () => {
			writes++;
		},
	};
	expect(
		(await handleVercelDeploymentRequest(request("bad"), deps)).status,
	).toBe(401);
	expect(
		(await handleVercelDeploymentRequest(request(undefined, null), deps))
			.status,
	).toBe(200);
	expect(writes).toBe(0);
});
it("acknowledges persisted failures and returns retryable storage errors", async () => {
	let persisted = false;
	const result = await handleVercelDeploymentRequest(request(), {
		registration,
		now: () => now,
		persist: async () => {
			await Promise.resolve();
			persisted = true;
		},
	});
	expect(result.status).toBe(200);
	expect(persisted).toBe(true);
	const failed = await handleVercelDeploymentRequest(request(), {
		registration,
		now: () => now,
		persist: async () => {
			throw new Error("private database message");
		},
	});
	expect(failed.status).toBe(503);
	expect(await failed.text()).not.toContain("private database");
});
