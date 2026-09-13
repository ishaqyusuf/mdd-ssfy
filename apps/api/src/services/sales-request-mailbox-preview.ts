import { parseMailboxModelInput } from "@gnd/sales-request-mailbox";
import { createSalesRequestPreview } from "./sales-request-preview";

const QUEUE_IDENTITY_PATTERN = /^srq[1-9][0-9]*:[a-f0-9]{64}$/;
const CONTENT_HASH_PATTERN = /^msc1:[a-f0-9]{64}$/;
const MAX_IDENTITY_CHARS = 255;

export type SalesRequestMailboxPreviewSaleType = "order" | "quote";

/**
 * Immutable storage identity for the exact mailbox content used by a preview.
 * Provider message IDs deliberately do not cross this application boundary.
 */
export type MailboxSalesRequestPreviewIdentity = Readonly<{
	queueIdentity: string;
	snapshotIdentity: string;
	contentHash: string;
}>;

export type MailboxSalesRequestPreviewSource = Readonly<{
	kind: "authorized";
	modelInput: string;
	identity: MailboxSalesRequestPreviewIdentity;
}>;

type CanonicalMailboxSalesRequestPreviewSource =
	MailboxSalesRequestPreviewSource & { groundingText: string };

export type MailboxSalesRequestPreviewResolution =
	| MailboxSalesRequestPreviewSource
	| {
			kind: "not-found" | "forbidden" | "stale" | "not-ready";
	  };

export type SalesRequestMailboxPreviewInput = Readonly<{
	actorUserId: number;
	queueIdentity: string;
	type: SalesRequestMailboxPreviewSaleType;
	signal: AbortSignal;
}>;

type PreviewDependencies = Parameters<typeof createSalesRequestPreview>[1];

export type SalesRequestMailboxPreviewDependencies = {
	/**
	 * The storage adapter owns current owner, office, policy, status, retention,
	 * and content authorization. It must return no model input for a non-authorized
	 * queue. The bridge calls it again after generation to fence stale content.
	 */
	resolveAuthorizedQueue: (input: {
		actorUserId: number;
		queueIdentity: string;
		type: SalesRequestMailboxPreviewSaleType;
		signal: AbortSignal;
	}) => Promise<MailboxSalesRequestPreviewResolution>;
	/** Builds the existing preview dependencies for the authenticated actor. */
	createPreviewDependencies: (input: {
		actorUserId: number;
		type: SalesRequestMailboxPreviewSaleType;
		queueIdentity: string;
	}) => PreviewDependencies;
};

export type SalesRequestMailboxPreviewUnavailableReason =
	| "not-found"
	| "forbidden"
	| "stale"
	| "not-ready";

export class SalesRequestMailboxPreviewError extends Error {
	readonly reason: SalesRequestMailboxPreviewUnavailableReason;

	constructor(reason: SalesRequestMailboxPreviewUnavailableReason) {
		super(
			reason === "stale"
				? "The mailbox request changed while the preview was being generated. Generate it again."
				: "The mailbox request is unavailable for preview.",
		);
		this.name = "SalesRequestMailboxPreviewError";
		this.reason = reason;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

function isPositiveSafeInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) > 0;
}

function hasSafeIdentityText(value: unknown): value is string {
	if (
		typeof value !== "string" ||
		value.length < 1 ||
		value.length > MAX_IDENTITY_CHARS ||
		value !== value.trim()
	)
		return false;
	return !Array.from(value).some((character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		return codePoint < 32 || codePoint === 127;
	});
}

function assertInput(input: SalesRequestMailboxPreviewInput) {
	if (
		!isPositiveSafeInteger(input.actorUserId) ||
		(input.type !== "order" && input.type !== "quote") ||
		typeof input.queueIdentity !== "string" ||
		!QUEUE_IDENTITY_PATTERN.test(input.queueIdentity) ||
		!(input.signal instanceof AbortSignal) ||
		Object.keys(input).length !== 4
	) {
		throw new Error("invalid-mailbox-preview-input");
	}
}

function normalizeSource(
	value: MailboxSalesRequestPreviewResolution,
	expectedQueueIdentity: string,
	afterGeneration = false,
): CanonicalMailboxSalesRequestPreviewSource {
	if (value.kind !== "authorized") {
		if (afterGeneration) {
			throw new SalesRequestMailboxPreviewError("stale");
		}
		throw new SalesRequestMailboxPreviewError(value.kind);
	}
	if (typeof value.modelInput !== "string") {
		throw new Error("invalid-mailbox-preview-source");
	}
	let groundingText: string;
	try {
		groundingText = parseMailboxModelInput(value.modelInput);
	} catch {
		throw new Error("invalid-mailbox-preview-source");
	}
	const identity = value.identity;
	if (
		!identity ||
		identity.queueIdentity !== expectedQueueIdentity ||
		!QUEUE_IDENTITY_PATTERN.test(identity.queueIdentity) ||
		!hasSafeIdentityText(identity.snapshotIdentity) ||
		!CONTENT_HASH_PATTERN.test(identity.contentHash)
	) {
		throw new Error("invalid-mailbox-preview-source");
	}
	return {
		kind: "authorized",
		modelInput: value.modelInput,
		groundingText,
		identity: Object.freeze({
			queueIdentity: identity.queueIdentity,
			snapshotIdentity: identity.snapshotIdentity,
			contentHash: identity.contentHash,
		}),
	};
}

function sameSource(
	left: CanonicalMailboxSalesRequestPreviewSource,
	right: CanonicalMailboxSalesRequestPreviewSource,
) {
	return (
		left.modelInput === right.modelInput &&
		left.identity.queueIdentity === right.identity.queueIdentity &&
		left.identity.snapshotIdentity === right.identity.snapshotIdentity &&
		left.identity.contentHash === right.identity.contentHash
	);
}

function throwIfAborted(signal: AbortSignal) {
	if (signal.aborted) signal.throwIfAborted();
}

/**
 * Converts one authorized, persisted mailbox queue item into the existing
 * review-only Sales Request preview. It never writes Sales or returns mailbox
 * model input/identity; the native preview result remains the sole output.
 */
export async function createSalesRequestMailboxPreview(
	input: SalesRequestMailboxPreviewInput,
	dependencies: SalesRequestMailboxPreviewDependencies,
) {
	assertInput(input);
	throwIfAborted(input.signal);

	const first = normalizeSource(
		await dependencies.resolveAuthorizedQueue({
			actorUserId: input.actorUserId,
			queueIdentity: input.queueIdentity,
			type: input.type,
			signal: input.signal,
		}),
		input.queueIdentity,
	);
	throwIfAborted(input.signal);
	const previewDependencies = dependencies.createPreviewDependencies({
		actorUserId: input.actorUserId,
		type: input.type,
		queueIdentity: first.identity.queueIdentity,
	});
	let snapshotReads = 0;
	const readSnapshot = async () => {
		const snapshot = await previewDependencies.readSnapshot();
		snapshotReads += 1;
		if (snapshotReads > 1) {
			throwIfAborted(input.signal);
			const current = normalizeSource(
				await dependencies.resolveAuthorizedQueue({
					actorUserId: input.actorUserId,
					queueIdentity: input.queueIdentity,
					type: input.type,
					signal: input.signal,
				}),
				input.queueIdentity,
				true,
			);
			throwIfAborted(input.signal);
			if (!sameSource(first, current)) {
				throw new SalesRequestMailboxPreviewError("stale");
			}
		}
		return snapshot;
	};
	return createSalesRequestPreview(
		{
			text: first.modelInput,
			groundingText: first.groundingText,
			images: [],
			signal: input.signal,
		},
		{ ...previewDependencies, readSnapshot },
	);
}
