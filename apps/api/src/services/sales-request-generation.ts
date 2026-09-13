import {
	type NewSalesFormSeed,
	deriveDoorSizeCandidates,
	newSalesFormSeedSchema,
	normalizeNewSalesFormSeed,
	parseMouldingPieceLength,
} from "@gnd/sales/sales-form-core";
import { isComponentVisibleByRules } from "@gnd/sales/sales-form/domain/step-engine";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { prepareSalesRequestImages } from "./sales-request-images";
export {
	createSalesRequestProvider,
	getSalesRequestProviderRuntimeOptions,
	getSalesRequestProviderApiKey,
	resolveSalesRequestProviderMaxRetries,
	SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER,
	SALES_REQUEST_DEFAULT_MAX_RETRIES,
	SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
	SALES_REQUEST_MAX_OUTPUT_TOKENS,
	SalesRequestProviderConfigurationError,
} from "./sales-request-provider";
export type {
	SalesRequestProvider,
	SalesRequestProviderFailureDiagnostic,
	SalesRequestProviderInput,
	SalesRequestProviderResult,
} from "./sales-request-provider";
import type {
	SalesRequestProvider,
	SalesRequestProviderFailureDiagnostic,
	SalesRequestProviderInput,
} from "./sales-request-provider";
import { classifySalesRequestProviderFailure } from "./sales-request-provider";

export const SALES_REQUEST_PROVIDER_TIMEOUT_MS = 45_000;

type ModelConfiguration = {
	serviceNames?: string[];
	routes: Array<{
		itemTypeUid: string;
		rootStepId: number;
		stepUids: string[];
		config?: {
			noHandle?: boolean;
			hasSwing?: boolean;
		};
	}>;
	steps: Array<{
		id: number;
		uid: string;
		title?: string;
		custom?: true;
		selectionMode?: "single" | "multiple";
		doorSizeVariation?: Array<{
			rules: Array<{
				stepUid: string;
				operator: "is" | "isNot";
				componentsUid: string[];
			}>;
			widthList: string[];
		}>;
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

function sourceNumberPattern(amount: number) {
	return Array.from(new Set([String(amount), amount.toFixed(2)]))
		.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("|");
}

function sourceStatesLinearFeet(sourceText: string, linearFeet: number) {
	const amount = sourceNumberPattern(linearFeet);
	const unit = "(?:LF|LINEAR\\s+(?:FEET|FOOT)|PIES?\\s+LINEALES?)";
	const source = sourceText.normalize("NFKC").replace(/,/g, "");
	return new RegExp(
		`(?:^|[^\\d])(?:${amount})\\s*${unit}\\b|\\b${unit}\\s*(?:${amount})(?:[^\\d]|$)`,
		"i",
	).test(source);
}

function sourceStatesMouldingPieceQuantity(
	sourceText: string,
	quantity: number,
) {
	const amount = sourceNumberPattern(quantity);
	const unit =
		"(?:PCS?|PIECES?|STRIPS?|BOARDS?|STICKS?|LENGTHS?|UNITS?|TIRAS?|TABLAS?|UNIDADES?)";
	const quantityLabel = "(?:QTY|QUANTITY|COUNT|CANTIDAD)";
	const source = sourceText.normalize("NFKC").replace(/,/g, "");
	return new RegExp(
		`(?:^|[^\\d])(?:${amount})\\s*${unit}\\b|\\b${unit}\\s*(?:[:=(x-]\\s*)?(?:${amount})(?:[^\\d]|$)|\\b${quantityLabel}\\s*[:=]?\\s*(?:${amount})(?:[^\\d]|$)|\\(\\s*(?:${amount})\\s*\\)|(?:^|\\n)\\s*(?:${amount})\\s*(?:[xX=–—-])`,
		"i",
	).test(source);
}

function sourceStatesWastePercentage(sourceText: string, waste: number) {
	const amount = sourceNumberPattern(waste);
	const wasteLabel = "(?:WASTE|WASTAGE|DESPERDICIO)";
	const source = sourceText.normalize("NFKC").replace(/,/g, "");
	return new RegExp(
		`(?:${amount})\\s*%\\s*${wasteLabel}|${wasteLabel}\\s*(?:OF\\s*)?(?:${amount})\\s*%`,
		"i",
	).test(source);
}

function sourceStatesAnyWastePercentage(sourceText: string) {
	const wasteLabel = "(?:WASTE|WASTAGE|DESPERDICIO)";
	const amount = "\\d+(?:\\.\\d+)?";
	return new RegExp(
		`(?:${amount})\\s*%\\s*${wasteLabel}|${wasteLabel}\\s*(?:OF\\s*)?(?:${amount})\\s*%`,
		"i",
	).test(sourceText.normalize("NFKC").replace(/,/g, ""));
}

function mouldingSourceSegments(
	sourceText: string,
	title: string,
	allTitles: readonly string[],
) {
	const comparableTitle = comparableSourceText(title);
	const titleTokens = comparableTitle.split(" ");
	const uniqueIdentifiers = titleTokens.filter((token) => {
		if (token.length < 4 || !/[\p{L}]/u.test(token) || !/[\p{N}]/u.test(token))
			return false;
		return (
			allTitles.filter((candidateTitle) =>
				comparableSourceText(candidateTitle).split(" ").includes(token),
			).length === 1
		);
	});
	return sourceText
		.split(/\r?\n|;|\s+(?:and|y)\s+(?=\d)/i)
		.filter((segment) => {
			const comparableSegment = comparableSourceText(segment);
			if (comparableSegment.includes(comparableTitle)) return true;
			const segmentTokens = new Set(comparableSegment.split(" "));
			return uniqueIdentifiers.some((identifier) =>
				segmentTokens.has(identifier),
			);
		})
		.join("\n");
}

function dimensionPartInches(value: string) {
	const normalized = value.trim().replace(/\s+/g, "");
	const architectural = normalized.match(/^(\d+)[\-/](\d+)$/);
	if (architectural) {
		return Number(architectural[1]) * 12 + Number(architectural[2]);
	}
	const inches = Number(normalized);
	return Number.isFinite(inches) ? inches : null;
}

function dimensionKey(value: string) {
	const normalized = value
		.replace(/["”']/g, "")
		.trim()
		.split(/\s*[x×]\s*/i);
	if (normalized.length !== 2) return null;
	const width = dimensionPartInches(normalized[0] || "");
	const height = dimensionPartInches(normalized[1] || "");
	return width == null || height == null ? null : `${width}:${height}`;
}

function sourceDimensionKeys(sourceText: string) {
	const keys = new Set<string>();
	const matches = sourceText.matchAll(
		/(\d+(?:\s*[-/]\s*\d+)?)\s*(?:["”'])?\s*[x×]\s*(\d+(?:\s*[-/]\s*\d+)?)\s*(?:["”'])?/gi,
	);
	for (const match of matches) {
		const key = dimensionKey(`${match[1]} x ${match[2]}`);
		if (key) keys.add(key);
	}
	return keys;
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
): NewSalesFormSeed {
	const normalizedSeed = structuredClone(seed);
	const configuration = parseModelConfiguration(configurationJson);
	const stepsById = new Map(configuration.steps.map((step) => [step.id, step]));
	const stepsByUid = new Map(
		configuration.steps.map((step) => [step.uid, step]),
	);

	const statedDimensionKeys = sourceDimensionKeys(sourceText);
	for (const line of normalizedSeed.lineItems) {
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
		const mouldingRows =
			seed.schemaVersion === 2 && "meta" in line
				? line.meta?.mouldingRows
				: undefined;
		if (mouldingRows?.length) {
			if (!rootTitle || !/^(?:MOULDING|MOLDING)S?$/i.test(rootTitle.trim())) {
				throw new Error(
					`Line ${line.uid} places moulding rows outside a Mouldings route.`,
				);
			}
			const mouldingStep = configuration.steps.find(
				(step) =>
					allowedStepIds.has(step.id) &&
					/^(?:MOULDING|MOLDING)S?$/i.test(String(step.title || "").trim()),
			);
			const mouldingSelection = mouldingStep
				? selectionByStepId.get(mouldingStep.id)
				: undefined;
			if (
				!mouldingStep ||
				!mouldingSelection ||
				!("meta" in mouldingSelection)
			) {
				throw new Error(
					`Line ${line.uid} must use the configured multiple-selection Moulding step.`,
				);
			}
			const selectedUids = mouldingSelection.meta.selectedProdUids;
			const rowUids = mouldingRows.map((row) => row.uid);
			if (
				selectedUids.length !== rowUids.length ||
				selectedUids.some((uid) => !rowUids.includes(uid)) ||
				rowUids.some((uid) => !selectedUids.includes(uid))
			) {
				throw new Error(
					`Line ${line.uid} moulding rows must exactly match its selected Moulding components.`,
				);
			}
			const titleByUid = new Map(mouldingStep.components);
			const mouldingTitles = mouldingStep.components.map(([, title]) => title);
			for (const row of mouldingRows) {
				const title = titleByUid.get(row.uid);
				if (!title) {
					throw new Error(
						`Line ${line.uid} references an unavailable Moulding component.`,
					);
				}
				const rowSourceText = mouldingSourceSegments(
					sourceText,
					title,
					mouldingTitles,
				);
				if (!rowSourceText) {
					throw new Error(
						`Moulding component ${title} must be stated in the customer request.`,
					);
				}
				if ("qty" in row) {
					if (!sourceStatesMouldingPieceQuantity(rowSourceText, row.qty)) {
						throw new Error(
							`Moulding quantity ${row.qty} must be stated in the customer request.`,
						);
					}
					continue;
				}
				if (
					!sourceStatesLinearFeet(rowSourceText, row.calculation.linearFeet)
				) {
					throw new Error(
						"Moulding linear feet must be stated in the customer request.",
					);
				}
				const expectedPieceLength = parseMouldingPieceLength(title);
				if (
					expectedPieceLength == null ||
					Math.abs(expectedPieceLength - row.calculation.pieceLength) > 0.001
				) {
					throw new Error(
						"Moulding piece length must match the selected component title.",
					);
				}
				if (
					row.calculation.wastePercentage != null &&
					!sourceStatesWastePercentage(
						rowSourceText,
						row.calculation.wastePercentage,
					)
				) {
					throw new Error(
						"Moulding waste percentage must be stated in the customer request.",
					);
				}
				if (
					row.calculation.wastePercentage == null &&
					sourceStatesAnyWastePercentage(rowSourceText)
				) {
					throw new Error(
						"Moulding waste percentage stated in the customer request must be included.",
					);
				}
			}
		}
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
		if (line.housePackageTool) {
			const doorStepIds = new Set(
				configuration.steps
					.filter(
						(step) =>
							allowedStepIds.has(step.id) &&
							String(step.title || "")
								.trim()
								.toLowerCase() === "door",
					)
					.map((step) => step.id),
			);
			const doorSelections = formSteps.flatMap((selection) => {
				const step = stepsById.get(selection.stepId);
				if (
					!step ||
					String(step.title || "")
						.trim()
						.toLowerCase() !== "door"
				) {
					return [];
				}
				if ("prodUid" in selection) return [selection.prodUid];
				if ("meta" in selection) return selection.meta.selectedProdUids;
				return [];
			});
			const hasUnresolvedDoor = normalizedSeed.unresolved.some(
				(entry) =>
					entry.lineUid === line.uid &&
					entry.stepId != null &&
					doorStepIds.has(entry.stepId) &&
					entry.field.trim().toLowerCase() === "door",
			);
			if (
				doorSelections.length > 1 ||
				(doorSelections.length === 0 && !hasUnresolvedDoor)
			) {
				throw new Error(
					`Line ${line.uid} must select one Door component or explicitly leave that Door unresolved for HPT rows.`,
				);
			}
			const handling = { ...(route.config || {}) };
			for (const orderedStepId of orderedStepIds) {
				const selection = selectionByStepId.get(orderedStepId);
				if (!selection || "value" in selection) continue;
				const selectedProdUids =
					"prodUid" in selection
						? [selection.prodUid]
						: selection.meta.selectedProdUids;
				for (const uid of selectedProdUids) {
					const visibility = configuration.visibilityByComponentUid[uid];
					if (!visibility || typeof visibility !== "object") continue;
					const override = (visibility as Record<string, unknown>)
						.sectionOverride;
					if (!override || typeof override !== "object") continue;
					const sectionOverride = override as Record<string, unknown>;
					if (sectionOverride.overrideMode !== true) continue;
					if (typeof sectionOverride.noHandle === "boolean")
						handling.noHandle = sectionOverride.noHandle;
					if (typeof sectionOverride.hasSwing === "boolean")
						handling.hasSwing = sectionOverride.hasSwing;
				}
			}
			for (const door of line.housePackageTool.doors) {
				const isUnhanded = "totalQty" in door;
				if (isUnhanded !== (handling.noHandle === true)) {
					throw new Error(
						`Line ${line.uid} uses the wrong HPT quantity shape for its configured route.`,
					);
				}
				if (
					!isUnhanded &&
					handling.hasSwing === false &&
					String(door.swing || "").trim()
				) {
					throw new Error(
						`Line ${line.uid} includes swing on a route that does not support it.`,
					);
				}
			}

			const variationSteps = configuration.steps.filter(
				(step) => allowedStepIds.has(step.id) && step.doorSizeVariation?.length,
			);
			if (variationSteps.length) {
				const nativeSteps = formSteps.flatMap((selection) => {
					const configuredStep = stepsById.get(selection.stepId);
					if (!configuredStep) return [];
					const selectedUid =
						"prodUid" in selection
							? selection.prodUid
							: "meta" in selection
								? selection.meta.selectedProdUids[0]
								: null;
					const selectedTitle = selectedUid
						? configuredStep.components.find(
								([uid]) => uid === selectedUid,
							)?.[1]
						: "value" in selection
							? selection.value
							: "";
					return [
						{
							stepId: configuredStep.id,
							prodUid: selectedUid || undefined,
							value: selectedTitle || "",
							step: {
								uid: configuredStep.uid,
								title: configuredStep.title || "",
							},
						},
					];
				});
				for (const variationStep of variationSteps) {
					if (nativeSteps.some((step) => step.stepId === variationStep.id))
						continue;
					nativeSteps.push({
						stepId: variationStep.id,
						prodUid: undefined,
						value: "",
						step: {
							uid: variationStep.uid,
							title: variationStep.title || "",
						},
					});
				}
				const stepsByUid = Object.fromEntries(
					configuration.steps.map((step) => [
						step.uid,
						{
							id: step.id,
							uid: step.uid,
							title: step.title || "",
							...(step.doorSizeVariation?.length
								? {
										meta: {
											doorSizeVariation: step.doorSizeVariation,
										},
									}
								: {}),
						},
					]),
				);
				const candidates = deriveDoorSizeCandidates(
					{ formSteps: nativeSteps },
					{},
					{ stepsByUid },
				);
				if (!candidates.length) {
					throw new Error(
						`Line ${line.uid} cannot resolve door sizes for its selected Height and configuration.`,
					);
				}
				const candidateByDimensionKey = new Map(
					candidates.flatMap((candidate) => {
						const key = dimensionKey(candidate);
						return key ? [[key, candidate] as const] : [];
					}),
				);
				for (const door of line.housePackageTool.doors) {
					const key = dimensionKey(door.dimension);
					const canonical = key ? candidateByDimensionKey.get(key) : undefined;
					if (!canonical) {
						throw new Error(
							`Line ${line.uid} uses a door dimension outside its selected Height configuration.`,
						);
					}
					if (sourceText && !statedDimensionKeys.has(key as string)) {
						throw new Error(
							`Door dimension ${door.dimension} must be stated in the customer request.`,
						);
					}
					door.dimension = canonical;
				}
			}
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
	return newSalesFormSeedSchema.parse(
		normalizeNewSalesFormSeed(normalizedSeed),
	);
}

export async function generateNewSalesFormSeed(
	input: SalesRequestProviderInput & {
		configurationRevision: string;
		/** Decoded source used by deterministic grounding checks when text is framed. */
		groundingText?: string;
	},
	provider: SalesRequestProvider,
	options?: {
		onProviderFailure?: (
			diagnostic: SalesRequestProviderFailureDiagnostic,
		) => void;
	},
) {
	const signal = AbortSignal.any([
		input.signal,
		AbortSignal.timeout(SALES_REQUEST_PROVIDER_TIMEOUT_MS),
	]);
	signal.throwIfAborted();
	const images = await prepareSalesRequestImages(input.images);
	signal.throwIfAborted();
	let generated: Awaited<ReturnType<SalesRequestProvider>>;
	try {
		generated = await provider({
			text: input.text,
			images,
			configurationJson: input.configurationJson,
			signal,
		});
	} catch (error) {
		try {
			options?.onProviderFailure?.(classifySalesRequestProviderFailure(error));
		} catch {
			// Telemetry must never alter the safe provider error contract.
		}
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
	const configured = validateNewSalesFormSeedConfiguration(
		parsed.data,
		input.configurationJson,
		input.groundingText ?? input.text,
	);
	return {
		seed: configured,
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
