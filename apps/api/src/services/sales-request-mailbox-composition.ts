import { db } from "@gnd/db";
import {
	createPrismaSalesRequestMailboxInboxReader,
	createPrismaSalesRequestMailboxPreviewSourceResolver,
	createSalesRequestMailboxAuthorityResolvers,
	createSalesRequestMailboxLifecycleStores,
} from "@gnd/db/queries";
import {
	type MailboxConnectionLifecycleDependencies,
	createMailboxEnvironmentKeyRing,
	createSalesRequestMailboxAdaptersFromEnvironment,
	deriveMailboxInboxCursorKey,
	mailboxConnectionStateSchema,
	mailboxHealthStatusSchema,
	mailboxProviderSchema,
} from "@gnd/sales-request-mailbox";
import { getSalesRequestMailboxPolicy } from "@gnd/settings";
import type { SalesRequestMailboxApiDependencies } from "./sales-request-mailbox-api";
import {
	authorizeSalesRequestPreview,
	createSalesRequestPreviewDependencies,
} from "./sales-request-preview-dependencies";

type ConfiguredMailbox = {
	dependencies: SalesRequestMailboxApiDependencies;
	completeConnection: MailboxConnectionLifecycleDependencies;
};

let configuredMailbox: ConfiguredMailbox | undefined;

function sameAuthority(
	connection: {
		ownerUserId: number;
		organizationId: number;
		employeeProfileId: number;
		officeAuthorityKey: string;
		authorityRevision: string;
		salesSettingsId: number;
		salesSettingsRevision: number;
		policyRevision: number;
	},
	current: {
		ownerUserId: number;
		organizationId: number;
		employeeProfileId: number;
		officeAuthorityKey: string;
		authorityRevision: string;
		salesSettingsId: number;
		salesSettingsRevision: number;
		policyRevision: number;
		providerEligible: boolean;
	},
) {
	return (
		current.providerEligible &&
		connection.ownerUserId === current.ownerUserId &&
		connection.organizationId === current.organizationId &&
		connection.employeeProfileId === current.employeeProfileId &&
		connection.officeAuthorityKey === current.officeAuthorityKey &&
		connection.authorityRevision === current.authorityRevision &&
		connection.salesSettingsId === current.salesSettingsId &&
		connection.salesSettingsRevision === current.salesSettingsRevision &&
		connection.policyRevision === current.policyRevision
	);
}

function configure(): ConfiguredMailbox {
	const providers = createSalesRequestMailboxAdaptersFromEnvironment(
		process.env,
		{
			fetch: globalThis.fetch,
		},
	);
	const keyRing = createMailboxEnvironmentKeyRing(process.env);
	const authority = createSalesRequestMailboxAuthorityResolvers({
		readPolicy: (tx, settingId) => getSalesRequestMailboxPolicy(tx, settingId),
	});
	const lifecycle = createSalesRequestMailboxLifecycleStores(db, {
		resolveAuthority: authority.resolvePersistenceAuthority,
	});
	const connectionLifecycle = {
		store: lifecycle.connection,
		adapters: providers.adapters,
		keyRing,
	};
	const inbox = createPrismaSalesRequestMailboxInboxReader(
		db,
		deriveMailboxInboxCursorKey(keyRing),
		{ resolveAuthority: authority.resolveContentAuthority },
	);
	const resolveAuthorizedQueue =
		createPrismaSalesRequestMailboxPreviewSourceResolver(db, {
			resolveAuthority: authority.resolveContentAuthority,
		});

	const dependencies: SalesRequestMailboxApiDependencies = {
		readConnections: async ({ actorUserId }) => {
			const rows = await db.salesRequestMailboxConnection.findMany({
				where: { ownerUserId: actorUserId },
				select: {
					id: true,
					provider: true,
					accountEmail: true,
					displayName: true,
					state: true,
					healthStatus: true,
					revision: true,
					lastSyncAt: true,
				},
				orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
				take: 100,
			});
			return rows.map((row) => ({
				connectionId: row.id,
				provider: mailboxProviderSchema.parse(row.provider),
				accountEmail: row.accountEmail,
				displayName: row.displayName,
				state: mailboxConnectionStateSchema.parse(row.state),
				healthStatus: mailboxHealthStatusSchema.parse(row.healthStatus),
				revision: row.revision,
				lastSyncAt: row.lastSyncAt,
			}));
		},
		connectionLifecycle,
		resolveInboxAuthority: async ({ actorUserId, connectionId }) =>
			db.$transaction(async (tx) => {
				const connection = await tx.salesRequestMailboxConnection.findUnique({
					where: { id: connectionId },
				});
				if (
					!connection ||
					connection.ownerUserId !== actorUserId ||
					(connection.provider !== "gmail" &&
						connection.provider !== "microsoft-graph")
				) {
					return { kind: "unavailable" } as const;
				}
				const resolved = await authority.resolvePersistenceAuthority(tx, {
					actorUserId,
					provider: connection.provider,
					now: new Date(),
					purpose: "token-health",
				});
				if (
					resolved.kind !== "authorized" ||
					!sameAuthority(connection, resolved.authority)
				) {
					return { kind: "unavailable" } as const;
				}
				return {
					kind: "authorized",
					authority: {
						connectionId: connection.id,
						ownerUserId: connection.ownerUserId,
						organizationId: connection.organizationId,
						officeAuthorityKey: connection.officeAuthorityKey,
						connectionRevision: connection.revision,
						authorityRevision: connection.authorityRevision,
						policyRevision: connection.policyRevision,
					},
				} as const;
			}),
		inbox: {
			list: ({ actorUserId, connectionId, authority: current, request }) =>
				inbox.list({
					actorUserId,
					organizationId: current.organizationId,
					connectionId,
					request,
				}),
			detail: ({
				actorUserId,
				connectionId,
				authority: current,
				queueIdentity,
			}) =>
				inbox.detail({
					actorUserId,
					organizationId: current.organizationId,
					connectionId,
					queueIdentity,
				}),
		},
		authorizePreview: ({ actorUserId, type }) =>
			authorizeSalesRequestPreview({ db, userId: actorUserId, type }),
		preview: {
			resolveAuthorizedQueue,
			createPreviewDependencies: ({ actorUserId, type }) =>
				createSalesRequestPreviewDependencies({
					db,
					userId: actorUserId,
					type,
				}),
		},
		disconnectLifecycle: {
			store: lifecycle.disconnect,
			adapters: providers.adapters,
			keyRing,
		},
	};

	return { dependencies, completeConnection: connectionLifecycle };
}

/** Lazily validates mailbox credentials and encryption on the first mailbox action. */
export function getConfiguredSalesRequestMailbox() {
	configuredMailbox ??= configure();
	return configuredMailbox;
}
