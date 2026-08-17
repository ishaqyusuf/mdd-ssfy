import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

const ENVELOPE_MAGIC = new TextEncoder().encode("GND-SO-SIG-1\n");
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function signatureEncryptionSecret() {
	const secret =
		process.env.SPECIAL_ORDER_SIGNATURE_ENCRYPTION_SECRET ||
		process.env.SPECIAL_ORDER_TOKEN_SECRET ||
		process.env.AUTH_SECRET ||
		process.env.BETTER_AUTH_SECRET ||
		process.env.JWT_SECRET ||
		(process.env.NODE_ENV !== "production"
			? "gnd-local-special-order-signature"
			: "");
	if (!secret) {
		throw new Error("Special Order signature encryption is not configured.");
	}
	return secret;
}

function encryptionKey(secret: string) {
	return Uint8Array.from(createHash("sha256").update(secret).digest());
}

function concatenateBytes(parts: Uint8Array[]) {
	const output = new Uint8Array(
		parts.reduce((length, part) => length + part.byteLength, 0),
	);
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.byteLength;
	}
	return output;
}

function hasMagicPrefix(value: Uint8Array) {
	if (value.byteLength < ENVELOPE_MAGIC.byteLength) return false;
	return ENVELOPE_MAGIC.every((byte, index) => value[index] === byte);
}

export function getSpecialOrderSignatureBlobAccess() {
	if (process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS === "public") {
		return "public" as const;
	}
	if (process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS === "private") {
		return "private" as const;
	}
	const configuredBlobUrl = process.env.NEXT_PUBLIC_VERCEL_BLOB_URL;
	if (configuredBlobUrl) {
		try {
			const hostname = new URL(configuredBlobUrl).hostname.toLowerCase();
			if (hostname.endsWith(".private.blob.vercel-storage.com")) {
				return "private" as const;
			}
			if (hostname.endsWith(".public.blob.vercel-storage.com")) {
				return "public" as const;
			}
		} catch {
			// Fall through to the encrypted shared-store default.
		}
	}
	return "public" as const;
}

export function encryptSpecialOrderSignature(
	png: ArrayBufferView,
	secret = signatureEncryptionSecret(),
) {
	const iv = Uint8Array.from(randomBytes(IV_LENGTH));
	const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
	const ciphertext = concatenateBytes([
		Uint8Array.from(
			cipher.update(
				new Uint8Array(png.buffer, png.byteOffset, png.byteLength),
			),
		),
		Uint8Array.from(cipher.final()),
	]);
	return concatenateBytes([
		ENVELOPE_MAGIC,
		iv,
		Uint8Array.from(cipher.getAuthTag()),
		ciphertext,
	]);
}

export function decryptSpecialOrderSignature(
	envelopeInput: ArrayBufferView,
	secret = signatureEncryptionSecret(),
) {
	const envelope = new Uint8Array(
		envelopeInput.buffer,
		envelopeInput.byteOffset,
		envelopeInput.byteLength,
	);
	const minimumLength = ENVELOPE_MAGIC.length + IV_LENGTH + AUTH_TAG_LENGTH + 1;
	if (
		envelope.length < minimumLength ||
		!hasMagicPrefix(envelope)
	) {
		throw new Error("Special Order signature envelope is invalid.");
	}
	const ivStart = ENVELOPE_MAGIC.length;
	const tagStart = ivStart + IV_LENGTH;
	const ciphertextStart = tagStart + AUTH_TAG_LENGTH;
	const decipher = createDecipheriv(
		"aes-256-gcm",
		encryptionKey(secret),
		envelope.subarray(ivStart, tagStart),
	);
	decipher.setAuthTag(Uint8Array.from(envelope.subarray(tagStart, ciphertextStart)));
	return concatenateBytes([
		Uint8Array.from(decipher.update(envelope.subarray(ciphertextStart))),
		Uint8Array.from(decipher.final()),
	]);
}
