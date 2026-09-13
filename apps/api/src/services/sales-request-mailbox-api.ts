import {
	type SalesRequestMailboxInboxAuthority,
	salesRequestMailboxBeginConnectSchema,
	salesRequestMailboxConnectionStartResultSchema,
	salesRequestMailboxConnectionStatusSchema,
	salesRequestMailboxConnectionsSchema,
	salesRequestMailboxDisconnectResultSchema,
	salesRequestMailboxDisconnectSchema,
	salesRequestMailboxInboxAuthoritySchema,
	salesRequestMailboxInboxDetailSchema,
	salesRequestMailboxInboxListSchema,
	salesRequestMailboxPreviewSchema,
} from "@api/schemas/sales-request-mailbox";
import { AppError } from "@gnd/errors";
import {
	type MailboxConnectionState,
	type MailboxDisconnectDependencies,
	type MailboxHealthStatus,
	type MailboxInboxDetail,
	type MailboxInboxPageRequest,
	type MailboxInboxPageResult,
	type MailboxProvider,
	type StartMailboxConnectionResult,
	disconnectMailboxConnection,
	projectMailboxInboxDetail,
	projectMailboxInboxPage,
	startMailboxConnection,
} from "@gnd/sales-request-mailbox";
import {
	type SalesRequestMailboxPreviewDependencies,
	SalesRequestMailboxPreviewError,
	type SalesRequestMailboxPreviewInput,
	createSalesRequestMailboxPreview,
} from "./sales-request-mailbox-preview";

const MAILBOX_CONNECTION_REDIRECT_KEY = "sales-request-inbox" as const;
export type SalesRequestMailboxConnectionStartDependencies = Parameters<
	typeof startMailboxConnection
>[1];

export type SalesRequestMailboxConnectionStatusSource = {
	connectionId: string;
	provider: MailboxProvider;
	accountEmail: string | null;
	displayName?: string | null;
	state: MailboxConnectionState;
	healthStatus: MailboxHealthStatus;
	revision: number;
	lastSyncAt?: Date | null;
};

export type SalesRequestMailboxConnectionStatus = {
	connectionId: string;
	provider: MailboxProvider;
	accountEmail: string | null;
	displayName: string | null;
	state: MailboxConnectionState;
	healthStatus: MailboxHealthStatus;
	revision: number;
	lastSyncAt: Date | null;
};

export type SalesRequestMailboxInboxAuthorityResolution =
	| {
			kind: "authorized";
			authority: SalesRequestMailboxInboxAuthority;
	  }
	| { kind: "unavailable" };

export type SalesRequestMailboxInboxReader = {
	/**
	 * The authority is resolved on the server from the authenticated actor. The
	 * adapter must consume its revision fence and still fail closed if it is
	 * stale; callers cannot provide an organization or office ID.
	 */
	list: (input: {
		actorUserId: number;
		connectionId: string;
		authority: SalesRequestMailboxInboxAuthority;
		request: MailboxInboxPageRequest;
	}) => Promise<MailboxInboxPageResult>;
	/** The adapter must return the same opaque not-found boundary for wrong owners. */
	detail: (input: {
		actorUserId: number;
		connectionId: string;
		authority: SalesRequestMailboxInboxAuthority;
		queueIdentity: string;
	}) => Promise<MailboxInboxDetail>;
};

export type SalesRequestMailboxApiDependencies = {
	/** Returns owner-scoped connection status rows; no credentials are accepted. */
	readConnections: (input: {
		actorUserId: number;
	}) => Promise<readonly SalesRequestMailboxConnectionStatusSource[]>;
	/**
	 * Build this with the package lifecycle store and the same current-authority
	 * resolver used by mailbox jobs. The resolver must recheck active employee,
	 * profile, canonical office, Sales Settings, and mailbox policy for connect
	 * and disconnect; this API must not derive those facts from client input.
	 */
	connectionLifecycle: SalesRequestMailboxConnectionStartDependencies;
	inbox: SalesRequestMailboxInboxReader;
	/** Resolves current owner/office/policy authority; never trust client org input. */
	resolveInboxAuthority: (input: {
		actorUserId: number;
		connectionId: string;
	}) => Promise<SalesRequestMailboxInboxAuthorityResolution>;
	/** Explicit policy gate that runs before queue resolution or provider access. */
	authorizePreview: (input: {
		actorUserId: number;
		queueIdentity: string;
		type: SalesRequestMailboxPreviewInput["type"];
		signal: AbortSignal;
	}) => Promise<void>;
	preview: SalesRequestMailboxPreviewDependencies;
	disconnectLifecycle: MailboxDisconnectDependencies;
};

function assertActor(actorUserId: number) {
	if (!Number.isSafeInteger(actorUserId) || actorUserId < 1) {
		throw new AppError({
			code: "AUTHENTICATION_REQUIRED",
			internalMessage: "Invalid mailbox API actor.",
			reportable: false,
		});
	}
}

const MAILBOX_UNAVAILABLE_MESSAGE = "The mailbox request is unavailable.";
const MAILBOX_STALE_MESSAGE =
	"The mailbox request changed while the preview was being generated. Generate it again.";

function mailboxNotFoundError(cause: unknown, operation: string): AppError {
	return new AppError({
		cause,
		code: "NOT_FOUND",
		internalMessage: "Mailbox resource is unavailable.",
		operation,
		publicMessage: MAILBOX_UNAVAILABLE_MESSAGE,
		reportable: false,
	});
}

function mailboxConflictError(cause: unknown, operation: string): AppError {
	return new AppError({
		cause,
		code: "CONFLICT",
		internalMessage: "Mailbox preview source changed.",
		operation,
		publicMessage: MAILBOX_STALE_MESSAGE,
		reportable: false,
	});
}

function providerUnavailableError(cause: unknown, operation: string): AppError {
	return new AppError({
		cause,
		code: "PROVIDER_UNAVAILABLE",
		internalMessage: "Mailbox provider returned an invalid authorization URL.",
		operation,
		reportable: true,
	});
}

function unexpectedMailboxError(cause: unknown, operation: string): AppError {
	return new AppError({
		cause,
		code: "UNEXPECTED",
		internalMessage: "Mailbox API adapter returned an invalid result.",
		operation,
		reportable: true,
	});
}

function isZodError(error: unknown) {
	return error instanceof Error && error.name === "ZodError";
}

/**
 * Expected adapter/lifecycle failures are converted to opaque application
 * errors. Ownership, organization, provider IDs, and internal error text do
 * not cross the tRPC boundary.
 */
function throwMailboxError(error: unknown, operation: string): never {
	if (error instanceof AppError) throw error;
	if (error instanceof SalesRequestMailboxPreviewError) {
		if (error.reason === "stale") {
			throw mailboxConflictError(error, operation);
		}
		throw mailboxNotFoundError(error, operation);
	}
	if (error instanceof Error) {
		switch (error.message) {
			case "mailbox-inbox-unavailable":
			case "mailbox-inbox-item-unavailable":
			case "mailbox-preview-unavailable":
				throw mailboxNotFoundError(error, operation);
			case "mailbox-inbox-cursor-invalid":
				throw new AppError({
					cause: error,
					code: "VALIDATION_FAILED",
					internalMessage: "Mailbox cursor is invalid.",
					operation,
					reportable: false,
				});
		}
		if (isZodError(error)) {
			throw unexpectedMailboxError(error, operation);
		}
	}
	throw error;
}

function projectConnectionStatus(
	source: SalesRequestMailboxConnectionStatusSource,
): SalesRequestMailboxConnectionStatus {
	return salesRequestMailboxConnectionStatusSchema.parse({
		connectionId: source.connectionId,
		provider: source.provider,
		accountEmail: source.accountEmail ?? null,
		displayName: source.displayName ?? null,
		state: source.state,
		healthStatus: source.healthStatus,
		revision: source.revision,
		lastSyncAt: source.lastSyncAt ?? null,
	});
}

function projectConnections(
	sources: readonly SalesRequestMailboxConnectionStatusSource[],
) {
	return salesRequestMailboxConnectionsSchema.parse({
		items: sources.map(projectConnectionStatus),
	});
}

export type SalesRequestMailboxApi = ReturnType<
	typeof createSalesRequestMailboxApi
>;

/**
 * API composition boundary for the mailbox MVP. Persistence, provider adapters,
 * and current-authority resolution remain injected so this layer cannot bypass
 * the package-owned lifecycle or accidentally acquire a second data path.
 */
export function createSalesRequestMailboxApi(
	dependencies: SalesRequestMailboxApiDependencies,
) {
	return {
		async listConnections(input: { actorUserId: number }) {
			assertActor(input.actorUserId);
			try {
				return projectConnections(
					await dependencies.readConnections({
						actorUserId: input.actorUserId,
					}),
				);
			} catch (error) {
				throwMailboxError(error, "salesRequestMailbox.listConnections");
			}
		},

		async beginConnect(input: {
			actorUserId: number;
			provider: MailboxProvider;
		}) {
			assertActor(input.actorUserId);
			const { actorUserId, ...requestInput } = input;
			const parsed = salesRequestMailboxBeginConnectSchema.parse(requestInput);
			let result: StartMailboxConnectionResult;
			try {
				result = await startMailboxConnection(
					{
						actorUserId,
						provider: parsed.provider,
						redirectKey: MAILBOX_CONNECTION_REDIRECT_KEY,
					},
					dependencies.connectionLifecycle,
				);
			} catch (error) {
				throwMailboxError(error, "salesRequestMailbox.beginConnect");
			}
			try {
				return salesRequestMailboxConnectionStartResultSchema.parse(result);
			} catch (error) {
				throw providerUnavailableError(
					error,
					"salesRequestMailbox.beginConnect",
				);
			}
		},

		async listInbox(
			input: {
				actorUserId: number;
				connectionId: string;
			} & Partial<MailboxInboxPageRequest>,
		) {
			assertActor(input.actorUserId);
			const { actorUserId, ...requestInput } = input;
			const parsed = salesRequestMailboxInboxListSchema.parse(requestInput);
			const { connectionId, ...request } = parsed;
			const authority = await resolveInboxAuthority({
				actorUserId,
				connectionId,
			});
			try {
				return projectMailboxInboxPage(
					await dependencies.inbox.list({
						actorUserId,
						connectionId,
						authority,
						request,
					}),
				);
			} catch (error) {
				throwMailboxError(error, "salesRequestMailbox.listInbox");
			}
		},

		async getInboxDetail(input: {
			actorUserId: number;
			connectionId: string;
			queueIdentity: string;
		}) {
			assertActor(input.actorUserId);
			const { actorUserId, ...requestInput } = input;
			const parsed = salesRequestMailboxInboxDetailSchema.parse(requestInput);
			const authority = await resolveInboxAuthority({
				actorUserId,
				connectionId: parsed.connectionId,
			});
			try {
				const projected = projectMailboxInboxDetail(
					await dependencies.inbox.detail({
						actorUserId,
						connectionId: parsed.connectionId,
						authority,
						queueIdentity: parsed.queueIdentity,
					}),
				);
				if (projected.queueIdentity !== parsed.queueIdentity) {
					throw mailboxNotFoundError(
						new Error("mailbox-inbox-queue-mismatch"),
						"salesRequestMailbox.getInboxDetail",
					);
				}
				return projected;
			} catch (error) {
				throwMailboxError(error, "salesRequestMailbox.getInboxDetail");
			}
		},

		async generatePreview(input: SalesRequestMailboxPreviewInput) {
			assertActor(input.actorUserId);
			const { actorUserId, signal, ...requestInput } = input;
			if (!(signal instanceof AbortSignal)) {
				throw new AppError({
					code: "VALIDATION_FAILED",
					internalMessage: "Invalid mailbox API cancellation signal.",
					reportable: false,
				});
			}
			const parsed = salesRequestMailboxPreviewSchema.parse(requestInput);
			signal.throwIfAborted();
			try {
				await dependencies.authorizePreview({
					actorUserId,
					queueIdentity: parsed.queueIdentity,
					type: parsed.type,
					signal,
				});
				signal.throwIfAborted();
				return await createSalesRequestMailboxPreview(
					{
						actorUserId,
						queueIdentity: parsed.queueIdentity,
						type: parsed.type,
						signal,
					},
					dependencies.preview,
				);
			} catch (error) {
				throwMailboxError(error, "salesRequestMailbox.generatePreview");
			}
		},

		async disconnect(input: {
			actorUserId: number;
			connectionId: string;
			expectedConnectionRevision: number;
			signal?: AbortSignal;
		}) {
			assertActor(input.actorUserId);
			const { actorUserId, signal, ...requestInput } = input;
			const parsed = salesRequestMailboxDisconnectSchema.parse(requestInput);
			try {
				const result = await disconnectMailboxConnection(
					{
						actorUserId,
						...parsed,
						signal,
					},
					dependencies.disconnectLifecycle,
				);
				return salesRequestMailboxDisconnectResultSchema.parse(result);
			} catch (error) {
				throwMailboxError(error, "salesRequestMailbox.disconnect");
			}
		},
	};

	async function resolveInboxAuthority(input: {
		actorUserId: number;
		connectionId: string;
	}): Promise<SalesRequestMailboxInboxAuthority> {
		let resolved: SalesRequestMailboxInboxAuthorityResolution;
		try {
			resolved = await dependencies.resolveInboxAuthority(input);
		} catch (error) {
			throwMailboxError(error, "salesRequestMailbox.resolveInboxAuthority");
		}
		if (!resolved || resolved.kind !== "authorized") {
			throw mailboxNotFoundError(
				new Error("mailbox-inbox-authority-unavailable"),
				"salesRequestMailbox.resolveInboxAuthority",
			);
		}
		const authority = salesRequestMailboxInboxAuthoritySchema.safeParse(
			resolved.authority,
		);
		if (
			!authority.success ||
			authority.data.connectionId !== input.connectionId ||
			authority.data.ownerUserId !== input.actorUserId
		) {
			throw mailboxNotFoundError(
				new Error("mailbox-inbox-authority-invalid"),
				"salesRequestMailbox.resolveInboxAuthority",
			);
		}
		return authority.data;
	}
}
