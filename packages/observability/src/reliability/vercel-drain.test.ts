import { expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyVercelDrain } from "./vercel-drain";

const secret = "local-drain-fixture";
const signed = (body: string) => ({
	rawBody: Buffer.from(body),
	signature: createHmac("sha1", secret).update(body).digest("hex"),
});
it("verifies raw bytes before parsing JSON or NDJSON batches", () => {
	expect(verifyVercelDrain(signed('[{"id":"one"}]'), secret, "json")).toEqual([
		{ id: "one" },
	]);
	expect(
		verifyVercelDrain(signed('{"id":"one"}\n{"id":"two"}\n'), secret, "ndjson"),
	).toHaveLength(2);
	const request = signed('[{"id":"one"}]');
	expect(() =>
		verifyVercelDrain(
			{ ...request, rawBody: Buffer.from('[{"id":"two"}]') },
			secret,
			"json",
		),
	).toThrow("Invalid Vercel signature");
});
it("rejects unsigned, oversized, and malformed batches", () => {
	expect(() =>
		verifyVercelDrain(
			{ rawBody: Buffer.from("invalid"), signature: "" },
			secret,
			"json",
		),
	).toThrow("Invalid Vercel signature");
	expect(() => verifyVercelDrain(signed("{}"), secret, "json")).toThrow(
		"Invalid Vercel batch",
	);
	expect(() => verifyVercelDrain(signed("[null]"), secret, "json")).toThrow(
		"Invalid Vercel batch",
	);
	expect(() =>
		verifyVercelDrain(
			signed(JSON.stringify(Array(1001).fill({}))),
			secret,
			"json",
		),
	).toThrow("Invalid Vercel batch");
	expect(() =>
		verifyVercelDrain(
			{ rawBody: new Uint8Array(1_048_577), signature: "" },
			secret,
			"json",
		),
	).toThrow("Vercel payload too large");
});
