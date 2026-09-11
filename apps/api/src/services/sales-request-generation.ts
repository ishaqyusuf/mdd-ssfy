import {
	type NewSalesFormSeed,
	newSalesFormSeedSchema,
} from "@gnd/sales/sales-form-core";
import { isComponentVisibleByRules } from "@gnd/sales/sales-form/domain/step-engine";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { prepareSalesRequestImages } from "./sales-request-images";
export {
	createSalesRequestProvider,
	getSalesRequestProviderApiKey,
	SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER,
	SalesRequestProviderConfigurationError,
} from "./sales-request-provider";
export type {
	SalesRequestProvider,
	SalesRequestProviderInput,
	SalesRequestProviderResult,
} from "./sales-request-provider";
import type {
	SalesRequestProvider,
	SalesRequestProviderInput,
} from "./sales-request-provider";

type ModelConfiguration = {
	serviceNames?: string[];
	routes: Array<{
		itemTypeUid: string;
		rootStepId: number;
		stepUids: string[];
	}>;
	steps: Array<{
		id: number;
		uid: string;
		custom?: true;
		selectionMode?: "single" | "multiple";
		components: Array<[string, string]>;
	}>;
	visibilityByComponentUid: Record<string, unknown>;
};

function comparableSourceText(value: string) {
	return value
		.normalize("NFKC")
		.toLocaleUpperCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function requireSourceGrounding(
	sourceText: string,
	value: string,
	label: string,
) {
	const source = comparableSourceText(sourceText);
	const candidate = comparableSourceText(value);
	if (!candidate || !source.includes(candidate)) {
		throw new Error(`${label} must be stated in the customer request.`);
	}
}

function sourceStatesDeliveryOption(
	sourceText: string,
	option: "pickup" | "delivery",
) {
	const source = comparableSourceText(sourceText);
	return option === "delivery"
		? /\b(?:DELIVERY|DELIVER|DELIVERED|SHIPPING|SHIP|FREIGHT|ENTREGA|ENVIO|ENVIAR)\b/.test(
				source,
			)
		: /\b(?:PICKUP|PICK UP|COLLECT|COLLECTION|RECOGER|RECOGIDA)\b/.test(source);
}

function sourceStatesAmount(sourceText: string, amount: number) {
	const plain = String(amount);
	const fixed = amount.toFixed(2);
	const source = sourceText.replace(/,/g, "");
	return new RegExp(
		`(?:^|[^\\d])(?:${plain.replace(".", "\\.")}|${fixed.replace(".", "\\.")})(?:[^\\d]|$)`,
	).test(source);
}

type ValidatedSeedStep =
	| { stepId: number; prodUid: string }
	| { stepId: number; meta: { selectedProdUids: string[] } }
	| { stepId: number; value: string };

function parseModelConfiguration(
	configurationJson: string,
): ModelConfiguration {
	let value: unknown;
	try {
		value = JSON.parse(configurationJson);
	} catch {
		throw new Error("The sales request configuration is invalid.");
	}
	if (!value || typeof value !== "object")
		throw new Error("The sales request configuration is invalid.");
	const candidate = value as Partial<ModelConfiguration>;
	if (
		!Array.isArray(candidate.routes) ||
		!Array.isArray(candidate.steps) ||
		!candidate.visibilityByComponentUid ||
		typeof candidate.visibilityByComponentUid !== "object" ||
		Array.isArray(candidate.visibilityByComponentUid)
	)
		throw new Error("The sales request configuration is invalid.");
	return candidate as ModelConfiguration;
}

/** Reject model-invented IDs before a native form seed reaches the caller. */
export function validateNewSalesFormSeedConfiguration(
	seed: NewSalesFormSeed,
	configurationJson: string,
	sourceText = "",
): void {
	const configuration = parseModelConfiguration(configurationJson);
	const stepsById = new Map(configuration.steps.map((step) => [step.id, step]));
	const stepsByUid = new Map(
		configuration.steps.map((step) => [step.uid, step]),
	);

	for (const line of seed.lineItems) {
		const formSteps = line.formSteps as ValidatedSeedStep[];
		const rootMatches = configuration.routes.filter((route) => {
			const root = formSteps.find(
				(step) => step.stepId === route.rootStepId && "prodUid" in step,
			);
			return (
				root !== undefined &&
				"prodUid" in root &&
				root.prodUid === route.itemTypeUid
			);
		});
		if (rootMatches.length !== 1)
			throw new Error(
				`Line ${line.uid} must select exactly one configured item route.`,
			);
		const route = rootMatches[0];
		if (!route)
			throw new Error(`Line ${line.uid} has no configured item route.`);
		const rootStep = stepsById.get(route.rootStepId);
		const rootTitle = rootStep?.components.find(
			([uid]) => uid === route.itemTypeUid,
		)?.[1];
		const serviceRows =
			seed.schemaVersion === 2 && "meta" in line
				? line.meta?.serviceRows
				: undefined;
		if (serviceRows?.length) {
			if (!rootTitle || !/\bSERVICES?\b/i.test(rootTitle)) {
				throw new Error(
					`Line ${line.uid} places service rows outside a Services route.`,
				);
			}
			for (const row of serviceRows) {
				if (
					/^(?:DELIVERY|SHIPPING|FREIGHT|PICK ?UP|TRANSPORT(?:ATION)?)$/i.test(
						row.service.trim(),
					)
				) {
					throw new Error(
						"Delivery and transport must use the native delivery fields, not a service row.",
					);
				}
				requireSourceGrounding(
					sourceText,
					row.service,
					`Service ${row.service}`,
				);
			}
		}
		const allowedStepIds = new Set([
			route.rootStepId,
			...route.stepUids.map((uid) => stepsByUid.get(uid)?.id),
		]);
		const selectionByStepId = new Map(
			formSteps.map((selection) => [selection.stepId, selection] as const),
		);
		for (const selection of formSteps) {
			const step = stepsById.get(selection.stepId);
			if (!step || !allowedStepIds.has(selection.stepId))
				throw new Error(
					`Line ${line.uid} references a step outside its configured route.`,
				);
			if ("value" in selection) {
				if (step.custom !== true) {
					throw new Error(
						`Line ${line.uid} uses a custom value on a step that does not allow custom values.`,
					);
				}
				const normalizedValue = selection.value
					.trim()
					.replace(/\s+/g, " ")
					.toLocaleUpperCase();
				const exactStandard = step.components.find(
					([, title]) =>
						title.trim().replace(/\s+/g, " ").toLocaleUpperCase() ===
						normalizedValue,
				);
				if (exactStandard) {
					throw new Error(
						`Line ${line.uid} custom value matches standard component ${exactStandard[0]}; use its UID.`,
					);
				}
				requireSourceGrounding(
					sourceText,
					selection.value,
					`Custom value ${selection.value}`,
				);
				continue;
			}
			const selectedProdUids =
				"prodUid" in selection
					? [selection.prodUid]
					: selection.meta.selectedProdUids;
			const isMulti = "meta" in selection;
			if (isMulti !== (step.selectionMode === "multiple"))
				throw new Error(
					`Line ${line.uid} uses the wrong selection shape for step ${selection.stepId}.`,
				);
			const candidateUids = new Set(step.components.map(([uid]) => uid));
			if (selectedProdUids.some((uid) => !candidateUids.has(uid)))
				throw new Error(
					`Line ${line.uid} references an unavailable component for step ${selection.stepId}.`,
				);
		}

		const selectedByStepUid: Record<string, string> = {};
		const selectedProdUidsByStepUid: Record<string, string[]> = {};
		const orderedStepIds = [
			route.rootStepId,
			...route.stepUids.map((uid) => stepsByUid.get(uid)?.id),
		].filter((id): id is number => id !== undefined);
		for (const orderedStepId of orderedStepIds) {
			const selection = selectionByStepId.get(orderedStepId);
			if (!selection) continue;
			const step = stepsById.get(orderedStepId);
			if (!step) continue;
			if ("value" in selection) continue;
			const selectedProdUids =
				"prodUid" in selection
					? [selection.prodUid]
					: selection.meta.selectedProdUids;
			for (const uid of selectedProdUids) {
				const visibility = configuration.visibilityByComponentUid[uid];
				if (
					visibility &&
					!isComponentVisibleByRules(
						visibility,
						selectedByStepUid,
						selectedProdUidsByStepUid,
					)
				) {
					throw new Error(
						`Line ${line.uid} selects a component hidden by configured rules for step ${selection.stepId}.`,
					);
				}
			}
			selectedProdUidsByStepUid[step.uid] = selectedProdUids;
			const first = selectedProdUids[0];
			if (first) selectedByStepUid[step.uid] = first;
		}
		// Recheck the completed combination as well: an earlier `isNot` rule can
		// become false only after a later optional selection is known.
		for (const selection of formSteps) {
			if ("value" in selection) continue;
			const selectedProdUids =
				"prodUid" in selection
					? [selection.prodUid]
					: selection.meta.selectedProdUids;
			for (const uid of selectedProdUids) {
				const visibility = configuration.visibilityByComponentUid[uid];
				if (
					visibility &&
					!isComponentVisibleByRules(
						visibility,
						selectedByStepUid,
						selectedProdUidsByStepUid,
					)
				) {
					throw new Error(
						`Line ${line.uid} selects a component hidden by the completed configured rules for step ${selection.stepId}.`,
					);
				}
			}
		}
	}

	if (seed.schemaVersion === 2 && seed.form) {
		if (!sourceStatesDeliveryOption(sourceText, seed.form.deliveryOption)) {
			throw new Error(
				`Delivery option ${seed.form.deliveryOption} must be stated in the customer request.`,
			);
		}
		const deliveryCost = seed.extraCosts?.[0];
		if (deliveryCost && !sourceStatesAmount(sourceText, deliveryCost.amount)) {
			throw new Error(
				"The delivery amount must be stated in the customer request.",
			);
		}
	}
}

export async function generateNewSalesFormSeed(
	input: SalesRequestProviderInput & { configurationRevision: string },
	provider: SalesRequestProvider,
) {
	const signal = AbortSignal.any([input.signal, AbortSignal.timeout(45_000)]);
	signal.throwIfAborted();
	const images = await prepareSalesRequestImages(input.images);
	signal.throwIfAborted();
	let generated: Awaited<ReturnType<SalesRequestProvider>>;
	try {
		generated = await provider({ ...input, images, signal });
	} catch {
		signal.throwIfAborted();
		throw new Error(
			"The AI provider could not generate a request preview. Try again.",
		);
	}
	signal.throwIfAborted();
	const parsed = newSalesFormSeedSchema.safeParse(generated.output);
	if (!parsed.success) {
		throw new Error(
			"The AI response did not match the new sales form seed format. Try again or review the request.",
		);
	}
	validateNewSalesFormSeedConfiguration(
		parsed.data,
		input.configurationJson,
		input.text,
	);
	return {
		seed: parsed.data,
		configurationRevision: input.configurationRevision,
		promptVersion: SALES_REQUEST_PROMPT_VERSION,
		provider: generated.provider,
		model: generated.model,
		usage: {
			inputTokens: generated.inputTokens,
			outputTokens: generated.outputTokens,
		},
	};
}
