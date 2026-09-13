import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

const base64Schema = z
	.string()
	.min(1)
	.regex(/^[A-Za-z0-9+/]+={0,2}$/);

export const mailboxEncryptedSecretSchema = z
	.object({
		algorithm: z.literal("aes-256-gcm"),
		keyVersion: z.string().trim().min(1).max(64),
		iv: base64Schema,
		authTag: base64Schema,
		ciphertext: base64Schema,
	})
	.strict();
export type MailboxEncryptedSecret = z.infer<
	typeof mailboxEncryptedSecretSchema
>;

function requireKey(key: Buffer) {
	if (key.byteLength !== 32) {
		throw new Error("Mailbox encryption key must be exactly 32 bytes.");
	}
}

function additionalData(keyVersion: string, binding: string) {
	if (!binding.trim()) throw new Error("Mailbox secret binding is required.");
	return Buffer.from(
		`gnd:sales-request-mailbox-secret:v1\0${keyVersion}\0${binding}`,
		"utf8",
	);
}

export function encryptMailboxSecret(input: {
	plaintext: string;
	key: Buffer;
	keyVersion: string;
	binding: string;
}): MailboxEncryptedSecret {
	requireKey(input.key);
	if (!input.plaintext) throw new Error("Mailbox secret cannot be empty.");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", input.key, iv);
	cipher.setAAD(additionalData(input.keyVersion, input.binding));
	const ciphertext = Buffer.concat([
		cipher.update(input.plaintext, "utf8"),
		cipher.final(),
	]);
	return mailboxEncryptedSecretSchema.parse({
		algorithm: "aes-256-gcm",
		keyVersion: input.keyVersion,
		iv: iv.toString("base64"),
		authTag: cipher.getAuthTag().toString("base64"),
		ciphertext: ciphertext.toString("base64"),
	});
}

export function decryptMailboxSecret(input: {
	envelope: MailboxEncryptedSecret;
	resolveKey: (keyVersion: string) => Buffer;
	binding: string;
}) {
	const envelope = mailboxEncryptedSecretSchema.parse(input.envelope);
	const key = input.resolveKey(envelope.keyVersion);
	requireKey(key);
	const decipher = createDecipheriv(
		envelope.algorithm,
		key,
		Buffer.from(envelope.iv, "base64"),
	);
	decipher.setAAD(additionalData(envelope.keyVersion, input.binding));
	const suppliedTag = Buffer.from(envelope.authTag, "base64");
	// Keep the fixed-size check explicit before the native authenticated decrypt.
	if (suppliedTag.byteLength !== 16) {
		const expected = Buffer.alloc(16);
		timingSafeEqual(expected, expected);
		throw new Error("Invalid mailbox authentication tag.");
	}
	decipher.setAuthTag(suppliedTag);
	return Buffer.concat([
		decipher.update(Buffer.from(envelope.ciphertext, "base64")),
		decipher.final(),
	]).toString("utf8");
}
