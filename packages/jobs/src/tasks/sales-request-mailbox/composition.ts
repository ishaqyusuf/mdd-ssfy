import type { Database } from "@gnd/db";
import {
	createPrismaSalesRequestMailboxJobWorkStore,
	createPrismaSalesRequestMailboxMessageDetailStore,
	createPrismaSalesRequestMailboxRetentionStore,
	createPrismaSalesRequestMailboxSyncStore,
	createSalesRequestMailboxAuthorityResolvers,
	createSalesRequestMailboxLifecycleStores,
} from "@gnd/db/queries";
import {
	createMailboxEnvironmentKeyRing,
	createSalesRequestMailboxAdaptersFromEnvironment,
} from "@gnd/sales-request-mailbox";
import { getSalesRequestMailboxPolicy } from "@gnd/settings";
import { createSalesRequestMailboxJobRuntime } from "./runtime";

type MailboxEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Creates the provider/runtime graph without performing provider I/O. Environment
 * validation is delayed until a job actually requests this composition.
 */
export function createConfiguredSalesRequestMailboxJobRuntime(input: {
	db: Database;
	environment: MailboxEnvironment;
	fetch: typeof globalThis.fetch;
}) {
	const providers = createSalesRequestMailboxAdaptersFromEnvironment(
		input.environment,
		{ fetch: input.fetch },
	);
	const keyRing = createMailboxEnvironmentKeyRing(input.environment);
	const authority = createSalesRequestMailboxAuthorityResolvers({
		readPolicy: (tx, settingId) => getSalesRequestMailboxPolicy(tx, settingId),
	});
	const lifecycle = createSalesRequestMailboxLifecycleStores(input.db, {
		resolveAuthority: authority.resolvePersistenceAuthority,
	});
	const contentDependencies = {
		resolveAuthority: authority.resolveContentAuthority,
		keyRing,
	};

	return createSalesRequestMailboxJobRuntime({
		work: createPrismaSalesRequestMailboxJobWorkStore(input.db),
		sync: {
			store: createPrismaSalesRequestMailboxSyncStore(
				input.db,
				contentDependencies,
			),
			adapters: providers.adapters,
		},
		detail: {
			store: createPrismaSalesRequestMailboxMessageDetailStore(
				input.db,
				contentDependencies,
			),
			adapters: providers.adapters,
		},
		tokenHealth: {
			store: lifecycle.tokenHealth,
			adapters: providers.adapters,
			keyRing,
		},
		disconnect: {
			store: lifecycle.disconnect,
			adapters: providers.adapters,
			keyRing,
		},
		retention: createPrismaSalesRequestMailboxRetentionStore(input.db),
	});
}
