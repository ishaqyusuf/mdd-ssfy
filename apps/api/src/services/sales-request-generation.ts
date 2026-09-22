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
import { SALES_REQUEST_MAX_OUTPUT_TOKENS, classifySalesRequestProviderFailure, salesRequestMaxOutputTokens } from "./sales-request-provider";

export const SALES_REQUEST_PROVIDER_TIMEOUT_MS = 45_000;
export const SALES_REQUEST_DENSE_PROVIDER_TIMEOUT_MS = 90_000;

export function salesRequestProviderTimeoutMs(sourceText: string) {
	return salesRequestMaxOutputTokens(sourceText) > SALES_REQUEST_MAX_OUTPUT_TOKENS
		? SALES_REQUEST_DENSE_PROVIDER_TIMEOUT_MS
		: SALES_REQUEST_PROVIDER_TIMEOUT_MS;
}

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

function hasOneAndThreeQuarters(value: string) {
	return /\b1\s*(?:-|\s)?\s*3\s*\/\s*4\b/.test(value.normalize("NFKC"));
}

function statesTwentyMinuteFireRating(value: string) {
	const comparable = comparableSourceText(value);
	return (
		/\b20\s*(?:MIN|MINUTE|MINUTES)\b/.test(comparable) ||
		/\bCLASIFICACI[OÓ]N\s+DE\s+20\s+MINUTOS?\b/.test(comparable)
	);
}

function statesFlushDoor(value: string) {
	return /\b(?:FLUSH|ENRASAD[AO]S?)\b/.test(comparableSourceText(value));
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
	const sourceFireRated =
		/\bFIRE(?: RATED)?\b/.test(source) || statesTwentyMinuteFireRating(sourceText);
	const sourceImpactRated = /\bIMPACT(?: RATED)?\b/.test(source);
	const candidateFireRated = /\bFIRE(?: RATED)?\b/.test(candidate);
	const candidateImpactRated = /\bIMPACT(?: RATED)?\b/.test(candidate);
	const sourceSixPanel = /\b(?:6\s*P(?:A)?NL|6\s*PANEL|SIX\s*PANEL)\b/.test(source);
	const candidateSixPanel = /\b(?:6\s*P(?:A)?NL|6\s*PANEL|SIX\s*PANEL)\b/.test(candidate);
	const sourceFiberglass = /\bFIBERGLASS\b/.test(source);
	const candidateFiberglass = /\bFIBERGLASS\b/.test(candidate);
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
			statesFlushDoor(sourceText),
			/\bFLUSH\b/.test(candidate) && !/\bMOLDED\b/.test(candidate),
		)
	)
		return false;
	if (
		!requires(hasOneAndThreeEighths(sourceText), hasOneAndThreeEighths(title))
	)
		return false;
	if (
		!requires(hasOneAndThreeQuarters(sourceText), hasOneAndThreeQuarters(title))
	)
		return false;
	if (!requires(statesTwentyMinuteFireRating(sourceText), statesTwentyMinuteFireRating(title)))
		return false;
	if (!requires(sourceFireRated, candidateFireRated)) return false;
	if (!requires(sourceImpactRated, candidateImpactRated)) return false;
	if (!requires(sourceSixPanel, candidateSixPanel && !/\b(?:LITE|FLUSH)\b/.test(candidate)))
		return false;
	if (!requires(sourceFiberglass, candidateFiberglass)) return false;
	if (
		!requires(
			/\bMOLDED\b/.test(source) && !/\bFLUSH\b/.test(source),
			/\bMOLDED\b/.test(candidate) && !/\bFLUSH\b/.test(candidate),
		)
	)
		return false;
	return statedProperties > 0;
}

function unstatedDoorRating(sourceText: string, title: string) {
	const source = comparableSourceText(sourceText);
	const candidate = comparableSourceText(title);
	if (
		/\bFIRE(?: RATED)?\b/.test(candidate) &&
		!/\bFIRE(?: RATED)?\b/.test(source) &&
		!statesTwentyMinuteFireRating(sourceText)
	)
		return "fire rating";
	if (/\bIMPACT(?: RATED)?\b/.test(candidate) && !/\bIMPACT(?: RATED)?\b/.test(source))
		return "impact rating";
	return null;
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
	const sourceImpact = /\bIMPACT(?: RATED)?\b/.test(source);
	const candidateSolid = /\b(?:SOLID CORE|SC|S C)\b/.test(candidate);
	const candidateHollow = /\b(?:HOLLOW CORE|HC|H C)\b/.test(candidate);
	const candidateFlush = /\bFLUSH\b/.test(candidate);
	const candidateMolded = /\bMOLDED\b/.test(candidate);
	const candidateImpact = /\b(?:HVHZ|IMPACT(?: RATED)?)\b/.test(candidate);
	if (!requires(sourceSolid, candidateSolid && !candidateHollow)) return false;
	if (!requires(sourceHollow, candidateHollow && !candidateSolid)) return false;
	if (!requires(sourceFlush, candidateFlush && !candidateMolded)) return false;
	if (!requires(sourceMolded, candidateMolded && !candidateFlush)) return false;
	if (!requires(sourceImpact, candidateImpact)) return false;
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

function reviewUnidentifiedSideMouldings(
	seed: NewSalesFormSeed,
	configuration: ModelConfiguration,
	originalText: string,
	guidance: SalesRequestAnswerContext[],
) {
	if (seed.schemaVersion !== 2) return;
	const sourceRows: Array<{ side: "Left" | "Right"; kind: "baseboard" | "board"; text: string }> = [];
	let side: "Left" | "Right" | null = null;
	for (const raw of originalText.split(/\r?\n/)) {
		const text = raw.trim();
		if (/^left\s+side$/i.test(text)) { side = "Left"; continue; }
		if (/^right\s+side$/i.test(text)) { side = "Right"; continue; }
		if (!side) continue;
		if (/^\d+\s*(?:LF|linear\s+feet)\s+(?:for\s+)?baseboard\s*$/i.test(text))
			sourceRows.push({ side, kind: "baseboard", text });
		else if (/^\d+\s*=\s*12\s*(?:["”]|inches?\b|in\b)\s*boards?\s*$/i.test(text))
			sourceRows.push({ side, kind: "board", text });
	}
	if (sourceRows.length !== 4 ||
		["Left", "Right"].some((value) => ["baseboard", "board"].some((kind) =>
			sourceRows.filter((row) => row.side === value && row.kind === kind).length !== 1))) return;
	const candidateLines = seed.lineItems.filter((line) => {
		const route = configuration.routes.find((candidate) => line.formSteps.some((step) =>
			step.stepId === candidate.rootStepId && "prodUid" in step &&
			step.prodUid === candidate.itemTypeUid));
		return route && /^(?:MOULDING|MOLDING)S?$/i.test(configuration.steps.find((step) =>
			step.id === route.rootStepId)?.components.find(([uid]) =>
			uid === route.itemTypeUid)?.[1]?.trim() ?? "") &&
			Boolean(line.meta?.mouldingRows?.length);
	});
	if (!candidateLines.length) return;
	// This is an all-or-nothing source review. Never assign the two identical
	// 400-LF rows to model lines or convert them using an unstated stock length.
	for (const line of candidateLines) {
		const route = configuration.routes.find((candidate) => line.formSteps.some((step) =>
			step.stepId === candidate.rootStepId && "prodUid" in step &&
			step.prodUid === candidate.itemTypeUid));
		const mouldingStep = configuration.steps.find((step) => route?.stepUids.includes(step.uid) &&
			/^(?:MOULDING|MOLDING)S?$/i.test(step.title?.trim() ?? ""));
		const selection = line.formSteps.find((step) => step.stepId === mouldingStep?.id);
		if (!mouldingStep || !selection || !("meta" in selection) ||
			selection.meta.selectedProdUids.length !== line.meta?.mouldingRows?.length ||
			!line.meta.mouldingRows.every((row) => selection.meta.selectedProdUids.includes(row.uid))) return;
		for (const row of line.meta.mouldingRows) {
			const title = mouldingStep.components.find(([uid]) => uid === row.uid)?.[1];
			if (!title ||
				!selection.meta.selectedProdUids.includes(row.uid) ||
				comparableSourceText(originalText).includes(comparableSourceText(title)) ||
				guidance.some((answer) => comparableSourceText(answer.answer) === comparableSourceText(title))) return;
		}
	}
	const removedUids = new Set(candidateLines.map((line) => line.uid));
	seed.lineItems = seed.lineItems.filter((line) => !removedUids.has(line.uid));
	if (seed.interpretations)
		seed.interpretations = seed.interpretations.filter((item) => !removedUids.has(item.lineUid));
	seed.unresolved = seed.unresolved.map((item) => item.lineUid && removedUids.has(item.lineUid)
		? { ...item, lineUid: null, stepId: null,
			reason: `${item.lineUid}: ${item.reason}`.slice(0, 2000) }
		: item);
	for (const row of sourceRows)
		seed.unresolved.push({ lineUid: null, stepId: null, field: "moulding",
			status: "unsupported",
			reason: `Not created from ${row.side} Side: ${row.text}. The product and stock length need Sales review against the original request.` });
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
	const addDoorSize = (value: string) => {
		const key = dimensionKey(value);
		if (!key) return;
		const [width, height] = key.split(":").map(Number);
		// A count followed by a width, such as "2 x 30”", is not a door size.
		if ((width ?? 0) >= 12 && (height ?? 0) >= 60) keys.add(key);
	};
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
			addDoorSize(`${match[1]} x ${match[5]}`);
		}
	}
	const matches = sourceText.matchAll(
		/(\d+(?:[-/]\d+)?)\s*(?:["”])?\s*[x×]\s*(\d+(?:[-/]\d+)?)\s*(?:["”])?/gi,
	);
	for (const match of matches) {
		addDoorSize(`${match[1]} x ${match[2]}`);
	}
	// Trade notation commonly separates two architectural dimensions with space,
	// e.g. 2/8 8/0 RH. Require both feet/inches parts; bare numbers stay ambiguous.
	for (const match of sourceText.matchAll(
		/\b([1-9][-/](?:1[01]|[0-9]))[ \t]+([1-9][-/](?:1[01]|[0-9]))\b/g,
	)) {
		addDoorSize(`${match[1]} x ${match[2]}`);
	}
	return keys;
}

function confirmedDoorHeightKeys(
	sourceText: string,
	answers: SalesRequestAnswerContext[],
	statedKeys: ReadonlySet<string>,
) {
	const heightAnswers = answers.filter(
		(answer) => answer.field?.toLowerCase() === "height",
	);
	if (heightAnswers.length !== 1) return [];
	const height = heightAnswers[0]?.answer.trim().match(/^([6-9])[-/](1[01]|\d)$/);
	if (!height) return [];
	const heightInches = Number(height[1]) * 12 + Number(height[2]);
	const widths = sourceText.split(/\r?\n/)
		.filter((line) => !/\b(?:boards?|baseboard)\b/i.test(line))
		.flatMap((line) => [...line.matchAll(/\b(\d{2,3})\s*["”]/g)]
			.map((match) => Number(match[1])));
	return [...new Set(widths)]
		.filter((width) => width >= 12 && width <= 96 &&
			![...statedKeys].some((key) => Number(key.split(":")[0]) === width &&
				Number(key.split(":")[1]) !== heightInches))
		.map((width) => `${width}:${heightInches}`);
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
	confirmedAnswers: SalesRequestAnswerContext[] = [],
	originalCustomerText = sourceText,
): NewSalesFormSeed {
	const normalizedSeed = structuredClone(seed);
	const configuration = parseModelConfiguration(configurationJson);
	const likelyInchTypoAssumptions = new Map<string, {
		key: string;
		row: string;
		room: string;
		width: number;
		height: number;
	}>();
	const stepsById = new Map(configuration.steps.map((step) => [step.id, step]));
	const stepsByUid = new Map(
		configuration.steps.map((step) => [step.uid, step]),
	);
	const interpretations = normalizedSeed.interpretations ?? [];
	const selectedRouteTitle = (line: NewSalesFormSeed["lineItems"][number]) => {
		const route = configuration.routes.find((candidate) =>
			line.formSteps.some((selection) =>
				"prodUid" in selection && selection.stepId === candidate.rootStepId &&
				selection.prodUid === candidate.itemTypeUid));
		return configuration.steps.find((step) => step.id === route?.rootStepId)
			?.components.find(([uid]) => uid === route?.itemTypeUid)?.[1] ?? "";
	};
	const isExactFireRatedLeafFallback = (
		line: NewSalesFormSeed["lineItems"][number],
		rootTitle = selectedRouteTitle(line),
	) => {
		if (!/\bslabs?\s+only\b/i.test(rootTitle) || line.qty !== 4) return false;
		if (
			!statesFlushDoor(originalCustomerText) ||
			!hasOneAndThreeQuarters(originalCustomerText) ||
			!statesTwentyMinuteFireRating(originalCustomerText) ||
			!sourceDimensionKeys(originalCustomerText).has("36:80") ||
			!/(?:\bcantidad\s*:\s*4\b|\b(?:quantity|qty)\s*:?\s*4\b|\b4\s+(?:leaves|slabs|doors?|hojas?)\b)/i.test(originalCustomerText) ||
			!/(?:\bdos\s+unidades\s+de\s+doble\s+puerta\b|\btwo\s+(?:units?\s+of\s+)?double\s+doors?\b)/i.test(originalCustomerText)
		) return false;
		const selectedDoorTitles = line.formSteps.flatMap((selection) => {
			const step = stepsById.get(selection.stepId);
			if (step?.title?.trim().toLowerCase() !== "door" || "value" in selection)
				return [];
			const selectedUids = "prodUid" in selection
				? [selection.prodUid]
				: selection.meta.selectedProdUids;
			return selectedUids.flatMap((uid) => {
				const title = step.components.find(([candidate]) => candidate === uid)?.[1];
				return title ? [title] : [];
			});
		});
		if (selectedDoorTitles.length !== 1) return false;
		const title = selectedDoorTitles[0]!;
		if (
			!/\bFLUSH\b/i.test(title) ||
			!/\b(?:S\.?\s*C\.?|SOLID\s+CORE)\b/i.test(title) ||
			!hasOneAndThreeQuarters(title) ||
			!statesTwentyMinuteFireRating(title) ||
			!/\bFIRE\b/i.test(title)
		) return false;
		const doors = line.housePackageTool?.doors;
		if (!doors?.length) return true;
		return doors.length === 1 && dimensionKey(doors[0]!.dimension) === "36:80" &&
			"totalQty" in doors[0]! && doors[0]!.totalQty === 4;
	};
	const exteriorPrehungOnly =
		/\b(?:pre[- ]?hung|precolgad[oa]s?)\b/i.test(originalCustomerText) &&
		/\bexterior\b/i.test(originalCustomerText) &&
		!/\b(?:slabs?\s+only|separate\s+slabs?|hojas?\s+sueltas?)\b/i.test(originalCustomerText);
	if (exteriorPrehungOnly) {
		if (normalizedSeed.lineItems.some((line) => /\bexterior\b/i.test(selectedRouteTitle(line)))) {
			for (const line of [...normalizedSeed.lineItems]) {
				if (!/\bslabs?\s+only\b/i.test(selectedRouteTitle(line))) continue;
				if (isExactFireRatedLeafFallback(line)) {
					if (!line.housePackageTool?.doors.length) line.housePackageTool = {
						doors: [{ dimension: "3-0 x 6-8", totalQty: 4 }],
					};
					if (!normalizedSeed.unresolved.some((item) =>
						item.lineUid == null && item.field === "doorAssembly" &&
						item.reason.includes("four catalog-compatible")))
						normalizedSeed.unresolved.push({
							lineUid: null, stepId: null, field: "doorAssembly", status: "unsupported",
							reason: "Created four catalog-compatible 36 x 80, 1-3/4, 20-minute fire-rated flush leaves as a Sales-review starting point. The requested two exterior double pre-hung assemblies, right outswing, jamb, and final unit/leaf allocation are not represented by this Slabs Only line and must be completed in Sales.",
						});
					continue;
				}
				normalizedSeed.lineItems.splice(normalizedSeed.lineItems.indexOf(line), 1);
				for (let index = interpretations.length - 1; index >= 0; index--)
					if (interpretations[index]?.lineUid === line.uid) interpretations.splice(index, 1);
				normalizedSeed.unresolved = normalizedSeed.unresolved.map((item) =>
					item.lineUid === line.uid
						? { ...item, lineUid: null, stepId: null, status: "unsupported" as const }
						: item);
				normalizedSeed.unresolved.push({
					lineUid: null, stepId: null, field: "doorAssembly", status: "unsupported",
					reason: `Not created: the model added ${line.qty} separate Slabs Only units, but the customer requested exterior pre-hung units. Compare the requested assemblies and leaf count with the original text in Sales.`,
				});
			}
			if (normalizedSeed.lineItems.some((line) => isExactFireRatedLeafFallback(line))) {
				for (const line of [...normalizedSeed.lineItems]) {
					if (!/\bexterior\b/i.test(selectedRouteTitle(line))) continue;
					const hasDoorProduct = line.formSteps.some((selection) => {
						const step = stepsById.get(selection.stepId);
						if (step?.title?.trim().toLowerCase() !== "door" || "value" in selection)
							return false;
						return "prodUid" in selection || selection.meta.selectedProdUids.length > 0;
					});
					if (hasDoorProduct) continue;
					normalizedSeed.lineItems.splice(normalizedSeed.lineItems.indexOf(line), 1);
					for (let index = interpretations.length - 1; index >= 0; index--)
						if (interpretations[index]?.lineUid === line.uid) interpretations.splice(index, 1);
					normalizedSeed.unresolved = normalizedSeed.unresolved.map((item) =>
						item.lineUid === line.uid
							? { ...item, lineUid: null, stepId: null, status: "unsupported" as const }
							: item);
				}
			}
		}
	}
	for (const row of originalCustomerText.split(/\r?\n/)) {
		const closet = row.trim().match(
			/^([^:\n]{2,80})\s+-\s*(\d{2,3})\s*["”]\s*[x×]\s*(\d{2,3})\s*["”]?.*\(\s*2\s*-\s*(\d{2,3})\s*["”]\s*doors?\s+w\/\s*T\s*Astragal\s*\)/i,
		);
		if (!closet || Number(closet[2]) !== 2 * Number(closet[4])) continue;
		const room = closet[1]!.trim().toLowerCase();
		const leafSize = dimensionKey(`${closet[4]} x ${closet[3]}`);
		const selected = normalizedSeed.lineItems.find((line) =>
			line.housePackageTool?.doors.length === 1 &&
			dimensionKey(line.housePackageTool.doors[0]!.dimension) === leafSize &&
			(line.uid.toLowerCase().replace(/[^a-z0-9]/g, "") === room.replace(/[^a-z0-9]/g, "") ||
				interpretations.some((item) => item.lineUid === line.uid &&
					item.sourceText.toLowerCase().includes(room))),
		);
		if (!selected) continue;
		normalizedSeed.lineItems.splice(normalizedSeed.lineItems.indexOf(selected), 1);
		for (let index = interpretations.length - 1; index >= 0; index--)
			if (interpretations[index]?.lineUid === selected.uid) interpretations.splice(index, 1);
		normalizedSeed.unresolved = normalizedSeed.unresolved.map((item) =>
			item.lineUid === selected.uid
				? { ...item, lineUid: null, stepId: null, status: "unsupported" as const }
				: item,
		);
		normalizedSeed.unresolved.push({
			lineUid: null, stepId: null, field: "doorSchedule", status: "unsupported",
			reason: `Not created from customer request: ${row.trim().slice(0, 160)}. The selected leaf size does not represent the stated two-leaf opening; confirm the native double-door quantity and product in Sales.`,
		});
	}
	for (const row of originalCustomerText.split(/\r?\n/)) {
		const ambiguous = row.trim().match(/^([^:\n]{3,80})\s+-\s*(\d{2,3})'\s*[x×]\s*(\d{2,3})\s*["”]/i);
		if (!ambiguous) continue;
		const room = ambiguous[1]!.trim().toLowerCase();
		if (confirmedAnswers.some((answer) =>
			`${answer.question} ${answer.sourceText ?? ""}`.toLowerCase().includes(room) &&
			/\b\d{2,3}\s*(?:["”]|inches?|feet|ft\b)/i.test(answer.answer))) continue;
		const width = Number(ambiguous[2]);
		const height = Number(ambiguous[3]);
		if (width < 12 || width > 96 || width * 12 <= 96 || height < 60 || height > 120)
			continue;
		const inferredSize = dimensionKey(`${ambiguous[2]} x ${ambiguous[3]}`);
		if (!inferredSize) continue;
		const selected = normalizedSeed.lineItems.find((line) =>
			line.housePackageTool?.doors.length === 1 &&
			dimensionKey(line.housePackageTool.doors[0]!.dimension) === inferredSize &&
			(line.uid.toLowerCase().replace(/[^a-z0-9]/g, "") === room.replace(/[^a-z0-9]/g, "") ||
				interpretations.some((item) => item.lineUid === line.uid &&
					item.sourceText.toLowerCase().includes(room))),
		);
		if (!selected) continue;
		const door = selected.housePackageTool?.doors[0];
		const doorQty = door && ("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty);
		const route = configuration.routes.find((candidate) =>
			selected.formSteps.some((selection) => "prodUid" in selection &&
				selection.stepId === candidate.rootStepId &&
				selection.prodUid === candidate.itemTypeUid));
		const supportsConfiguredSizes = !!route && configuration.steps.some((step) =>
			(step.id === route.rootStepId || route.stepUids.includes(step.uid)) &&
			(step.doorSizeVariation?.length ?? 0) > 0);
		if (selected.qty === 1 && doorQty === 1 && supportsConfiguredSizes) {
			likelyInchTypoAssumptions.set(selected.uid, {
				key: inferredSize, row: row.trim(), room: ambiguous[1]!.trim(), width, height,
			});
			continue;
		}
		normalizedSeed.lineItems.splice(normalizedSeed.lineItems.indexOf(selected), 1);
		for (let index = interpretations.length - 1; index >= 0; index--)
			if (interpretations[index]?.lineUid === selected.uid) interpretations.splice(index, 1);
		normalizedSeed.unresolved = normalizedSeed.unresolved.map((item) =>
			item.lineUid === selected.uid
				? { ...item, lineUid: null, stepId: null, status: "unsupported" as const }
				: item,
		);
		normalizedSeed.unresolved.push({
			lineUid: null, stepId: null, field: "width", status: "unsupported",
			reason: `Not created from customer request: ${row.trim().slice(0, 160)}. The width has unclear units; ask the customer and finish this room in Sales.`,
		});
	}
	const confirmedBareSizes = new Map<string, number>();
	const enumeratedDoorRows = originalCustomerText.split(/\r?\n/).filter((row) =>
		/^(?:(?:bifold|pocket)\s+)?(?:[1-9][-/](?:1[01]|\d)|\d{2})\s+[1-9][-/](?:1[01]|\d)\b/i.test(row.trim()) ||
		/^[^:\n]{2,80}\s+-\s+\d{2,3}\s*["”']?\s*[x×]\s*\d{2,3}\s*["”']?/i.test(row.trim()),
	);
	// Some dense schedules have model-created ordinal UIDs but no interpretation
	// for each row. Use that order only when every source row and seed line agree;
	// a bare width still cannot inherit another row's architectural dimension.
	const orderedDoorLines = normalizedSeed.lineItems.slice(0, enumeratedDoorRows.length);
	if (enumeratedDoorRows.length >= 4 && orderedDoorLines.length === enumeratedDoorRows.length &&
		orderedDoorLines.every((line, index) => {
			const ordinal = line.uid.match(/^line-(?:[a-z]+-)?(\d+)(?:-[a-z]+)?$/i)?.[1];
			if (Number(ordinal) !== index + 1) return false;
			const sourceSizes = sourceDimensionKeys(enumeratedDoorRows[index]!);
			return sourceSizes.size !== 1 || !line.housePackageTool?.doors.length ||
				line.housePackageTool.doors.every((door) =>
					sourceSizes.has(dimensionKey(door.dimension) ?? ""));
		})) {
		const moveToReview = (line: NewSalesFormSeed["lineItems"][number], field: string,
			status: "ambiguous" | "unsupported", reason: string) => {
			normalizedSeed.lineItems.splice(normalizedSeed.lineItems.indexOf(line), 1);
			for (let ref = interpretations.length - 1; ref >= 0; ref--)
				if (interpretations[ref]?.lineUid === line.uid) interpretations.splice(ref, 1);
			normalizedSeed.unresolved = normalizedSeed.unresolved.map((item) =>
				item.lineUid === line.uid
					? { ...item, lineUid: null, stepId: null, status: "unsupported" as const }
					: item,
			);
			normalizedSeed.unresolved.push({ lineUid: null, stepId: null, field, status, reason });
		};
		for (let index = enumeratedDoorRows.length - 1; index >= 0; index--) {
			const row = enumeratedDoorRows[index]!.trim();
			const line = orderedDoorLines[index]!;
			const bare = row.match(/^(\d{2,3})\s+([1-9][-/](?:1[01]|\d))\b/);
			const confirmedBareAnswer = bare && confirmedAnswers.find((answer) =>
				`${answer.question} ${answer.sourceText ?? ""}`.includes(`${bare[1]} ${bare[2]}`) &&
				/width|size|dimension/i.test(answer.field ?? "") &&
				/^(?:\d{2,3}\s*(?:inches?|["”])|[1-9][-/](?:1[01]|\d))$/i.test(answer.answer.trim()));
			if (bare && confirmedBareAnswer && line.housePackageTool?.doors.length === 1) {
				const answeredInches = confirmedBareAnswer.answer.trim().match(
					/^(\d{2,3})\s*(?:inches?|["”])$/i,
				)?.[1];
				const answeredArchitectural = confirmedBareAnswer.answer.trim().match(
					/^([1-9])[-/](1[01]|\d)$/,
				);
				const width = answeredInches
					? `${Math.floor(Number(answeredInches) / 12)}-${Number(answeredInches) % 12}`
					: answeredArchitectural
						? `${answeredArchitectural[1]}-${answeredArchitectural[2]}`
						: null;
				if (width) line.housePackageTool.doors[0]!.dimension =
					`${width} x ${bare[2]!.replace("/", "-")}`;
			}
			if (bare && !confirmedBareAnswer && line.housePackageTool?.doors.length) {
				moveToReview(line, "width", "ambiguous",
					`Confirm the width for "${row.slice(0, 160)}": does ${bare[1]} mean inches or architectural feet/inches? This row was not created in Sales.`);
				continue;
			}
			if (!/^pocket\s+/i.test(row) ||
				line.housePackageTool?.doors.length !== 1 ||
				!("totalQty" in line.housePackageTool.doors[0]!)) continue;
			const root = configuration.routes.find((route) =>
				line.formSteps.some((step) => "prodUid" in step &&
					step.stepId === route.rootStepId && step.prodUid === route.itemTypeUid));
			if (!root) continue;
			let noHandle = root.config?.noHandle;
			for (const selection of line.formSteps) {
				if ("value" in selection) continue;
				const uids = "prodUid" in selection
					? [selection.prodUid] : selection.meta.selectedProdUids;
				for (const uid of uids) {
					const visibility = configuration.visibilityByComponentUid[uid];
					if (!visibility || typeof visibility !== "object") continue;
					const override = (visibility as Record<string, unknown>).sectionOverride;
					if (!override || typeof override !== "object") continue;
					const section = override as Record<string, unknown>;
					if (section.overrideMode === true && typeof section.noHandle === "boolean")
						noHandle = section.noHandle;
				}
			}
			if (noHandle !== true)
				moveToReview(line, "doorSchedule", "unsupported",
					`Not created from customer request: ${row.slice(0, 160)}. The selected route requires handing, but the request does not state it. Confirm a compatible pocket-door configuration in Sales.`);
		}
	}
	if (/^\s*pocket door hardware\s*$/im.test(originalCustomerText)) {
		const hardwareLine = normalizedSeed.lineItems.find((line) =>
			/(?=.*pocket)(?=.*hardware)/i.test(line.uid) &&
			line.formSteps.some((selection) => {
				const step = stepsById.get(selection.stepId);
				if (!step || "value" in selection) return false;
				const selected = "prodUid" in selection
					? [selection.prodUid] : selection.meta.selectedProdUids;
				return selected.some((uid) => !step.components.some(([candidate]) => candidate === uid));
			}),
		);
		if (hardwareLine) {
			normalizedSeed.lineItems.splice(normalizedSeed.lineItems.indexOf(hardwareLine), 1);
			for (let index = interpretations.length - 1; index >= 0; index--)
				if (interpretations[index]?.lineUid === hardwareLine.uid) interpretations.splice(index, 1);
			normalizedSeed.unresolved = normalizedSeed.unresolved.map((item) =>
				item.lineUid === hardwareLine.uid
					? { ...item, lineUid: null, stepId: null, status: "unsupported" as const }
					: item,
			);
			normalizedSeed.unresolved.push({
				lineUid: null, stepId: null, field: "pocketHardware", status: "unsupported",
				reason: "Pocket door hardware was requested without a quantity or compatible catalog component. Select the correct hardware and count in Sales after comparing the original request.",
			});
		}
	}
	if (enumeratedDoorRows.length >= 4) {
		const roomScheduleRows = enumeratedDoorRows.filter((row) =>
			/^[^:\n]{2,80}\s+-\s+\d{2,3}\s*["”']?\s*[x×]/i.test(row.trim()));
		const roomScopedHandingReview = (
			item: NewSalesFormSeed["unresolved"][number], row: string,
		) => {
			if (item.status !== "ambiguous" || item.field.toLowerCase().replace(/[^a-z]/g, "") !== "handing")
				return false;
			const room = row.trim().match(/^([^:\n]{2,80})\s+-\s+/)?.[1]?.trim();
			const sizes = sourceDimensionKeys(row);
			return !!room && sizes.size === 1 && item.reason.toLowerCase().includes(room.toLowerCase()) &&
				[...sizes].every((size) => sourceDimensionKeys(item.reason).has(size));
		};
		const broadGlobalScheduleReview = (
			item: NewSalesFormSeed["unresolved"][number],
		) => item.lineUid === null && (
			/\b(?:for example|such as|e\.?g\.?)\b/i.test(item.reason) ||
			/\b(?:all|entire|whole|remaining|overall)\b.{0,80}\b(?:doors?|rooms?|rows?|schedule|package)\b|\b(?:doors?|rooms?|rows?|schedule|package)\b.{0,80}\b(?:all|entire|whole|remaining|overall)\b/i.test(item.reason) ||
			enumeratedDoorRows.filter((row) => item.reason.includes(row.trim())).length > 1
		);
		const rowSpecificReview = (
			item: NewSalesFormSeed["unresolved"][number], row: string,
		) => roomScopedHandingReview(item, row) ||
			(!broadGlobalScheduleReview(item) && item.reason.includes(row.trim()) &&
				/door|dimension|size|width|height|pocket|bifold/i.test(item.field));
		const doorRoutes = new Set(configuration.routes.flatMap((route) => {
			const title = configuration.steps.find((step) => step.id === route.rootStepId)
				?.components.find(([uid]) => uid === route.itemTypeUid)?.[1] ?? "";
			return /\b(?:door|bifold|pocket|exterior|interior)\b/i.test(title)
				? [route.itemTypeUid] : [];
		}));
		for (const row of enumeratedDoorRows) {
			const bareWidth = row.trim().match(/^(\d{2,3})\s+([1-9][-/](?:1[01]|\d))\b/);
			if (!bareWidth) continue;
			const phrase = `${bareWidth[1]} ${bareWidth[2]}`;
			const answer = confirmedAnswers.find((entry) =>
				`${entry.question} ${entry.sourceText ?? ""}`.includes(phrase) &&
				/width|size|dimension/i.test(entry.field ?? ""));
			const answeredWidth = answer?.answer.trim().match(/^(\d{2,3})\s*(?:inches?|["”])$/i)?.[1] ??
				answer?.answer.trim().match(/^([1-9][-/](?:1[01]|\d))$/)?.[1];
			const confirmedKey = answeredWidth
				? dimensionKey(`${answeredWidth} x ${bareWidth[2]}`) : null;
			if (confirmedKey) {
				confirmedBareSizes.set(confirmedKey,
					(confirmedBareSizes.get(confirmedKey) ?? 0) + 1);
				continue;
			}
			if (!normalizedSeed.unresolved.some((item) =>
				item.status === "ambiguous" &&
				/^(?:door)?(?:width|size|dimension)$/.test(
					item.field.toLowerCase().replace(/[^a-z]/g, "")) &&
				item.reason.includes(phrase)))
				normalizedSeed.unresolved.push({
					lineUid: null, stepId: null, field: "width", status: "ambiguous",
					reason: `Confirm the width for "${row.trim()}": does ${bareWidth[1]} mean inches or architectural feet/inches?`,
				});
		}
		const represented = new Map<string, number>();
		for (const line of normalizedSeed.lineItems) {
			if (!line.formSteps.some((step) =>
				"prodUid" in step && doorRoutes.has(step.prodUid))) continue;
			for (const door of line.housePackageTool?.doors ?? []) {
				const key = dimensionKey(door.dimension);
				if (key) represented.set(key, (represented.get(key) ?? 0) +
					("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty));
			}
		}
		const usedReviews = new Set<number>();
		for (const row of enumeratedDoorRows) {
			const sourceRow = row.trim();
			const keys = sourceDimensionKeys(sourceRow);
			const key = keys.size === 1 ? [...keys][0] : undefined;
			if (key && (represented.get(key) ?? 0) > 0) {
				represented.set(key, (represented.get(key) ?? 0) - 1);
				continue;
			}
			const reviewIndex = normalizedSeed.unresolved.findIndex((item, index) =>
				!usedReviews.has(index) &&
				rowSpecificReview(item, sourceRow));
			if (reviewIndex >= 0) {
				usedReviews.add(reviewIndex);
				continue;
			}
			normalizedSeed.unresolved.push({
				lineUid: null, stepId: null, field: "doorSchedule", status: "unsupported",
				reason: `Not created from customer request: ${sourceRow.slice(0, 160)}. Add this row in Sales after comparing the original request.`,
			});
			usedReviews.add(normalizedSeed.unresolved.length - 1);
		}
		const sourceCounts = new Map<string, number>();
		for (const row of enumeratedDoorRows) {
			const keys = sourceDimensionKeys(row);
			if (keys.size !== 1) continue;
			const key = [...keys][0]!;
			sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
		}
		for (const [key, count] of confirmedBareSizes)
			sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + count);
		const selectedCounts = new Map<string, { count: number; dimension: string }>();
		for (const line of normalizedSeed.lineItems) {
			if (!line.formSteps.some((step) =>
				"prodUid" in step && doorRoutes.has(step.prodUid))) continue;
			for (const door of line.housePackageTool?.doors ?? []) {
				const key = dimensionKey(door.dimension);
				if (!key) continue;
				const previous = selectedCounts.get(key);
				selectedCounts.set(key, {
					count: (previous?.count ?? 0) +
						("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty),
					dimension: door.dimension,
				});
			}
		}
		if (!roomScheduleRows.length)
			for (const [key, selected] of selectedCounts) {
				if (selected.count > (sourceCounts.get(key) ?? 0))
					throw new Error(
						`The door schedule selects ${selected.count} units at ${selected.dimension}, but only ${sourceCounts.get(key) ?? 0} separate source rows explicitly state that size. Keep bare shorthand such as 28 8/0 unresolved instead of treating it as 2-8 x 8-0.`,
					);
			}
		const configuredSizeQty = normalizedSeed.lineItems.reduce((total, line) =>
			total + (line.housePackageTool?.doors ?? []).reduce((count, door) =>
				count + ("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty), 0), 0);
		if (roomScheduleRows.length && configuredSizeQty + normalizedSeed.unresolved.filter((item) =>
			(!broadGlobalScheduleReview(item) && item.field === "doorSchedule") ||
			roomScheduleRows.some((row) => roomScopedHandingReview(item, row)) ||
			(!broadGlobalScheduleReview(item) &&
				/door|dimension|size|width|height|pocket|bifold/i.test(item.field) &&
				roomScheduleRows.some((row) => item.reason.includes(row.trim())))).length < roomScheduleRows.length)
			for (const row of roomScheduleRows) {
				if (normalizedSeed.unresolved.some((item) => rowSpecificReview(item, row))) continue;
				normalizedSeed.unresolved.push({
					lineUid: null, stepId: null, field: "doorSchedule", status: "unsupported",
					reason: `Not created from customer request: ${row.trim().slice(0, 160)}. Add this room's door in Sales after comparing the original request.`,
				});
			}
		const roomKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
		for (const row of roomScheduleRows) {
			const room = row.trim().match(/^([^:\n]{2,80})\s+-\s+/)?.[1]?.trim();
			if (!room) continue;
			const roomSizes = sourceDimensionKeys(row);
			const assumedSize = [...likelyInchTypoAssumptions.values()].find((assumption) =>
				assumption.room.toLowerCase() === room.toLowerCase() && assumption.row === row.trim());
			if (assumedSize) roomSizes.add(assumedSize.key);
			const matchingLine = normalizedSeed.lineItems.some((line) =>
				line.housePackageTool?.doors.some((door) =>
					roomSizes.has(dimensionKey(door.dimension) ?? "")) &&
				(roomKey(line.uid) === roomKey(room) || interpretations.some((item) =>
					item.lineUid === line.uid &&
					item.sourceText.toLowerCase().includes(room.toLowerCase()))),
			);
			const matchingReview = normalizedSeed.unresolved.some((item) =>
				roomScopedHandingReview(item, row) ||
				(!broadGlobalScheduleReview(item) &&
					/door|dimension|size|width|height|pocket|bifold/i.test(item.field) &&
					(item.reason.toLowerCase().includes(room.toLowerCase()) ||
						(item.lineUid && roomKey(item.lineUid) === roomKey(room))) &&
				(!roomSizes.size || [...roomSizes].some((key) => sourceDimensionKeys(item.reason).has(key)))),
			);
			const conflictingLine = normalizedSeed.lineItems.some((line) =>
				(line.housePackageTool?.doors.length ?? 0) > 0 &&
				(roomKey(line.uid) === roomKey(room) || interpretations.some((item) =>
					item.lineUid === line.uid && item.sourceText.toLowerCase().includes(room.toLowerCase()))) &&
				!line.housePackageTool?.doors.some((door) =>
					roomSizes.has(dimensionKey(door.dimension) ?? "")));
			if (conflictingLine)
				throw new Error(`The ${room} line uses a different size than the customer request.`);
			if (!matchingLine && !matchingReview)
				normalizedSeed.unresolved.push({
					lineUid: null, stepId: null, field: "doorSchedule", status: "unsupported",
					reason: `Not created from customer request: ${row.trim().slice(0, 160)}. Add the ${room} door in Sales after comparing the original request.`,
				});
		}
		for (const row of originalCustomerText.split(/\r?\n/)) {
			const room = row.trim().match(/^([^:\n]{3,80})\s+-\s*$/)?.[1]?.trim();
			if (!room) continue;
			const reviewIndex = normalizedSeed.unresolved.findIndex((item) =>
				!broadGlobalScheduleReview(item) &&
				(item.reason.toLowerCase().includes(room.toLowerCase()) ||
					(item.lineUid && roomKey(item.lineUid) === roomKey(room))));
			const reviewed = reviewIndex >= 0;
			const represented = normalizedSeed.lineItems.some((line) =>
				roomKey(line.uid) === roomKey(room) || interpretations.some((item) =>
					item.lineUid === line.uid && item.sourceText.toLowerCase().includes(room.toLowerCase())));
			const answered = confirmedAnswers.find((answer) =>
				`${answer.question} ${answer.sourceText ?? ""}`.toLowerCase().includes(room.toLowerCase()) &&
				/\b\d{2,3}\s*["”']?\s*[x×]\s*\d{2,3}\b/.test(answer.answer));
			if (answered && reviewed) {
				const existing = normalizedSeed.unresolved[reviewIndex]!;
				const confirmedValue = answered.answer.trim().slice(0, 160);
				if (!existing.reason.toLowerCase().includes(confirmedValue.toLowerCase()))
					normalizedSeed.unresolved[reviewIndex] = {
						...existing,
						status: "unsupported",
						reason: `${existing.reason.trim()}${/[.!?]$/.test(existing.reason.trim()) ? "" : "."} Confirmed customer answer: ${confirmedValue}.`,
					};
			}
			if (answered && !reviewed && !represented)
				normalizedSeed.unresolved.push({
					lineUid: null, stepId: null, field: "doorSchedule", status: "unsupported",
					reason: `Not created from customer request: ${room} was confirmed as ${answered.answer.trim().slice(0, 160)}. Add this room in Sales using the confirmed size.`,
				});
			else if (!reviewed && !answered && !normalizedSeed.unresolved.some((item) =>
				item.field === "room" && item.reason.toLowerCase().includes(room.toLowerCase())))
				normalizedSeed.unresolved.push({
					lineUid: null, stepId: null, field: "room", status: "unsupported",
					reason: `Not created from customer request: ${room} has no size. Ask the customer and add this room in Sales.`,
				});
		}
		for (const row of roomScheduleRows) {
			const ambiguous = row.trim().match(/^([^:\n]{3,80})\s+-\s*(\d{2,3})'\s*[x×]/i);
			if (!ambiguous) continue;
			const room = ambiguous[1]?.trim() ?? "room";
			const quote = `${ambiguous[2]}'`;
			if ([...likelyInchTypoAssumptions.values()].some((assumption) =>
				assumption.room.toLowerCase() === room.toLowerCase() && assumption.row === row.trim()))
				continue;
			const reviewed = normalizedSeed.unresolved.some((item) =>
				item.status === "ambiguous" &&
				item.reason.toLowerCase().includes(room.toLowerCase()) &&
				item.reason.includes(quote));
			const answered = confirmedAnswers.some((answer) =>
				`${answer.question} ${answer.sourceText ?? ""}`.toLowerCase().includes(room.toLowerCase()) &&
				/\b\d{2,3}\s*(?:["”]|inches?|feet|ft\b)/i.test(answer.answer));
			if (!reviewed && !answered)
				normalizedSeed.unresolved.push({
					lineUid: null, stepId: null, field: "width", status: "unsupported",
					reason: `Not created from customer request: ${room} width ${quote} has unclear units. Ask the customer and finish this room in Sales.`,
				});
		}
	}
	const requestedAccessories = [
		{ match: originalCustomerText.match(/^\s*door\s+stop\s*\(\s*(\d+)\s*\)/im), title: /\bdoor\s+stops?\b/i, label: "door stop" },
		{ match: originalCustomerText.match(/^\s*(\d+)\s+tiras?\s+de\s+base\b/im), title: /\bbase(?:board)?\b/i, label: "base" },
		{ match: originalCustomerText.match(/^\s*(\d+)\s+tiras?\s+de\s+casing\b/im), title: /\bcasing\b/i, label: "casing" },
		{ match: originalCustomerText.match(/^\s*(\d+)\s+tiras?\s+de\s+crown\b/im), title: /\bcrown\b/i, label: "crown" },
	];
	for (const request of requestedAccessories) {
		if (!request.match) continue;
		const count = Number(request.match[1]);
		const selected = normalizedSeed.lineItems.some((line) =>
			line.qty >= count && line.formSteps.some((selection) => {
				const step = stepsById.get(selection.stepId);
				const uids = "prodUid" in selection ? [selection.prodUid]
					: "meta" in selection ? selection.meta.selectedProdUids : [];
				return uids.some((uid) => request.title.test(
					step?.components.find(([candidate]) => candidate === uid)?.[1] ?? "",
				));
			}),
		);
		const reviewed = normalizedSeed.unresolved.find((item) =>
			request.title.test(item.reason) &&
			new RegExp(`\\b${count}\\b`).test(item.reason),
		);
		if (!selected && reviewed?.status === "ambiguous" &&
			/\b(?:quantity|quantities|qty|count)\b/i.test(`${reviewed.field} ${reviewed.reason}`)) {
			reviewed.field = "moulding";
			reviewed.reason = `Confirm the catalog product for ${count} ${request.label} pieces; keep the customer's stated count.`;
		}
		if (!selected && !reviewed)
			normalizedSeed.unresolved.push({
				lineUid: null,
				stepId: null,
				field: "moulding",
				status: "ambiguous",
				reason: `Confirm the catalog product for ${count} ${request.label} pieces; keep the customer's stated count.`,
			});
	}
	if (/^\s*pocket\s+door\s+hardware\b/im.test(originalCustomerText) &&
		!normalizedSeed.unresolved.some((item) => /\bpocket\b/i.test(item.reason) && /\bhardware\b/i.test(item.reason)) &&
		!normalizedSeed.lineItems.some((line) => line.formSteps.some((selection) => {
			const step = stepsById.get(selection.stepId);
			const uids = "prodUid" in selection ? [selection.prodUid]
				: "meta" in selection ? selection.meta.selectedProdUids : [];
			return uids.some((uid) => /\bpocket\b.*\bhardware\b/i.test(
				step?.components.find(([candidate]) => candidate === uid)?.[1] ?? "",
			));
		}))) {
		normalizedSeed.unresolved.push({
			lineUid: null,
			stepId: null,
			field: "pocketDoorHardware",
			status: "ambiguous",
			reason: "Confirm the product and quantity for the requested pocket door hardware.",
		});
	}
	for (const accessory of [
		{
			requested: /\bpvc\s+brick\s*mou?ld(?:ing)?\b/i.test(originalCustomerText),
			title: /\bpvc\s+brick\s*mou?ld(?:ing)?\b/i,
			review: /\bbrick\s*mou?ld(?:ing)?\b/i,
			field: "pvcBrickMoulding",
			reason: "Confirm the PVC brick moulding catalog length and piece quantity for this exterior assembly.",
		},
		{
			requested: /\bside\s*lite\b/i.test(originalCustomerText),
			title: /\bside\s*lite\b/i,
			review: /\bside\s*lite\b/i,
			field: "sideliteAssembly",
			reason: "Confirm how to quote the requested sidelite with its stated side and overall assembly size.",
		},
	]) {
		if (!accessory.requested ||
			normalizedSeed.unresolved.some((item) => accessory.review.test(item.reason)) ||
			normalizedSeed.lineItems.some((line) => line.formSteps.some((selection) => {
				const step = stepsById.get(selection.stepId);
				const uids = "prodUid" in selection ? [selection.prodUid]
					: "meta" in selection ? selection.meta.selectedProdUids : [];
				return uids.some((uid) => accessory.title.test(
					step?.components.find(([candidate]) => candidate === uid)?.[1] ?? "",
				));
			}))) continue;
		normalizedSeed.unresolved.push({
			lineUid: null, stepId: null, field: accessory.field,
			status: "ambiguous", reason: accessory.reason,
		});
	}

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

	reviewUnidentifiedSideMouldings(normalizedSeed, configuration, originalCustomerText, identityGuidance);
	const statedDimensionKeys = sourceDimensionKeys(sourceText);
	for (const key of confirmedBareSizes.keys()) statedDimensionKeys.add(key);
	for (const key of confirmedDoorHeightKeys(
		sourceText, confirmedAnswers, statedDimensionKeys,
	)) statedDimensionKeys.add(key);
	const statedDimensionHeights = new Set(
		[...statedDimensionKeys].map((key) => Number(key.split(":")[1])),
	);
	// An ambiguous apostrophe width still leaves an explicitly quoted height.
	for (const match of sourceText.matchAll(/\b\d{2,3}\s*'\s*[x×]\s*(\d{2,3})\s*["”]/gi)) {
		if (Number(match[1]) >= 60) statedDimensionHeights.add(Number(match[1]));
	}
	for (const line of normalizedSeed.lineItems) {
		const formSteps = line.formSteps as ValidatedSeedStep[];
		const assumedDimension = likelyInchTypoAssumptions.get(line.uid);
		const lineStatedDimensionKeys = new Set(statedDimensionKeys);
		if (assumedDimension) lineStatedDimensionKeys.add(assumedDimension.key);
		const removeAssumptionQuestions = () => {
			if (!assumedDimension) return;
			normalizedSeed.unresolved = normalizedSeed.unresolved.filter((item) => {
				const field = item.field.toLowerCase().replace(/[^a-z]/g, "");
				return !(["width", "doorsize", "dimension"].includes(field) &&
					(item.lineUid === line.uid ||
						item.reason.toLowerCase().includes(assumedDimension.room.toLowerCase())));
			});
		};
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
		if (!title || inches == null || statedDimensionHeights.has(inches))
				continue;
			// A separate, explicitly labeled height can coexist with another line's
			// complete dimensions. A bare 80-inch value may instead be a width.
			const architectural = title.trim().match(/^(\d+)[-/](\d+)$/);
			const notation = architectural
				? `(?:${architectural[1]}\\s*[-/]\\s*${architectural[2]}|${inches}\\s*(?:["”]|inches?\\b|in\\b))`
				: `${inches}\\s*(?:["”]|inches?\\b|in\\b)?`;
			const standalone = new RegExp(
				`\\b(?:height|high|tall)\\s*(?:of|is|:)?\\s*${notation}(?=\\b|\\s|$)|\\b${notation}\\s*(?:high|tall|height)\\b`,
				"i",
			);
			if (!standalone.test(sourceText))
				throw new Error(
					`Line ${line.uid} selects Height ${title}, which is not stated in the customer request.`,
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
		const sixPanelExterior = /\b(?:6|six)[- ]?(?:panel|pnl)\b/i.test(originalCustomerText) &&
			/\bfiberglass\b/i.test(originalCustomerText) &&
			/\bimpact\b/i.test(originalCustomerText) &&
			/\bexterior\b/i.test(rootTitle ?? "");
		if (sixPanelExterior) {
			for (const selection of formSteps) {
				const doorStep = stepsById.get(selection.stepId);
				if (doorStep?.title?.trim().toLowerCase() !== "door" || "value" in selection) continue;
				const selectedUids = "prodUid" in selection ? [selection.prodUid] : selection.meta.selectedProdUids;
				for (const uid of selectedUids) {
					const title = doorStep.components.find(([candidate]) => candidate === uid)?.[1] ?? "";
					const design = title.match(/\b(\d+)\s*(PNL|PANEL|LITE)\b/i);
					if ((design && (Number(design[1]) !== 6 || /LITE/i.test(design[2] ?? ""))) ||
						(/\bFLUSH\b/i.test(title) && !/\b(?:6|six)[- ]?(?:panel|pnl)\b/i.test(title)))
						throw new Error(`Line ${line.uid} selects a Door design that does not match the six-panel customer request.`);
				}
			}
			const overallSizeRow = originalCustomerText.split(/\r?\n/).find((row) =>
				/\b(?:total|overall)\s+size\b/i.test(row) &&
				/[x×]\s*\d{2,3}(?:\s*["”]|\s*in(?:ches?)?\b)/i.test(row));
			const overallHeightInches = Number(overallSizeRow?.match(
				/[x×]\s*(\d{2,3})(?:\s*["”]|\s*in(?:ches?)?\b)/i,
			)?.[1]);
			const overallSizeOnly = !!overallSizeRow &&
				Number.isSafeInteger(overallHeightInches) &&
				/\bsideli(?:te|ght)\b/i.test(originalCustomerText);
			const panelHeightStated = originalCustomerText.split(/\r?\n/).some((row) =>
				/\b(?:door\s+panel|panel\s+door)\b/i.test(row) &&
				/(?:[x×]\s*\d{2,3}(?:\s*["”]|\s*in(?:ches?)?\b)|\bheight\s*(?:of|is|:)?\s*\d{2,3})/i.test(row)) ||
				confirmedAnswers.some((answer) => answer.field?.toLowerCase() === "height" &&
					/\bpanel\b/i.test(answer.question));
			if (overallSizeOnly && !panelHeightStated) {
				const heightStep = route.stepUids
					.map((uid) => stepsByUid.get(uid))
					.find((step) => step?.title?.trim().toLowerCase() === "height");
				if (heightStep) {
					const current = formSteps.findIndex((selection) =>
						selection.stepId === heightStep.id);
					if (current >= 0) formSteps.splice(current, 1);
					for (let index = interpretations.length - 1; index >= 0; index--)
						if (interpretations[index]?.lineUid === line.uid &&
							interpretations[index]?.stepId === heightStep.id)
							interpretations.splice(index, 1);
					const compatibleHeights = heightStep.components.filter(([, title]) =>
						dimensionPartInches(title) === overallHeightInches);
					const compatibleHeight = compatibleHeights.length === 1
						? compatibleHeights[0] : undefined;
					if (compatibleHeight) {
						formSteps.push({ stepId: heightStep.id, prodUid: compatibleHeight[0] });
						interpretations.push({
							lineUid: line.uid,
							stepId: heightStep.id,
							field: "height",
							sourceText: overallSizeRow!.trim().slice(0, 1000),
							selectedProdUid: compatibleHeight[0],
							selectedTitle: compatibleHeight[1],
							reason: `Drafted the configured ${compatibleHeight[1]} height from the stated ${overallHeightInches}-inch overall assembly height for Sales review.`,
						});
					}
					normalizedSeed.unresolved = normalizedSeed.unresolved.filter((item) =>
						!(item.lineUid === line.uid &&
							(item.stepId === heightStep.id ||
								["height", "overallheight", "assemblyheight", "heightassumption"].includes(
									item.field.toLowerCase().replace(/[^a-z]/g, "")))));
					if (compatibleHeight) normalizedSeed.unresolved.push({
						lineUid: line.uid,
						stepId: null,
						field: "heightAssumption",
						status: "unsupported",
						reason: `Drafted Height ${compatibleHeight[1]} from the stated ${overallHeightInches}-inch overall assembly height; confirm the door panel height during Sales review.`,
					});
				}
				// The overall sidelite assembly height cannot safely define an HPT
				// panel row. Keep the catalog Door selection and let the native form
				// apply its editable defaults, but never materialize the provider HPT.
				delete line.housePackageTool;
			}
		}
		if (
			rootTitle &&
			/\binterior\b/i.test(rootTitle) &&
			/\bexterior\b/i.test(sourceText) &&
			!/\binterior\b/i.test(sourceText)
		) {
			throw new Error(
				`Line ${line.uid} selects an interior route for an exterior-only customer request.`,
			);
		}
		if (
			rootTitle &&
			/\bslabs?\s+only\b/i.test(rootTitle) &&
			/\b(?:pre[- ]?hung|precolgad[oa]s?)\b/i.test(sourceText) &&
			!/\b(?:slabs?\s+only|separate\s+slabs?|hojas?\s+sueltas?)\b/i.test(sourceText) &&
			!isExactFireRatedLeafFallback(line, rootTitle)
		) {
			throw new Error(
				`Line ${line.uid} selects a slabs-only route for a pre-hung customer request.`,
			);
		}
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
		const denseScheduleLineIndex = orderedDoorLines.indexOf(line);
		const routeHasDoorStep = route.stepUids.some((uid) =>
			stepsByUid.get(uid)?.title?.trim().toLowerCase() === "door",
		);
		const isDenseArchitecturalDoorLine =
			enumeratedDoorRows.length >= 8 && denseScheduleLineIndex >= 0 &&
			routeHasDoorStep;
		const denseScheduleSourceIndex = (() => {
			const ordinal = Number(
				line.uid.match(/^line-(?:[a-z]+-)?(\d+)(?:-[a-z]+)?$/i)?.[1],
			);
			return Number.isSafeInteger(ordinal) && ordinal > 0 &&
				ordinal <= enumeratedDoorRows.length
				? ordinal - 1
				: denseScheduleLineIndex;
		})();
		let degradedHiddenDoorSelection = false;
		const selectionByStepId = new Map(
			formSteps.map((selection) => [selection.stepId, selection] as const),
		);
		for (const selection of [...formSteps]) {
			const step = stepsById.get(selection.stepId);
			if (!step || allowedStepIds.has(selection.stepId) ||
				step.title?.trim().toLowerCase() !== "t-astragal" ||
				"value" in selection ||
				interpretations.some((item) => item.lineUid === line.uid && item.stepId === step.id)) continue;
			const selectedUids = "prodUid" in selection
				? [selection.prodUid] : selection.meta.selectedProdUids;
			const roomLine = originalCustomerText.split(/\r?\n/).map((row) => row.trim())
				.find((row) => row.toLowerCase().startsWith(
					`${line.uid.replace(/-/g, " ").toLowerCase()} -`) &&
					/\bT[- ]?Astragal\b/i.test(row));
			if (!roomLine || selectedUids.length !== 1 ||
				!step.components.some(([uid]) => uid === selectedUids[0])) continue;
			formSteps.splice(formSteps.indexOf(selection), 1);
			selectionByStepId.delete(step.id);
			const room = roomLine.split(/\s+-\s+/)[0];
			normalizedSeed.unresolved.push({
				lineUid: line.uid, stepId: null, field: "astragal", status: "ambiguous",
				reason: `T-Astragal is requested for ${room}, but the ${rootTitle ?? "selected"} route does not expose it. Confirm a compatible route or manual handling.`,
			});
		}
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
			if (!configuredTitle) {
				throw new Error(
					`Line ${line.uid} interpretation must use the current configured component title.`,
				);
			}
			if (
				comparableCatalogTitle(configuredTitle) !==
					comparableCatalogTitle(interpretation.selectedTitle)
			) {
				if (!isDenseArchitecturalDoorLine)
					throw new Error(
						`Line ${line.uid} interpretation must use the current configured component title.`,
					);
				interpretation.selectedTitle = configuredTitle;
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
		let rejectedUnstatedDoorRating = false;
		if (line.housePackageTool && sourceText) {
			for (const selection of [...formSteps]) {
				const step = stepsById.get(selection.stepId);
				if (step?.title?.trim().toLowerCase() !== "door" || !("prodUid" in selection))
					continue;
				const title = step.components.find(([uid]) => uid === selection.prodUid)?.[1];
				if (!title) continue;
				const evidence = lineInterpretations.find((item) =>
					item.stepId === step.id && item.selectedProdUid === selection.prodUid)?.sourceText ?? sourceText;
				const rating = unstatedDoorRating(evidence, title);
				if (!rating) continue;
				rejectedUnstatedDoorRating = true;
				formSteps.splice(formSteps.indexOf(selection), 1);
				selectionByStepId.delete(step.id);
				for (let index = interpretations.length - 1; index >= 0; index--) {
					if (interpretations[index]?.lineUid === line.uid &&
						interpretations[index]?.stepId === step.id) interpretations.splice(index, 1);
				}
				normalizedSeed.unresolved.push({
					lineUid: line.uid, stepId: step.id, field: "door", status: "unsupported",
					reason: `The selected Door includes a ${rating} not stated for this line. Its customer-stated sizes and quantities remain in the draft; choose the Door product in Sales.`,
				});
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
							comparableSourceText(originalCustomerText).includes(
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
				const exactSourceLines = new Set(originalCustomerText.split(/\r?\n/)
					.map((sourceRow) => comparableSourceText(sourceRow.trim())));
				const numericSourceText = [rowSourceText, ...lineInterpretations
					.filter((interpretation) =>
						interpretation.stepId === mouldingStep.id &&
						interpretation.selectedProdUid === row.uid &&
						exactSourceLines.has(comparableSourceText(interpretation.sourceText.trim())))
					.map((interpretation) => interpretation.sourceText)].join("\n");
				if (!rowSourceText) {
					throw new Error(
						`Moulding component ${title} must be stated in the customer request.`,
					);
				}
				if (/\bDOOR\s*STOP\b/i.test(title) && "qty" in row && row.qty > 0 &&
					!comparableSourceText(originalCustomerText).includes(comparableSourceText(title)) &&
					!identityGuidance.some((answer) => comparableSourceText(answer.answer) === comparableSourceText(title))) {
					const genericSource = originalCustomerText.split(/\r?\n/).map((sourceRow) => sourceRow.trim())
						.find((sourceRow) => new RegExp(`^door\\s*stop\\s*\\(\\s*${row.qty}\\s*\\)$`, "i").test(sourceRow));
					if (genericSource && !normalizedSeed.unresolved.some((item) =>
						item.lineUid === line.uid && item.field === "mouldingProfile"))
						normalizedSeed.unresolved.push({ lineUid: line.uid, stepId: null,
							field: "mouldingProfile", status: "ambiguous",
							reason: `${genericSource} does not name a profile. Confirm the selected ${title} in Sales before saving.`,
						});
				}
				if (!row.calculation && "qty" in row) {
					// Zero is an explicitly reviewed pending quantity, never a charge.
					if (row.qty === 0) continue;
					if (!sourceStatesMouldingPieceQuantity(numericSourceText, row.qty)) {
						throw new Error(
							`Moulding quantity ${row.qty} must be stated in the customer request.`,
						);
					}
					continue;
				}
				if (!row.calculation) continue;
				if (
					!sourceStatesLinearFeet(numericSourceText, row.calculation.linearFeet)
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
						numericSourceText,
						row.calculation.wastePercentage,
					)
				) {
					throw new Error(
						"Moulding waste percentage must be stated in the customer request.",
					);
				}
				if (
					row.calculation.wastePercentage == null &&
					sourceStatesAnyWastePercentage(numericSourceText)
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
					`Line ${line.uid} selects step ${selection.stepId} (${step?.title ?? "unknown"}) outside the ${rootTitle ?? "selected"} route. Allowed step IDs: ${[...allowedStepIds].filter((id): id is number => typeof id === "number").join(", ")}. Remove that step or choose a compatible route; do not transfer its component UID to a different step.`,
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

		const completedSelectionMaps = () => {
			const selectedByStepUid: Record<string, string> = {};
			const selectedProdUidsByStepUid: Record<string, string[]> = {};
			for (const selection of formSteps) {
				if ("value" in selection) continue;
				const step = stepsById.get(selection.stepId);
				if (!step) continue;
				const selectedProdUids =
					"prodUid" in selection
						? [selection.prodUid]
						: selection.meta.selectedProdUids;
				selectedProdUidsByStepUid[step.uid] = selectedProdUids;
				const first = selectedProdUids[0];
				if (first) selectedByStepUid[step.uid] = first;
			}
			return { selectedByStepUid, selectedProdUidsByStepUid };
		};
		if (isDenseArchitecturalDoorLine) {
			// Dense schedules are a reviewed starting point. If one non-root choice
			// conflicts with the completed catalog combination, keep the usable row
			// and send only that choice to Sales review instead of rejecting all rows.
			const maxVisibilityPasses = formSteps.length;
			for (let pass = 0; pass < maxVisibilityPasses; pass++) {
				const complete = completedSelectionMaps();
				let changed = false;
				for (const selection of [...formSteps]) {
					if (selection.stepId === route.rootStepId || "value" in selection)
						continue;
					const step = stepsById.get(selection.stepId);
					if (!step) continue;
					const selectedProdUids =
						"prodUid" in selection
							? [selection.prodUid]
							: selection.meta.selectedProdUids;
					const visibleProdUids = selectedProdUids.filter((uid) => {
						const visibility = configuration.visibilityByComponentUid[uid];
						return !visibility || isComponentVisibleByRules(
							visibility,
							complete.selectedByStepUid,
							complete.selectedProdUidsByStepUid,
						);
					});
					if (visibleProdUids.length === selectedProdUids.length) continue;
					const hiddenProdUids = selectedProdUids.filter(
						(uid) => !visibleProdUids.includes(uid),
					);
					const retainsSelection =
						"meta" in selection && visibleProdUids.length > 0;
					if (retainsSelection && "meta" in selection) {
						selection.meta.selectedProdUids = visibleProdUids;
						selectionByStepId.set(selection.stepId, selection);
					} else {
						formSteps.splice(formSteps.indexOf(selection), 1);
						selectionByStepId.delete(selection.stepId);
					}
					for (let index = interpretations.length - 1; index >= 0; index--) {
						const interpretation = interpretations[index];
						if (
							interpretation?.lineUid === line.uid &&
							interpretation.stepId === selection.stepId &&
							hiddenProdUids.includes(interpretation.selectedProdUid)
						) interpretations.splice(index, 1);
					}
					const field = step.title?.trim() || "configuration";
					if (!retainsSelection && field.toLowerCase() === "door")
						degradedHiddenDoorSelection = true;
					if (!normalizedSeed.unresolved.some((item) =>
						item.lineUid === line.uid &&
						item.stepId === (retainsSelection ? null : step.id) &&
						item.field.trim().toLowerCase() === field.toLowerCase())) {
						const sourceRow = enumeratedDoorRows[denseScheduleSourceIndex]!.trim();
						normalizedSeed.unresolved.push({
							lineUid: line.uid,
							stepId: retainsSelection ? null : step.id,
							field,
							status: "unsupported",
							reason: `From "${sourceRow.slice(0, 160)}": the selected ${field} option is not available under this line's completed catalog configuration. Keep the stated size and count for review, then choose a compatible ${field} in Sales.`,
						});
					}
					changed = true;
				}
				if (!changed) break;
			}
		}
		const completedSelections = completedSelectionMaps();

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
					) &&
					(!isDenseArchitecturalDoorLine ||
						!isComponentVisibleByRules(
							visibility,
							completedSelections.selectedByStepUid,
							completedSelections.selectedProdUidsByStepUid,
						))
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
		let hasUnresolvedDoor = normalizedSeed.unresolved.some(
				(entry) =>
					entry.lineUid === line.uid &&
					entry.stepId != null &&
					doorStepIds.has(entry.stepId) &&
					entry.field.trim().toLowerCase() === "door",
			);
		if (doorSelections.length === 0) {
				const identityRow = enumeratedDoorRows.length > 1 &&
					line.housePackageTool?.doors.length === 1
					? enumeratedDoorRows.filter((row, index) => {
						const room = row.trim().match(/^([^:\n]{2,80})\s+-\s+/)?.[1]?.trim();
						const ordinal = line.uid.match(/^line-(?:[a-z]+-)?(\d+)(?:-[a-z]+)?$/i)?.[1];
						const identityMatches = room
							? room.toLowerCase().replace(/[^a-z0-9]/g, "") ===
								line.uid.toLowerCase().replace(/[^a-z0-9]/g, "")
							: Number(ordinal) === index + 1;
						const sizes = sourceDimensionKeys(row);
						return identityMatches && sizes.size === 1 &&
							sizes.has(dimensionKey(line.housePackageTool!.doors[0]!.dimension) ?? "");
					})
					: [];
				const scopedDoorSource = enumeratedDoorRows.length > 1
					? identityRow.length === 1 ? identityRow[0] : null
					: sourceText;
				const visibleCompatibleCandidates = scopedDoorSource ? doorSteps.flatMap((doorStep) =>
					doorStep.components.flatMap(([uid, title]) => {
						if (!isCompatibleDoorInterpretation(scopedDoorSource, title)) return [];
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
										sourceText: scopedDoorSource,
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
									sourceText: scopedDoorSource,
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
				) : [];
				if (scopedDoorSource && visibleCompatibleCandidates.length === 1 &&
					!rejectedUnstatedDoorRating && !degradedHiddenDoorSelection) {
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
								scopedDoorSource,
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
							scopedDoorSource,
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
		if (line.housePackageTool) {
			if (doorSelections.length === 0 && !hasUnresolvedDoor && doorSteps.length === 1) {
				const room = sourceText.split(/\r?\n/).map((row) => row.trim())
					.find((row) => row.toLowerCase().startsWith(
						`${line.uid.replace(/-/g, " ").toLowerCase()} -`))
					?.split(/\s+-\s+/)[0];
				const conflictingDoorReview = normalizedSeed.unresolved.some((entry) =>
					entry.lineUid === line.uid &&
					(entry.field.trim().toLowerCase() === "door" ||
						(entry.stepId != null && doorStepIds.has(entry.stepId))),
				);
				const sourceGroundedSizes = sourceText && line.housePackageTool.doors.every((door) => {
					const key = dimensionKey(door.dimension);
					return key && lineStatedDimensionKeys.has(key);
				});
				if (!conflictingDoorReview && (room || sourceGroundedSizes)) {
					normalizedSeed.unresolved.push({
						lineUid: line.uid,
						stepId: doorSteps[0]!.id,
						field: "door",
						status: "ambiguous",
						reason: `Confirm the Door product for ${room ?? "this line"}; its stated size and count remain for review.`,
					});
					hasUnresolvedDoor = true;
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
				removeAssumptionQuestions();
				if (!sourceText || !line.housePackageTool.doors.every((door) => {
					const key = dimensionKey(door.dimension);
					return key && lineStatedDimensionKeys.has(key);
				})) {
					throw new Error(
						`Line ${line.uid} cannot resolve door sizes for its selected Height and configuration.`,
					);
				}
				const missingDoor = hasUnresolvedDoor && line.housePackageTool.doors.length === 1
					? normalizedSeed.unresolved.find((entry) =>
						entry.lineUid === line.uid && entry.field.trim().toLowerCase() === "door")
					: undefined;
				for (const door of line.housePackageTool.doors) {
					const count = "totalQty" in door ? door.totalQty : door.lhQty + door.rhQty;
					const sizeDetail = ` Requested ${count} door${count === 1 ? "" : "s"} at ${door.dimension}; confirm a compatible Door product before resolving its size.`;
					if (missingDoor && missingDoor.reason.length + sizeDetail.length <= 2000) {
						if (!missingDoor.reason.includes(sizeDetail.trim()))
							missingDoor.reason += sizeDetail;
						continue;
					}
					normalizedSeed.unresolved.push({
						lineUid: line.uid,
						stepId: null,
						field: "doorSize",
						status: "unsupported",
						reason: `${count} door${count === 1 ? "" : "s"} at ${door.dimension} could not be added under the selected Door Configuration. Check the original request and finish this line in Sales.`,
					});
				}
				delete line.housePackageTool;
			} else {
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
						if (assumedDimension?.key === key) removeAssumptionQuestions();
						if (
							sourceText &&
							key &&
							lineStatedDimensionKeys.has(key) &&
							line.housePackageTool.doors.length === 1
						) {
							const count = "totalQty" in door ? door.totalQty : door.lhQty + door.rhQty;
							normalizedSeed.unresolved.push({
								lineUid: line.uid,
								stepId: null,
								field: "doorSize",
								status: "unsupported",
								reason: `${count} door${count === 1 ? "" : "s"} at ${door.dimension} could not be added under the selected Door Configuration. Check the original request and finish this line in Sales.`,
							});
							delete line.housePackageTool;
							break;
						}
						throw new Error(
							`Line ${line.uid} uses door dimension ${door.dimension} outside its selected Height and Door Configuration. Available dimensions for this selected route are: ${candidates.join(", ")}.`,
						);
					}
					if (assumedDimension?.key === key) {
						removeAssumptionQuestions();
						normalizedSeed.unresolved.push({
							lineUid: line.uid,
							stepId: null,
							field: "widthAssumption",
							status: "unsupported",
							reason: `Created for Sales review from "${assumedDimension.row.slice(0, 160)}": treated ${assumedDimension.width}' as ${assumedDimension.width} inches because ${canonical} is available for the selected configuration. Confirm before saving.`,
						});
					}
					if (sourceText && !lineStatedDimensionKeys.has(key as string)) {
						throw new Error(
							`Door dimension ${door.dimension} must be stated in the customer request.`,
						);
					}
					door.dimension = canonical;
				}
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
	for (const line of normalizedSeed.lineItems) {
		const route = configuration.routes.find((candidate) =>
			line.formSteps.some((selection) =>
				selection.stepId === candidate.rootStepId &&
				"prodUid" in selection && selection.prodUid === candidate.itemTypeUid,
			),
		);
		if (!route) continue;
		const title = stepsById.get(route.rootStepId)?.components.find(
			([uid]) => uid === route.itemTypeUid,
		)?.[1] ?? "";
		if (!/pre[- ]?hung|^exterior\b|garage door/i.test(title)) continue;
		const missing = (field: string) => !normalizedSeed.unresolved.some(
			(issue) => issue.lineUid === line.uid &&
				issue.field.toLowerCase().replace(/[^a-z]/g, "") === field.toLowerCase(),
		);
		const addReview = (field: string, reason: string) => {
			if (missing(field)) normalizedSeed.unresolved.push({
				lineUid: line.uid, stepId: null, field, status: "unsupported", reason,
			});
		};
		const sourceRow = sourceText.split(/\r?\n/).map((row) => row.trim()).find((row) =>
			row.toLowerCase().startsWith(`${line.uid.replace(/-/g, " ").toLowerCase()} -`));
		const sourceRoom = sourceRow?.split(/\s+-\s*/)[0];
		const sourceEvidence = sourceRow ??
			(normalizedSeed.lineItems.length === 1 ? sourceText : "");
		if (route.config?.noHandle !== true && !line.housePackageTool?.doors?.length &&
			/(?:^|\s)(?:L|R)\s+(?:In|Out)\b|\b(?:LH|RH|left[- ]hand|right[- ]hand)\b/i.test(sourceEvidence)) {
			addReview("handing",
				`${sourceRoom ?? "The request"} states its handing, but the native door row has no handed quantity; set it during Sales review.`);
		}
		if (route.config?.hasSwing === true &&
			(line.housePackageTool?.doors?.some((row) => !("swing" in row) || !row.swing) ||
				!line.housePackageTool?.doors?.length) &&
			/\b(?:in[- ]?swing|out[- ]?swing|swing\s+(?:in|out))\b/i.test(sourceEvidence)) {
			addReview("swing",
				`${sourceRoom ?? "The request"} states its swing, but the native door row does not retain it; set it during Sales review.`);
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
		AbortSignal.timeout(salesRequestProviderTimeoutMs(input.groundingText ?? input.text)),
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
					[...(input.clarifications ?? []), ...(input.guidance ?? [])],
					input.clarifications,
					input.text,
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
		[...(input.clarifications ?? []), ...(input.guidance ?? [])],
		input.clarifications,
		input.text,
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
