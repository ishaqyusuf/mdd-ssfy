import { createHash } from "node:crypto";

const MAX_IDENTITY_PART_CHARS = 255;

function validIdentityPart(value: string) {
	return (
		value.length > 0 &&
		value.length <= MAX_IDENTITY_PART_CHARS &&
		value.trim().length > 0 &&
		!Array.from(value).some((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code < 32 || code === 127;
		})
	);
}

function hashMailboxStorageIdentity(
	purpose: "provider-account" | "provider-source" | "source-key" | "message",
	parts: readonly string[],
) {
	if (parts.length === 0 || !parts.every(validIdentityPart)) {
		throw new Error("invalid-mailbox-storage-identity");
	}
	return createHash("sha256")
		.update("gnd:sales-request-mailbox-storage-identity:v1\0")
		.update(purpose)
		.update("\0")
		.update(JSON.stringify(parts))
		.digest("hex");
}

export function hashMailboxProviderAccountIdentity(
	provider: string,
	providerAccountId: string,
) {
	return hashMailboxStorageIdentity("provider-account", [
		provider,
		providerAccountId,
	]);
}

export function hashMailboxProviderSourceIdentity(
	kind: string,
	providerSourceId: string,
) {
	return hashMailboxStorageIdentity("provider-source", [
		kind,
		providerSourceId,
	]);
}

export function hashMailboxSourceKey(sourceKey: string) {
	return hashMailboxStorageIdentity("source-key", [sourceKey]);
}

export function hashMailboxProviderMessageIdentity(
	provider: string,
	providerMessageId: string,
) {
	return hashMailboxStorageIdentity("message", [provider, providerMessageId]);
}

/** Hash lookups are only candidates; stores must verify the retained raw value. */
export function isExactMailboxProviderIdentity(
	storedValue: string,
	expectedValue: string,
) {
	return storedValue === expectedValue;
}
