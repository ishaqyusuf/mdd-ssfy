import type { SalesRequestAnswerContext } from "./sales-request-context";
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

function comparableCatalogTitle(value: string) {
	return value
		.normalize("NFKC")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleUpperCase();
}

function hasOneAndThreeEighths(value: string) {
	return /\b1\s*(?:-|\s)\s*3\s*\/\s*8\b/.test(value.normalize("NFKC"));
}

/** Conservative terminology bridge used only to request a corrected model selection. */
function isCompatibleDoorInterpretation(sourceText: string, title: string) {
	const source = comparableSourceText(sourceText);
	const candidate = comparableSourceText(title);
	let statedProperties = 0;
	const requires = (stated: boolean, compatible: boolean) => {
		if (!stated) return true;
		statedProperties += 1;
		return compatible;
	};
	const sourceSolid = /\bSOLID CORE\b/.test(source);
	const sourceHollow = /\bHOLLOW CORE\b/.test(source);
	const candidateSolid = /\b(?:SOLID CORE|SC|S C)\b/.test(candidate);
	const candidateHollow = /\b(?:HOLLOW CORE|HC|H C)\b/.test(candidate);
	const sourceFireRated = /\bFIRE(?: RATED)?\b/.test(source);
	const sourceImpactRated = /\bIMPACT(?: RATED)?\b/.test(source);
	const candidateFireRated = /\bFIRE(?: RATED)?\b/.test(candidate);
	const candidateImpactRated = /\bIMPACT(?: RATED)?\b/.test(candidate);
	if (candidateFireRated && !sourceFireRated) return false;
	if (candidateImpactRated && !sourceImpactRated) return false;
	if (!requires(sourceSolid, candidateSolid && !candidateHollow)) return false;
	if (!requires(sourceHollow, candidateHollow && !candidateSolid)) return false;
	if (
		!requires(
			/\bSMOOTH\b/.test(source) && /\bSLABS?\b/.test(source),
			/\b(?:SMOOTH|FLUSH|HARDBOARD FLUSH)\b/.test(candidate) &&
				!/\bMOLDED\b/.test(candidate),
		)
	)
		return false;
	if (
		!requires(
			/\bENGINEERED\b/.test(source),
			/\b(?:ENGINEERED|HAR(?:D)?BOARD)\b/.test(candidate),
		)
	)
		return false;
	if (
		!requires(
			/\b(?:WHITE PRIMED|PRIMED)\b/.test(source),
			/\bPRIMED\b/.test(candidate),
		)
	)
		return false;
	if (
		!requires(
			/\bFLUSH\b/.test(source),
			/\bFLUSH\b/.test(candidate) && !/\bMOLDED\b/.test(candidate),
		)
	)
		return false;
	if (
		!requires(hasOneAndThreeEighths(sourceText), hasOneAndThreeEighths(title))
	)
		return false;
	if (!requires(sourceFireRated, candidateFireRated)) return false;
	if (!requires(sourceImpactRated, candidateImpactRated)) return false;
	if (
		!requires(
			/\bMOLDED\b/.test(source) && !/\bFLUSH\b/.test(source),
			/\bMOLDED\b/.test(candidate) && !/\bFLUSH\b/.test(candidate),
		)
	)
		return false;
	return statedProperties > 0;
}

function shortestCompatibleDoorSourceSegment(
	sourceText: string,
	title: string,
) {
	const segments = sourceText
		.split(/\r?\n|;|(?<=[.!?])\s+/)
		.map((segment) => segment.trim())
		.filter(
			(segment) =>
				segment.length > 0 &&
				segment.length <= 1000 &&
				isCompatibleDoorInterpretation(segment, title),
		)
		.sort((left, right) => left.length - right.length);
	return (segments[0] ?? sourceText.trim().slice(0, 1000)).trim();
}

function isCompatibleDoorPrerequisite(sourceText: string, title: string) {
	const source = comparableSourceText(sourceText);
	const candidate = comparableSourceText(title);
	let statedProperties = 0;
	const requires = (stated: boolean, compatible: boolean) => {
		if (!stated) return true;
		statedProperties += 1;
		return compatible;
	};
	const sourceSolid = /\bSOLID CORE\b/.test(source);
	const sourceHollow = /\bHOLLOW CORE\b/.test(source);
	const sourceFlush = /\b(?:SMOOTH|FLUSH)\b/.test(source);
	const sourceMolded = /\bMOLDED\b/.test(source) && !sourceFlush;
	const candidateSolid = /\b(?:SOLID CORE|SC|S C)\b/.test(candidate);
	const candidateHollow = /\b(?:HOLLOW CORE|HC|H C)\b/.test(candidate);
	const candidateFlush = /\bFLUSH\b/.test(candidate);
	const candidateMolded = /\bMOLDED\b/.test(candidate);
	if (!requires(sourceSolid, candidateSolid && !candidateHollow)) return false;
	if (!requires(sourceHollow, candidateHollow && !candidateSolid)) return false;
	if (!requires(sourceFlush, candidateFlush && !candidateMolded)) return false;
	if (!requires(sourceMolded, candidateMolded && !candidateFlush)) return false;
	return statedProperties > 0;
}

function shortestCompatiblePrerequisiteSourceSegment(
	sourceText: string,
	title: string,
) {
	const segments = sourceText
		.split(/\r?\n|;|(?<=[.!?])\s+/)
		.map((segment) => segment.trim())
		.filter(
			(segment) =>
				segment.length > 0 &&
				segment.length <= 1000 &&
				isCompatibleDoorPrerequisite(segment, title),
		)
		.sort((left, right) => left.length - right.length);
	return (segments[0] ?? sourceText.trim().slice(0, 1000)).trim();
}

function singleCompatibleDoorPrerequisite(input: {
	visibility: unknown;
	configuration: ModelConfiguration;
	allowedStepIds: ReadonlySet<number>;
	selectedByStepUid: Record<string, string>;
	selectedProdUidsByStepUid: Record<string, string[]>;
	sourceText: string;
}) {
	if (!input.visibility || typeof input.visibility !== "object") return null;
	const variations = (input.visibility as { variations?: unknown }).variations;
	if (!Array.isArray(variations)) return null;
	const corrections = variations.flatMap((variation) => {
		if (!variation || typeof variation !== "object") return [];
		const rules = (variation as { rules?: unknown }).rules;
		if (!Array.isArray(rules) || rules.length === 0) return [];
		const unmet = rules.filter(
			(rule) =>
				!isComponentVisibleByRules(
					{ variations: [{ rules: [rule] }] },
					input.selectedByStepUid,
					input.selectedProdUidsByStepUid,
				),
		);
		if (unmet.length !== 1) return [];
		const rule = unmet[0] as {
			stepUid?: unknown;
			operator?: unknown;
			componentsUid?: unknown;
		};
		if (rule.operator !== "is" || !Array.isArray(rule.componentsUid)) return [];
		const requiredUids = rule.componentsUid.map(String);
		if (requiredUids.length !== 1) return [];
		const stepUid = String(rule.stepUid || "");
		const step = input.configuration.steps.find(
			(candidate) =>
				candidate.uid === stepUid && input.allowedStepIds.has(candidate.id),
		);
		const uid = requiredUids[0]!;
		const title = step?.components.find(
			([componentUid]) => componentUid === uid,
		)?.[1];
		if (
			!step ||
			!title ||
			!isCompatibleDoorPrerequisite(input.sourceText, title)
		)
			return [];
		const selectedByStepUid = {
			...input.selectedByStepUid,
			[step.uid]: uid,
		};
		const selectedProdUidsByStepUid = {
			...input.selectedProdUidsByStepUid,
			[step.uid]: [uid],
		};
		if (
			!isComponentVisibleByRules(
				input.visibility,
				selectedByStepUid,
				selectedProdUidsByStepUid,
			)
		)
			return [];
		return [
			{
				step,
				uid,
				title,
				selectedByStepUid,
				selectedProdUidsByStepUid,
			},
		];
	});
	const unique = new Map(
		corrections.map((correction) => [
			`${correction.step.id}:${correction.uid}`,
			correction,
		]),
	);
	return unique.size === 1 ? [...unique.values()][0]! : null;
}

function hasSourceCompatibleVisibleDoorPrerequisitePath(input: {
	visibility: unknown;
	configuration: ModelConfiguration;
	selectedByStepUid: Record<string, string>;
	selectedProdUidsByStepUid: Record<string, string[]>;
	sourceText: string;
}) {
	if (!input.visibility || typeof input.visibility !== "object") return true;
	const variations = (input.visibility as { variations?: unknown }).variations;
	if (!Array.isArray(variations) || variations.length === 0) return true;
	return variations.some((variation) => {
		if (!variation || typeof variation !== "object") return false;
		const rules = (variation as { rules?: unknown }).rules;
		if (!Array.isArray(rules) || rules.length === 0) return false;
		if (
			!isComponentVisibleByRules(
				{ variations: [{ rules }] },
				input.selectedByStepUid,
				input.selectedProdUidsByStepUid,
			)
		)
			return false;
		return rules.every((rule) => {
			if (!rule || typeof rule !== "object") return true;
			const candidate = rule as {
				stepUid?: unknown;
				operator?: unknown;
				componentsUid?: unknown;
			};
			if (
				candidate.operator !== "is" ||
				!Array.isArray(candidate.componentsUid)
			)
				return true;
			const componentUids = candidate.componentsUid.map(String);
			if (componentUids.length !== 1) return true;
			const step = input.configuration.steps.find(
				(configuredStep) =>
					configuredStep.uid === String(candidate.stepUid || ""),
			);
			if (!step || !/^door\s*type$/i.test(step.title?.trim() || ""))
				return true;
			const title = step.components.find(
				([uid]) => uid === componentUids[0],
			)?.[1];
			return Boolean(
				title && isCompatibleDoorPrerequisite(input.sourceText, title),
			);
		});
	});
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
	// Three-number door specifications may put thickness between width and height.
	// Only treat the middle number as thickness when it is a plausible <=4 inches.
	for (const match of sourceText.matchAll(
		/\b(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?\s*[x×]\s*(\d+(?:\.\d+)?)\b/gi,
	)) {
		const thickness =
			Number(match[2]) + (match[3] ? Number(match[3]) / Number(match[4]) : 0);
		if (
			thickness > 0 &&
			thickness <= 4 &&
			Number(match[1]) > 4 &&
			Number(match[5]) >= 24
		) {
			const key = dimensionKey(`${match[1]} x ${match[5]}`);
			if (key) keys.add(key);
		}
	}
	const matches = sourceText.matchAll(
		/(\d+(?:\s*[-/]\s*\d+)?)\s*(?:["”'])?\s*[x×]\s*(\d+(?:\s*[-/]\s*\d+)?)\s*(?:["”'])?/gi,
	);
	for (const match of matches) {
		const key = dimensionKey(`${match[1]} x ${match[2]}`);
		if (key) keys.add(key);
	}
	// Trade notation commonly separates two architectural dimensions with space,
	// e.g. 2/8 8/0 RH. Require both feet/inches parts; bare numbers stay ambiguous.
	for (const match of sourceText.matchAll(
		/\b([1-9][-/](?:1[01]|[0-9]))[ \t]+([1-9][-/](?:1[01]|[0-9]))\b/g,
	)) {
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
	identityGuidance: SalesRequestAnswerContext[] = [],
): NewSalesFormSeed {
	const normalizedSeed = structuredClone(seed);
	const configuration = parseModelConfiguration(configurationJson);
	const stepsById = new Map(configuration.steps.map((step) => [step.id, step]));
	const stepsByUid = new Map(
		configuration.steps.map((step) => [step.uid, step]),
	);
	const interpretations = normalizedSeed.interpretations ?? [];

	// A valid subset is not a complete conversion: explicitly counted, exact-match
	// standalone mouldings must remain selected, even when quantity needs review.
	for (const step of configuration.steps) {
		if (
			!/^mouldings?$/i.test(step.title?.trim() || "") ||
			step.selectionMode !== "multiple"
		)
			continue;
		const standalone = configuration.routes.some(
			(route) =>
				route.stepUids.includes(step.uid) &&
				configuration.steps.some(
					(root) =>
						root.id === route.rootStepId &&
						root.components.some(
							([uid, title]) =>
								uid === route.itemTypeUid && /^mouldings?$/i.test(title.trim()),
						),
				),
		);
		if (!standalone) continue;
		for (const [uid, title] of step.components) {
			const name = comparableSourceText(title);
			if (
				!name ||
				step.components.filter(
					([, candidate]) => comparableSourceText(candidate) === name,
				).length !== 1
			)
				continue;
			const explicitlyCounted = sourceText
				.split(/\r?\n|;/)
				.some(
					(segment) =>
						comparableSourceText(segment).includes(name) &&
						/\b(?:pieces?|strips?|tiras?|piezas?)\b/i.test(segment) &&
						/\d/.test(segment) &&
						!/\b(?:not|without|exclude|excluding|no)\b/i.test(segment),
				);
			if (!explicitlyCounted) continue;
			const selected = normalizedSeed.lineItems.some((line) =>
				line.formSteps.some(
					(selection) =>
						selection.stepId === step.id &&
						"meta" in selection &&
						selection.meta.selectedProdUids.includes(uid),
				),
			);
			if (!selected)
				throw new Error(
					`Requested Moulding ${title} is missing. Select its catalog UID ${uid}; preserve explicit quantity or flag quantity for review.`,
				);
		}
	}

	const statedDimensionKeys = sourceDimensionKeys(sourceText);
	const statedDimensionHeights = new Set(
		[...statedDimensionKeys].map((key) => Number(key.split(":")[1])),
	);
	for (const line of normalizedSeed.lineItems) {
		const formSteps = line.formSteps as ValidatedSeedStep[];
		for (const selection of formSteps) {
			const step = stepsById.get(selection.stepId);
			if (
				step?.title?.trim().toLowerCase() !== "height" ||
				!("prodUid" in selection)
			)
				continue;
			const title = step.components.find(
				([uid]) => uid === selection.prodUid,
			)?.[1];
			const inches = title ? dimensionPartInches(title) : null;
			if (
				!title ||
				inches == null ||
				statedDimensionHeights.size === 0 ||
				statedDimensionHeights.has(inches)
			)
				continue;
			// A separate height statement can coexist with another line's complete dimensions.
			const architectural = title.trim().match(/^(\d+)[-/](\d+)$/);
			const standalone = architectural
				? new RegExp(
						`\\b${architectural[1]}\\s*[-/]\\s*${architectural[2]}\\b|\\b${inches}\\s*(?:["”]|inches\\b|in\\b)`,
						"i",
					)
				: new RegExp(`\\b${inches}\\s*(?:["”]|inches\\b|in\\b)`, "i");
			if (!standalone.test(sourceText))
				throw new Error(
					`Line ${line.uid} selects Height ${title}, which contradicts the dimensions stated in the customer request.`,
				);
		}
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
		const lineInterpretations = interpretations.filter(
			(interpretation) => interpretation.lineUid === line.uid,
		);
		for (const interpretation of lineInterpretations) {
			if (!allowedStepIds.has(interpretation.stepId)) {
				throw new Error(
					`Line ${line.uid} interpretation references a step outside its configured route.`,
				);
			}
			const step = stepsById.get(interpretation.stepId);
			const configuredTitle = step?.components.find(
				([uid]) => uid === interpretation.selectedProdUid,
			)?.[1];
			if (
				!configuredTitle ||
				comparableCatalogTitle(configuredTitle) !==
					comparableCatalogTitle(interpretation.selectedTitle)
			) {
				throw new Error(
					`Line ${line.uid} interpretation must use the current configured component title.`,
				);
			}
			if (
				!comparableSourceText(sourceText).includes(
					comparableSourceText(interpretation.sourceText),
				)
			) {
				throw new Error(
					`Line ${line.uid} interpretation source text must be quoted from the customer request.`,
				);
			}
		}
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
				const interpretedSource = lineInterpretations.reduce(
					(text, interpretation) => {
						if (
							interpretation.stepId !== mouldingStep.id ||
							interpretation.selectedProdUid !== row.uid
						)
							return text;
						const offset = text
							.toLowerCase()
							.indexOf(interpretation.sourceText.toLowerCase());
						return offset < 0
							? text
							: `${text.slice(0, offset)}${title}${text.slice(offset + interpretation.sourceText.length)}`;
					},
					sourceText,
				);
				const identitySource = identityGuidance.reduce((text, guidance) => {
					// A reviewed alias may identify a current product, never contribute
					// a historic quantity or dimension to the numeric source checks.
					if (
						mouldingTitles.some((candidate) =>
							comparableSourceText(sourceText).includes(
								comparableSourceText(candidate),
							),
						)
					)
						return text;
					const phrase = guidance.sourceText?.trim();
					if (
						!phrase ||
						phrase.length < 4 ||
						guidance.answer.trim().toLowerCase() !== title.trim().toLowerCase()
					)
						return text;
					const offset = text.toLowerCase().indexOf(phrase.toLowerCase());
					return offset < 0
						? text
						: `${text.slice(0, offset)}${title}${text.slice(offset + phrase.length)}`;
				}, interpretedSource);
				const rowSourceText = mouldingSourceSegments(
					identitySource,
					title,
					mouldingTitles,
				);
				if (!rowSourceText) {
					throw new Error(
						`Moulding component ${title} must be stated in the customer request.`,
					);
				}
				if (!row.calculation && "qty" in row) {
					// Zero is an explicitly reviewed pending quantity, never a charge.
					if (row.qty === 0) continue;
					if (!sourceStatesMouldingPieceQuantity(rowSourceText, row.qty)) {
						throw new Error(
							`Moulding quantity ${row.qty} must be stated in the customer request.`,
						);
					}
					continue;
				}
				if (!row.calculation) continue;
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
			const doorSteps = configuration.steps.filter(
				(step) =>
					allowedStepIds.has(step.id) &&
					String(step.title || "")
						.trim()
						.toLowerCase() === "door",
			);
			const doorStepIds = new Set(doorSteps.map((step) => step.id));
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
			if (doorSelections.length === 0) {
				const visibleCompatibleCandidates = doorSteps.flatMap((doorStep) =>
					doorStep.components.flatMap(([uid, title]) => {
						if (!isCompatibleDoorInterpretation(sourceText, title)) return [];
						const visibility = configuration.visibilityByComponentUid[uid];
						const prerequisite =
							visibility &&
							!isComponentVisibleByRules(
								visibility,
								selectedByStepUid,
								selectedProdUidsByStepUid,
							)
								? singleCompatibleDoorPrerequisite({
										visibility,
										configuration,
										allowedStepIds,
										selectedByStepUid,
										selectedProdUidsByStepUid,
										sourceText,
									})
								: null;
						if (
							visibility &&
							!prerequisite &&
							!isComponentVisibleByRules(
								visibility,
								selectedByStepUid,
								selectedProdUidsByStepUid,
							)
						)
							return [];
						const completedSelectedByStepUid = {
							...(prerequisite?.selectedByStepUid ?? selectedByStepUid),
							[doorStep.uid]: uid,
						};
						const completedSelectedProdUidsByStepUid = {
							...(prerequisite?.selectedProdUidsByStepUid ??
								selectedProdUidsByStepUid),
							[doorStep.uid]: [uid],
						};
						if (
							visibility &&
							!isComponentVisibleByRules(
								visibility,
								completedSelectedByStepUid,
								completedSelectedProdUidsByStepUid,
							)
						)
							return [];
						if (
							visibility &&
							!hasSourceCompatibleVisibleDoorPrerequisitePath({
								visibility,
								configuration,
								selectedByStepUid: completedSelectedByStepUid,
								selectedProdUidsByStepUid: completedSelectedProdUidsByStepUid,
								sourceText,
							})
						)
							return [];
						const completedCombinationVisible = formSteps.every((selection) => {
							if (selection.stepId === prerequisite?.step.id) return true;
							if ("value" in selection) return true;
							const selectedProdUids =
								"prodUid" in selection
									? [selection.prodUid]
									: selection.meta.selectedProdUids;
							return selectedProdUids.every((selectedUid) => {
								const selectedVisibility =
									configuration.visibilityByComponentUid[selectedUid];
								return (
									!selectedVisibility ||
									isComponentVisibleByRules(
										selectedVisibility,
										completedSelectedByStepUid,
										completedSelectedProdUidsByStepUid,
									)
								);
							});
						});
						if (!completedCombinationVisible) return [];
						return [{ stepId: doorStep.id, uid, title, prerequisite }];
					}),
				);
				if (visibleCompatibleCandidates.length === 1) {
					const [candidate] = visibleCompatibleCandidates;
					const prerequisite = candidate!.prerequisite;
					const newInterpretations: NonNullable<
						NewSalesFormSeed["interpretations"]
					> = [];
					if (prerequisite) {
						const prerequisiteSelection =
							prerequisite.step.selectionMode === "multiple"
								? {
										stepId: prerequisite.step.id,
										meta: { selectedProdUids: [prerequisite.uid] },
									}
								: { stepId: prerequisite.step.id, prodUid: prerequisite.uid };
						const existingIndex = formSteps.findIndex(
							(selection) => selection.stepId === prerequisite.step.id,
						);
						if (existingIndex >= 0)
							formSteps[existingIndex] = prerequisiteSelection;
						else formSteps.push(prerequisiteSelection);
						selectionByStepId.set(prerequisite.step.id, prerequisiteSelection);
						selectedByStepUid[prerequisite.step.uid] = prerequisite.uid;
						selectedProdUidsByStepUid[prerequisite.step.uid] = [
							prerequisite.uid,
						];
						newInterpretations.push({
							lineUid: line.uid,
							stepId: prerequisite.step.id,
							field: prerequisite.step.title || "door type",
							sourceText: shortestCompatiblePrerequisiteSourceSegment(
								sourceText,
								prerequisite.title,
							),
							selectedProdUid: prerequisite.uid,
							selectedTitle: prerequisite.title.trim(),
							reason:
								"Corrected the prerequisite selection to the only source-compatible option required by the Door component.",
						});
					}
					const doorStep = stepsById.get(candidate!.stepId)!;
					const selection =
						doorStep.selectionMode === "multiple"
							? {
									stepId: candidate!.stepId,
									meta: { selectedProdUids: [candidate!.uid] },
								}
							: { stepId: candidate!.stepId, prodUid: candidate!.uid };
					formSteps.push(selection);
					selectionByStepId.set(candidate!.stepId, selection);
					selectedByStepUid[doorStep.uid] = candidate!.uid;
					selectedProdUidsByStepUid[doorStep.uid] = [candidate!.uid];
					doorSelections.push(candidate!.uid);
					normalizedSeed.unresolved = normalizedSeed.unresolved.filter(
						(entry) =>
							!(
								entry.lineUid === line.uid &&
								entry.stepId === candidate!.stepId &&
								entry.field.trim().toLowerCase() === "door"
							),
					);
					newInterpretations.push({
						lineUid: line.uid,
						stepId: candidate!.stepId,
						field: "door",
						sourceText: shortestCompatibleDoorSourceSegment(
							sourceText,
							candidate!.title,
						),
						selectedProdUid: candidate!.uid,
						selectedTitle: candidate!.title.trim(),
						reason:
							"Mapped the customer Door description to the only compatible visible configured component.",
					});
					normalizedSeed.interpretations = [
						...(normalizedSeed.interpretations ?? []).filter(
							(interpretation) =>
								!(
									prerequisite &&
									interpretation.lineUid === line.uid &&
									interpretation.stepId === prerequisite.step.id
								),
						),
						...newInterpretations,
					];
				}
			}
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

/** A numeric answer to a product-bound quantity question is already resolved. */
function applyConfirmedMouldingQuantities(
	seed: NewSalesFormSeed,
	configurationJson: string,
	answers: SalesRequestAnswerContext[] = [],
): NewSalesFormSeed {
	const next = structuredClone(seed);
	if (next.schemaVersion !== 2) return next;
	const titles = new Map(
		parseModelConfiguration(configurationJson).steps.flatMap(
			(step) => step.components,
		),
	);
	for (const answer of answers) {
		if (
			!/^(quantity|qty|count)$/i.test(answer.field ?? "") ||
			!answer.sourceText
		)
			continue;
		const match = answer.answer
			.trim()
			.match(/^(\d+)(?:\s*(?:pieces?|pcs?|units?))?\.?$/i);
		const qty = match ? Number(match[1]) : 0;
		if (!Number.isSafeInteger(qty) || qty <= 0) continue;
		for (const line of next.lineItems) {
			const rows = line.meta?.mouldingRows;
			if (!rows?.length) continue;
			const matching = rows.filter(
				(row) =>
					titles.get(row.uid)?.trim().toLowerCase() ===
					answer.sourceText!.trim().toLowerCase(),
			);
			if (matching.length !== 1) continue;
			Object.assign(matching[0]!, { qty });
			line.qty = rows.reduce(
				(sum, row) => sum + ("qty" in row ? row.qty : 0),
				0,
			);
			next.unresolved = next.unresolved.filter(
				(issue) =>
					!(
						issue.lineUid === line.uid &&
						/^(quantity|qty|count)$/i.test(issue.field)
					),
			);
		}
	}
	return next;
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
			clarifications: input.clarifications,
			guidance: input.guidance,
			adminRules: input.adminRules,
			prepareSeed: (seed) =>
				applyConfirmedMouldingQuantities(
					seed,
					input.configurationJson,
					input.clarifications,
				),
			validateSeed: (seed) => {
				validateNewSalesFormSeedConfiguration(
					applyConfirmedMouldingQuantities(
						seed,
						input.configurationJson,
						input.clarifications,
					),
					input.configurationJson,
					input.groundingText ?? input.text,
					input.guidance,
				);
			},
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
		applyConfirmedMouldingQuantities(
			parsed.data,
			input.configurationJson,
			input.clarifications,
		),
		input.configurationJson,
		input.groundingText ?? input.text,
		input.guidance,
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
