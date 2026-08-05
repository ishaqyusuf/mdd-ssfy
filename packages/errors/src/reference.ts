function randomReferencePart() {
	const randomUuid = globalThis.crypto?.randomUUID?.();
	if (randomUuid) {
		return randomUuid.replaceAll("-", "").slice(0, 10).toUpperCase();
	}

	return Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(10, "0");
}

export function createErrorReference() {
	return `ERR-${randomReferencePart()}`;
}
