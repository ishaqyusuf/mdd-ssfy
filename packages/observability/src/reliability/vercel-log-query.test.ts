import { expect, it } from "bun:test";
import {
	decodeVercelLogQuery,
	prepareVercelLogQuery,
} from "./vercel-log-query";
it("explicitly scopes noninteractive production discovery without implicit branch filtering", () => {
	const query = prepareVercelLogQuery({
		account: "team",
		project: "project",
		since: new Date("2026-09-09T11:00:00Z"),
		until: new Date("2026-09-09T12:00:00Z"),
		limit: 100,
	});
	expect(query).toContain("--no-branch");
	expect(query).toContain("production");
	expect(query).toContain("--scope");
	expect(query).not.toContain("--level");
	expect(query).not.toContain("--status-code");
});
it("flags limit saturation and rejects malformed or oversized JSONL output", () => {
	expect(decodeVercelLogQuery(Buffer.from('{"id":"one"}\n'), 2).saturated).toBe(
		false,
	);
	expect(
		decodeVercelLogQuery(Buffer.from('{"id":"one"}\n{"id":"two"}\n'), 2)
			.saturated,
	).toBe(true);
	expect(() => decodeVercelLogQuery(Buffer.from('{"id":'), 2)).toThrow();
	expect(() => decodeVercelLogQuery(Buffer.from("null\n"), 2)).toThrow();
	expect(() => decodeVercelLogQuery(new Uint8Array(2_097_153), 100)).toThrow();
});
