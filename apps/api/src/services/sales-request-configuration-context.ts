import { createHash } from "node:crypto";
import {
	type SalesRequestConfigurationSnapshotOptions,
	getSalesRequestConfigurationSnapshot,
} from "@api/db/queries/sales-request-configuration";
import type { SalesRequestServiceVocabularyCache } from "@gnd/cache/sales-request-service-vocabulary-cache";
import { serializeSalesRequestConfiguration } from "@gnd/sales/sales-form/request-generation";
import { getSalesRequestServiceVocabulary } from "./sales-request-service-vocabulary";

type ContextDatabase = Parameters<
	typeof getSalesRequestConfigurationSnapshot
>[0] &
	Parameters<typeof getSalesRequestServiceVocabulary>[0];

export function attachSalesRequestServiceVocabulary<
	T extends Awaited<ReturnType<typeof getSalesRequestConfigurationSnapshot>>,
>(snapshot: T, serviceNames: string[]) {
	const configuration = { ...snapshot.configuration, serviceNames };
	const configurationJson = serializeSalesRequestConfiguration(configuration);
	return {
		...snapshot,
		configuration,
		configurationJson,
		revision: createHash("sha256").update(configurationJson).digest("hex"),
	};
}

/** One exact model context: structural catalog plus separately cached services. */
export async function getSalesRequestConfigurationContext(
	db: ContextDatabase,
	input: { settingId: number },
	options: SalesRequestConfigurationSnapshotOptions & {
		freshServiceVocabulary?: boolean;
		serviceVocabularyCache?: SalesRequestServiceVocabularyCache;
	} = {},
) {
	const [snapshot, vocabulary] = await Promise.all([
		getSalesRequestConfigurationSnapshot(db, input, options),
		getSalesRequestServiceVocabulary(db, {
			scope: `sales-settings:${input.settingId}`,
			fresh: options.freshServiceVocabulary,
			cache: options.serviceVocabularyCache,
		}),
	]);
	return {
		...attachSalesRequestServiceVocabulary(snapshot, vocabulary.names),
		serviceVocabularyRevision: vocabulary.revision,
	};
}
