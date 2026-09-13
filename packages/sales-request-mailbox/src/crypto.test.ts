import { describe, expect, test } from "bun:test";
import {
	decryptMailboxSecret,
	encryptMailboxSecret,
	mailboxEncryptedSecretSchema,
} from "./crypto";

describe("mailbox credential encryption", () => {
	const key = Buffer.alloc(32, 7);

	test("round trips an authenticated secret without serializing plaintext", () => {
		const envelope = encryptMailboxSecret({
			plaintext: "refresh-token",
			key,
			keyVersion: "k1",
			binding: "connection-1:refresh-token",
		});
		expect(mailboxEncryptedSecretSchema.parse(envelope)).toEqual(envelope);
		expect(JSON.stringify(envelope)).not.toContain("refresh-token");
		expect(
			decryptMailboxSecret({
				envelope,
				resolveKey: () => key,
				binding: "connection-1:refresh-token",
			}),
		).toBe("refresh-token");
	});

	test("rejects the wrong key and tampered ciphertext", () => {
		const envelope = encryptMailboxSecret({
			plaintext: "refresh-token",
			key,
			keyVersion: "k1",
			binding: "connection-1:refresh-token",
		});
		expect(() =>
			decryptMailboxSecret({
				envelope,
				resolveKey: () => Buffer.alloc(32, 8),
				binding: "connection-1:refresh-token",
			}),
		).toThrow();
		expect(() =>
			decryptMailboxSecret({
				envelope: { ...envelope, ciphertext: `${envelope.ciphertext}AA` },
				resolveKey: () => key,
				binding: "connection-1:refresh-token",
			}),
		).toThrow();
		expect(() =>
			decryptMailboxSecret({
				envelope,
				resolveKey: () => key,
				binding: "connection-2:refresh-token",
			}),
		).toThrow();
	});

	test("requires an exact 256-bit key", () => {
		expect(() =>
			encryptMailboxSecret({
				plaintext: "secret",
				key: Buffer.alloc(31),
				keyVersion: "k1",
				binding: "connection-1:access-token",
			}),
		).toThrow("32 bytes");
	});
});
