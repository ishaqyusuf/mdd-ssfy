import type { SalesRequestAISelection } from "@gnd/settings";
import type { getSalesRequestConfigurationSnapshot } from "../db/queries/sales-request-configuration";
import {
	type SalesRequestProvider,
	generateNewSalesFormSeed,
} from "./sales-request-generation";
import type { SalesRequestImage } from "./sales-request-images";

type Snapshot = Awaited<
	ReturnType<typeof getSalesRequestConfigurationSnapshot>
>;
type PreviewContext = Snapshot & { aiSelection: SalesRequestAISelection };

export type SalesRequestPreviewSnapshotIdentity = Pick<
	Snapshot,
	"settingId" | "scope" | "revision"
>;

function assertCurrentSnapshot(
	expected: PreviewContext,
	current: PreviewContext,
) {
	if (
		current.settingId !== expected.settingId ||
		current.scope !== expected.scope ||
		current.revision !== expected.revision ||
		current.aiSelection.provider !== expected.aiSelection.provider ||
		current.aiSelection.model !== expected.aiSelection.model
	) {
		throw new Error(
			"Sales configuration changed during generation. Generate the preview again.",
		);
	}
}

/** Internal orchestration: authorize before reading catalog or invoking a paid model. */
export async function createSalesRequestPreview(
	input: {
		text: string;
		images: SalesRequestImage[];
		signal: AbortSignal;
	},
	dependencies: {
		authorize: () => Promise<void>;
		reserveUsage: () => Promise<void>;
		readSnapshot: () => Promise<PreviewContext>;
		createProvider: (
			selection: SalesRequestAISelection,
		) => SalesRequestProvider;
	},
) {
	await dependencies.authorize();
	input.signal.throwIfAborted();
	const snapshot = await dependencies.readSnapshot();
	const provider = dependencies.createProvider(snapshot.aiSelection);
	await dependencies.reserveUsage();
	const result = await generateNewSalesFormSeed(
		{
			...input,
			configurationJson: snapshot.configurationJson,
			configurationRevision: snapshot.revision,
		},
		provider,
	);

	const current = await dependencies.readSnapshot();
	input.signal.throwIfAborted();
	assertCurrentSnapshot(snapshot, current);
	return {
		...result,
		configurationScope: snapshot.scope,
	};
}

export function selectSalesRequestSettingId(activeIds: readonly number[]) {
	const selectedId = [...activeIds].sort((a, b) => a - b)[0];
	if (!selectedId)
		throw new Error("Active sales settings record is unavailable");
	return selectedId;
}
