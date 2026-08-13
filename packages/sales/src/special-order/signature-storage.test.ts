import { describe, expect, it } from "bun:test";

import {
	decryptSpecialOrderSignature,
	encryptSpecialOrderSignature,
} from "./signature-storage";

describe("Special Order signature storage", () => {
	it("round-trips a PNG without exposing its bytes in the stored envelope", () => {
		const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
		const envelope = encryptSpecialOrderSignature(png, "test-secret");

		expect(Buffer.from(envelope).equals(png)).toBe(false);
		expect(Buffer.from(envelope).includes(png)).toBe(false);
		expect(
			Buffer.from(decryptSpecialOrderSignature(envelope, "test-secret")),
		).toEqual(png);
	});

	it("rejects tampering and the wrong server secret", () => {
		const envelope = encryptSpecialOrderSignature(
			Buffer.from("private signature"),
			"correct-secret",
		);
		const tampered = Buffer.from(envelope);
		tampered[tampered.length - 1] ^= 1;

		expect(() =>
			decryptSpecialOrderSignature(tampered, "correct-secret"),
		).toThrow();
		expect(() =>
			decryptSpecialOrderSignature(envelope, "wrong-secret"),
		).toThrow();
	});
});
