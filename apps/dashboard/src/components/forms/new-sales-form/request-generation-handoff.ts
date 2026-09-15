import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";

const STORAGE_PREFIX = "gnd:sales-request-handoff:";
const MAX_AGE_MS = 15 * 60 * 1000;

type StoredSalesRequestHandoff = {
	createdAt: number;
	preview: SalesRequestGeneratePreviewOutput;
};

// Keep navigation usable when browser storage is unavailable. This contains only
// the generated preview and pasted review context; cleared on consumption or expiry.
const pendingHandoffs = new Map<string, StoredSalesRequestHandoff>();

function storageKey(generationId: string) {
	return `${STORAGE_PREFIX}${generationId}`;
}

export function writeSalesRequestGenerationHandoff(
	preview: SalesRequestGeneratePreviewOutput,
) {
	const stored = { createdAt: Date.now(), preview };
	for (const [id, handoff] of pendingHandoffs) {
		if (Date.now() - handoff.createdAt > MAX_AGE_MS) pendingHandoffs.delete(id);
	}
	pendingHandoffs.set(preview.generationId, stored);
	try {
		window.sessionStorage.setItem(
			storageKey(preview.generationId),
			JSON.stringify(stored),
		);
	} catch {
		// Same-tab navigation can consume the in-memory copy without another call.
	}
}

export function readSalesRequestGenerationHandoff(generationId: string) {
	try {
		let stored = pendingHandoffs.get(generationId);
		if (!stored) {
			const raw = window.sessionStorage.getItem(storageKey(generationId));
			if (!raw) return null;
			stored = JSON.parse(raw) as StoredSalesRequestHandoff;
		}
		if (
			!stored ||
			stored.preview?.generationId !== generationId ||
			!Number.isFinite(stored.createdAt) ||
			Date.now() - stored.createdAt > MAX_AGE_MS
		) {
			clearSalesRequestGenerationHandoff(generationId);
			return null;
		}
		return stored.preview;
	} catch {
		clearSalesRequestGenerationHandoff(generationId);
		return null;
	}
}

export function clearSalesRequestGenerationHandoff(generationId: string) {
	pendingHandoffs.delete(generationId);
	try {
		window.sessionStorage.removeItem(storageKey(generationId));
	} catch {
		// Unavailable storage must not break successful navigation or expiration.
	}
}
