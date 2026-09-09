import { expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { handleVercelDrainRequest } from "./reliability-vercel";
const registration = {
	secret: "fixture",
	format: "json" as const,
	account: "team",
	project: "project",
	operation: "runtime.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["runtime.error"],
		sources: [
			{ provider: "vercel" as const, account: "team", project: "project" },
		],
	},
};
const now = new Date("2026-09-09T12:00:00Z");

it("rejects compressed delivery before parsing or storage", async () => {
	const incoming = new Request("https://api.example/drain", {
		method: "POST",
		body: "compressed-placeholder",
		headers: { "content-type": "application/json", "content-encoding": "gzip" },
	});
	let writes = 0;
	const response = await handleVercelDrainRequest(incoming, {
		registration,
		now: () => now,
		persist: async () => {
			writes++;
		},
	});
	expect(response.status).toBe(415);
	expect(await response.json()).toEqual({ code: "UNSUPPORTED_COMPRESSION" });
	expect(writes).toBe(0);
});
const log = {
	id: "log1",
	deploymentId: "dpl_1",
	projectId: "project",
	environment: "production",
	source: "lambda",
	level: "error",
	timestamp: now.getTime(),
};
const request = (logs: unknown[], signature?: string) => {
	const body = JSON.stringify(logs);
	return new Request("https://api.example/drain", {
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
it("validates the entire signed batch before persisting any occurrences", async () => {
	let writes = 0;
	const dependencies = {
		registration,
		now: () => now,
		persist: async () => {
			writes++;
		},
	};
	expect(
		(await handleVercelDrainRequest(request([log], "bad"), dependencies))
			.status,
	).toBe(401);
	expect(
		(
			await handleVercelDrainRequest(
				request([log, { ...log, projectId: "other" }]),
				dependencies,
			)
		).status,
	).toBe(400);
	expect(writes).toBe(0);
});
it("acknowledges only persisted actionable logs and reports storage failure", async () => {
	let writes = 0;
	const response = await handleVercelDrainRequest(
		request([log, { ...log, id: "info", level: "info" }]),
		{
			registration,
			now: () => now,
			persist: async () => {
				writes++;
			},
		},
	);
	expect(response.status).toBe(200);
	expect(writes).toBe(1);
	expect(
		(
			await handleVercelDrainRequest(request([log]), {
				registration,
				now: () => now,
				persist: async () => {
					throw new Error("private database detail");
				},
			})
		).status,
	).toBe(503);
});
