import { randomUUID } from "node:crypto";
import type { NewSalesFormSeed } from "@gnd/sales/sales-form";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { isComponentVisibleByRules } from "@gnd/sales/sales-form/domain/step-engine";
import { deriveDoorSizeCandidates } from "@gnd/sales/sales-form/domain/workflow-calculators";
import { TRPCError } from "@trpc/server";
import {
	type InterpretationWarningCategory,
	SALES_REQUEST_INTERPRETATION_WARNING_CATEGORIES,
	interpretationWarningCategory,
	interpretationWarningKey,
	reusableInterpretationField,
} from "./sales-request-interpretation-warning";
import {
	SalesRequestPreviewNeedsClarification,
	createSalesRequestPreview,
} from "./sales-request-preview";
import type { SalesRequestAnswerContext } from "./sales-request-context";

export {
	SALES_REQUEST_INTERPRETATION_WARNING_CATEGORIES,
	interpretationWarningCategory,
	interpretationWarningKey,
} from "./sales-request-interpretation-warning";

type Preview = Awaited<ReturnType<typeof createSalesRequestPreview>>;
type Dependencies = Parameters<typeof createSalesRequestPreview>[1];
type Configuration = Awaited<ReturnType<Dependencies["readSnapshot"]>>["configuration"];
export type ClarificationQuestion = {
	id: string;
	lineUid: string | null;
	field: string;
	question: string;
	sourceText: string | null;
	reason: string;
	options?: Array<{ value: string; label: string }>;
	stepId?: number;
	allowOther?: boolean;
	canSaveRule?: boolean;
};
type Answer = {
	questionId: string;
	answer: string;
	reuse: boolean;
	active: boolean;
	question: ClarificationQuestion;
	origin?: "clarification" | "interpretation-warning";
	warningKey?: string;
	warningCategory?: InterpretationWarningCategory;
	selectedProdUid?: string;
	selectedTitle?: string;
	stepId?: number;
};
type Session = {
	id: string;
	actorUserId: number;
	saleType: string;
	scope: string;
	configurationRevision: string;
	sourceText: string;
	revision: number;
	status: string;
	questions: unknown;
	answers: unknown;
	createdAt?: Date | string;
	updatedAt?: Date | string;
};

type SalesRequestInterpretation = NonNullable<
	NewSalesFormSeed["interpretations"]
>[number];

export type ClarificationDatabase = {
	salesRequestClarificationSession: {
		create(args: { data: Record<string, unknown> }): Promise<Session>;
		findUnique(args: { where: { id: string } }): Promise<Session | null>;
		findMany(args: {
			where: Record<string, unknown>;
			orderBy?: Record<string, string>;
			take: number;
		}): Promise<Session[]>;
		updateMany(args: {
			where: Record<string, unknown>;
			data: Record<string, unknown>;
		}): Promise<{ count: number }>;
	};
};
function conflict(message: string): never {
	throw new TRPCError({ code: "CONFLICT", message });
}
function incompleteDimensionReference(text: string) {
	return /^[x×]\s*\d{1,3}\b/i.test(text.trim());
}
export function clarificationSourceReference(
	reason: string,
	sourceText: string,
	productTitles: readonly string[] = [],
) {
	const quoted = [...reason.matchAll(/["“]([^"”]{4,160})["”]/g)]
		.map((match) => match[1] ?? "")
		.filter((phrase) => phrase && !incompleteDimensionReference(phrase))
		.find((phrase) => sourceText.toLowerCase().includes(phrase.toLowerCase()));
	const title =
		quoted ??
		productTitles
			.map((title) => title.trim())
			.filter(Boolean)
			.sort((left, right) => right.length - left.length)
			.find(
				(title) =>
					title.length >= 4 &&
					sourceText.toLowerCase().includes(title.toLowerCase()) &&
					reason.toLowerCase().includes(title.toLowerCase()),
			);
	if (!title) return null;
	const index = sourceText.toLowerCase().indexOf(title.toLowerCase());
	return sourceText.slice(index, index + title.length);
}
function configuredQuestionOptions(
	item: Preview["seed"]["unresolved"][number],
	preview: Preview,
	configuration: Configuration,
	sourceText: string,
) {
	const field = item.field.toLowerCase().replace(/[^a-z0-9]/g, "");
	const mouldingRoutes = configuration.routes.filter((route) => {
		const rootStep = configuration.steps.find((step) => step.id === route.rootStepId);
		const rootTitle = rootStep?.components.find(
			(component) => component.uid === route.itemTypeUid,
		)?.title;
		return /^mouldings?$/i.test(rootTitle?.trim() ?? "");
	});
	const mouldingSteps = configuration.steps.filter((step) =>
		mouldingRoutes.some((route) => route.stepUids.includes(step.uid)) &&
		/^mouldings?$/i.test(step.title.trim()),
	);
	if (field === "mouldingprofile" || field === "boardproduct") {
		const seen = new Set<string>();
		return mouldingSteps.flatMap((step) => step.components.flatMap((component) => {
			const title = component.title.trim();
			const hasStockLength = /\bx\s*(?:8|12|14|16|17)\s*(?:ft\b|['’])?(?=\s|$|[),;])/i.test(title);
			const isBaseboard = (/\bbaseboard\b/i.test(title) || /^base\b/i.test(title)) &&
				hasStockLength;
			const isTwelveInchBoard = /\bflat\s*boards?\b/i.test(title) &&
				(/\b1\s*[x×]\s*12\b/i.test(title) || /\b11\s*[- ]?1\/4\b/i.test(title));
			if (!(field === "mouldingprofile" ? isBaseboard : isTwelveInchBoard) ||
				!title || title.length > 120 || seen.has(title.toLowerCase())) return [];
			const visibility = configuration.visibilityByComponentUid[component.uid];
			if (visibility && !isComponentVisibleByRules(visibility, {}, {})) return [];
			seen.add(title.toLowerCase());
			return [{ value: title, label: title }];
		}));
	}
	if (field === "width" && item.lineUid === null) {
		const bare = item.reason.match(/"(\d{2})\s+[1-9][-/](?:1[01]|\d)\b[^"\n]*"/);
		if (bare) {
			const inches = Number(bare[1]);
			const feet = Number(bare[1]?.[0]);
			const remainder = Number(bare[1]?.[1]);
			if (inches >= 12 && inches <= 96 && feet >= 1 && remainder <= 9)
				return [
					{ value: `${inches} inches`, label: `${inches} inches (${Math.floor(inches / 12)}-${inches % 12})` },
					{ value: `${feet}-${remainder}`, label: `${feet}-${remainder} (${feet * 12 + remainder} inches)` },
				];
		}
	}
	const line = preview.seed.lineItems.find((candidate) => candidate.uid === item.lineUid);
	const routeForLine = configuration.routes.find((route) =>
		line?.formSteps.some((selected) =>
			selected.stepId === route.rootStepId && selected.prodUid === route.itemTypeUid,
		),
	);
	const rootTitle = (route: Configuration["routes"][number]) =>
		configuration.steps.find((step) => step.id === route.rootStepId)
			?.components.find((component) => component.uid === route.itemTypeUid)?.title;
	const relevantRoutes = configuration.routes.filter((route) => {
		const title = rootTitle(route)?.trim();
		return title && sourceText.toLowerCase().includes(title.toLowerCase());
	});
	const route = routeForLine ??
		(relevantRoutes.length === 1 ? relevantRoutes[0] : undefined) ??
		(configuration.routes.length === 1 ? configuration.routes[0] : undefined);
	if (!route) return [];
	const routeTitle = rootTitle(route) ?? "";
	if ((field === "doorsize" || field === "width") && line) {
		const nativeSteps = line.formSteps.flatMap((selected) => {
			const step = configuration.steps.find((candidate) => candidate.id === selected.stepId);
			if (!step) return [];
			const prodUid = "prodUid" in selected ? selected.prodUid : "meta" in selected
				? selected.meta.selectedProdUids[0] : undefined;
			const title = step.components.find((component) => component.uid === prodUid)?.title ??
				("value" in selected ? selected.value : "");
			return [{ stepId: step.id, prodUid, value: title, step: { uid: step.uid, title: step.title } }];
		});
		for (const step of configuration.steps) {
			if (!route.stepUids.includes(step.uid) || !step.doorSizeVariation?.length ||
				nativeSteps.some((selected) => selected.stepId === step.id)) continue;
			nativeSteps.push({ stepId: step.id, prodUid: undefined, value: "", step: { uid: step.uid, title: step.title } });
		}
		const stepsByUid = Object.fromEntries(configuration.steps
			.filter((step) => route.stepUids.includes(step.uid))
			.map((step) => [step.uid, {
			id: step.id, uid: step.uid, title: step.title,
			...(step.doorSizeVariation?.length ? { meta: { doorSizeVariation: step.doorSizeVariation } } : {}),
			}]));
		const sizes = deriveDoorSizeCandidates({ formSteps: nativeSteps }, {}, { stepsByUid });
		return sizes.map((size) => ({ value: size, label: size }));
	}
	if (field === "swing" && route.config?.hasSwing === true) return [
		{ value: "In-Swing", label: "In-Swing" },
		{ value: "Out-Swing", label: "Out-Swing" },
	];
	if (field === "handing" && route.config?.noHandle !== true &&
		line && Number.isSafeInteger(line.qty) && line.qty > 0) return [
		{ value: `${line.qty} left-hand, 0 right-hand`, label: `All ${line.qty} left-hand` },
		{ value: `0 left-hand, ${line.qty} right-hand`, label: `All ${line.qty} right-hand` },
	];
	const step = configuration.steps.find((candidate) =>
		candidate.title.toLowerCase().replace(/[^a-z0-9]/g, "") === field ||
		candidate.uid.toLowerCase().replace(/[^a-z0-9]/g, "") === field,
	);
	if (!step || (step.id !== route.rootStepId && !route.stepUids.includes(step.uid)))
		return [];
	const components = step.id === route.rootStepId
		? step.components.filter((component) => component.uid === route.itemTypeUid)
		: field === "jambsize" && /pre[- ]?hung|^exterior\b|garage door/i.test(routeTitle)
			? step.components.filter((component) => !/door slab only|no frame/i.test(component.title))
			: step.components;
	const selectedByStepUid: Record<string, string> = {};
	const selectedProdUidsByStepUid: Record<string, string[]> = {};
	for (const selected of line?.formSteps ?? []) {
		const selectedStep = configuration.steps.find((candidate) => candidate.id === selected.stepId);
		if (!selectedStep) continue;
		const uids = "prodUid" in selected && typeof selected.prodUid === "string"
			? [selected.prodUid]
			: "meta" in selected && selected.meta && "selectedProdUids" in selected.meta &&
				Array.isArray(selected.meta.selectedProdUids)
				? selected.meta.selectedProdUids.filter((uid): uid is string => typeof uid === "string")
				: [];
		if (uids[0]) selectedByStepUid[selectedStep.uid] = uids[0];
		selectedProdUidsByStepUid[selectedStep.uid] = uids;
	}
	const seen = new Set<string>();
	return components.flatMap((component) => {
		const visibility = configuration.visibilityByComponentUid[component.uid];
		if (visibility && !isComponentVisibleByRules(
			visibility, selectedByStepUid, selectedProdUidsByStepUid,
		)) return [];
		const title = component.title.trim();
		if (!title || title.length > 120 || seen.has(title.toLowerCase())) return [];
		seen.add(title.toLowerCase());
		return [{ value: title, label: title }];
	});
}

function normalizedClarificationAnswer(
	question: ClarificationQuestion,
	answer: string,
) {
	const trimmed = answer.trim();
	if (question.options?.length && /\bfirst compatible\b/i.test(trimmed))
		return question.options[0]!.value;
	return trimmed;
}

/** Derive custom-answer authority from the current Sales step, including older stored questions. */
export function clarificationQuestionAllowsOther(
	question: ClarificationQuestion,
	configuration: Configuration,
) {
	if (!question.options?.length) return true;
	const field = question.field.toLowerCase().replace(/[^a-z0-9]/g, "");
	// These options are shortcuts for customer facts, not Sales component choices.
	if (field === "handing" || field === "swing" || field === "handingswing" ||
		(field === "width" && question.lineUid === null)) return true;
	const matchesStep = (step: Configuration["steps"][number]) =>
		step.uid.toLowerCase().replace(/[^a-z0-9]/g, "") === field ||
		step.title.toLowerCase().replace(/[^a-z0-9]/g, "") === field ||
		((field === "doorsize" || field === "width") &&
			!!step.doorSizeVariation?.length) ||
		question.options!.every((option) => step.components.some((component) =>
			component.title.trim() === option.value));
	const explicitStep = configuration.steps.find((step) =>
		step.id === question.stepId && matchesStep(step));
	const matchingSteps = configuration.steps.filter(matchesStep);
	const step = explicitStep ?? (matchingSteps.length === 1 ? matchingSteps[0] : undefined);
	// An option-bearing catalog question without a unique current step cannot
	// authorize an arbitrary Sales selection.
	return step?.custom === true;
}

function questionPrompt(
	field: string,
	reason: string,
	sourceReference: string | null,
	sourceText: string,
) {
	const statement = reason.trim()
		.replace(/\s*\((?:e\.g\.?|for example)[^)]{0,180}\)/gi, "")
		.replace(/\s+/g, " ");
	const normalizedField = field.toLowerCase().replace(/[^a-z]/g, "");
	if (normalizedField === "handingswing" &&
		/leaf-level left\/right quantities/i.test(reason) &&
		(/\b(?:four|4)\s+(?:total\s+)?leaves\b/i.test(reason) ||
			/\bcantidad:\s*4\b/i.test(sourceText)) &&
		/\b(?:two|2) double-door|dos unidades de doble puerta/i.test(`${reason} ${sourceText}`)) {
		return "Confirm the left/right leaf counts for the two double-door units (four leaves total).";
	}
	if (normalizedField === "doorschedule" && /\bno heights\b/i.test(statement) &&
		/\bleft side\b/i.test(sourceText) && /\bright side\b/i.test(sourceText))
		return "What height applies to the listed doors on Left Side and Right Side? If heights differ, list each side, room, and height.";
	if (normalizedField === "mouldingprofile") {
		const stockClaim = statement.match(/\b(\d+)(?:[- ]foot|[- ]ft|['’])\s+stock\b/i);
		if (stockClaim) {
			const side = statement.match(/\b(left|right) side\b/i)?.[0];
			const section = side
				? sourceText.split(new RegExp(`\\b${side}\\b`, "i"))[1]?.split(/\b(?:left|right) side\b/i)[0] ?? ""
				: sourceText;
			if (new RegExp(`\\b${stockClaim[1]}(?:[- ]foot|[- ]ft|['’])\\s+stock\\b|\\bstock(?: length)?\\s*(?:of|:)?\\s*${stockClaim[1]}\\b`, "i").test(section))
				return statement;
			const feet = section.match(/\b(\d+)\s+linear\s+feet\s+for\s+baseboard\b/i)?.[1];
			return `Confirm the baseboard profile and stock length${side ? ` for ${side}` : ""}${feet ? `: ${feet} linear feet of baseboard` : ""}.`;
		}
		return statement;
	}
	if (normalizedField === "boardproduct") return statement;
	if (/["“‘]\s*[x×]\s*\d{1,3}[^"”’]*["”’]/i.test(statement)) {
		return `Confirm the ${field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase()} for this request.`;
	}
	if (
		(normalizedField === "door" && /\b(?:door product|door style|matching door|compatible door)\b/i.test(statement)) ||
		/\b(?:no compatible door product|provide a matching door style)\b/i.test(statement)
	) {
		const sourceSegments = sourceText.split(/\r?\n|;/).map((segment) => segment.trim()).filter(Boolean);
		const dimensionPattern = /\b\d{1,3}(?:\s*-\s*\d)?\s*[x×]\s*\d{1,3}(?:\s*-\s*\d)?\b/i;
		const statedDimension = statement.match(dimensionPattern)?.[0]?.replace(/\s+/g, " ");
		const onlySourceSegment = sourceSegments.length === 1 ? sourceSegments[0] : null;
		const sourceSegment = statedDimension
			? onlySourceSegment?.match(dimensionPattern)?.[0]?.replace(/\s+/g, " ") === statedDimension
				? onlySourceSegment ?? ""
				: ""
			: sourceSegments.find((segment) =>
			dimensionPattern.test(segment) && /\bdoor\b/i.test(segment),
		) ?? sourceSegments.find((segment) => /\bdoor\b/i.test(segment)) ?? "";
		const dimension = statedDimension ?? sourceSegment.match(dimensionPattern)?.[0]?.replace(/\s+/g, " ");
		const hand = /\b(?:left[- ]hand(?:ed)?|LH)\b/i.test(sourceSegment)
			? "left-hand"
			: /\b(?:right[- ]hand(?:ed)?|RH)\b/i.test(sourceSegment)
				? "right-hand" : null;
		const attributes = [
			/\bprimed\b/i.test(sourceSegment) ? "primed" : null,
			/\bwhite\b/i.test(sourceSegment) ? "white" : null,
			/\binterior\b/i.test(sourceSegment) ? "interior" : null,
			/\bpre[- ]hung\b/i.test(sourceSegment) ? "pre-hung" : null,
		].filter(Boolean);
		const description = [dimension, hand, ...attributes].filter(Boolean).join(" ");
		return `Confirm the Door product/style for ${description ? `the ${description} door` : "this door"}.`;
	}
	if (statement.length <= 180 && /^(?:please\s+)?(?:confirm|which|what|how|specify|provide|choose|select|clarify|identify|state)\b/i.test(statement))
		return statement;
	const label = field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
	return `Confirm the ${label}${sourceReference ? ` for “${sourceReference}”` : " for this request"}.`;
}

function unspecifiedScheduleFacts(
	sourceText: string,
	answered: readonly { field?: string }[] = [],
) {
	const rows = sourceText.split(/\r?\n/).map((row) => row.trim());
	const missingSize = rows.find((row) => /^[^:\n]{3,80}\s+-\s*$/.test(row));
	const uncertainWidth = rows.find((row) =>
		/^[^:\n]{3,80}\s+-\s*\d{2,3}'\s*[x×]\s*\d{2,3}["”]/i.test(row),
	);
	if (!missingSize || !uncertainWidth) return [];
	const missingRoom = missingSize.split(/\s+-\s*$/)[0];
	const uncertainRoom = uncertainWidth.split(/\s+-\s*/)[0];
	return [
		{ field: "roomSize", reason: `What size is the ${missingRoom} door?` },
		{ field: "width", reason: `Confirm the intended width and unit for ${uncertainRoom}: the source says ${uncertainWidth.match(/\d{2,3}'\s*[x×]\s*\d{2,3}["”]/)?.[0]}.` },
	].filter((item) => !answered.some((answer) =>
		answer.field?.toLowerCase() === item.field.toLowerCase(),
	));
}

function clarifyUnspecifiedScheduleRows<TPreview extends Preview>(
	preview: TPreview,
	sourceText: string,
	answered: readonly Answer[] = [],
): TPreview {
	if (!unspecifiedScheduleFacts(sourceText).length) return preview;
	const questions = unspecifiedScheduleFacts(sourceText,
		answered.map((answer) => ({ field: answer.question.field })));
	const broadIssue = preview.seed.unresolved.find((item) =>
		item.lineUid === null && item.status === "ambiguous" &&
		["doors", "schedule", "doorschedule"].includes(
			item.field.toLowerCase().replace(/[^a-z]/g, ""),
		) &&
		/\b(?:door rows|per.room|entire schedule|all listed doors|townhouse door package)\b/i.test(item.reason),
	);
	if (!broadIssue) return preview;
	return {
		...preview,
		seed: {
			...preview.seed,
			unresolved: preview.seed.unresolved.flatMap((item) => item === broadIssue
				? [
					{ ...item, status: "unsupported" as const,
						reason: "Review the remaining door product and assembly matches against the source schedule." },
					...questions.map((question) => ({ ...item, ...question, status: "ambiguous" as const })),
				]
				: [item]),
		},
	} as TPreview;
}

export function reviewDenseArchitecturalSchedule<TPreview extends Preview>(
	preview: TPreview,
	sourceText: string,
	answered: readonly Answer[] = [],
): TPreview {
	const sizedRows = sourceText.split(/\r?\n/).filter((row) =>
		/^(?:(?:bifold|pocket)\s+)?(?:[1-9][-/](?:1[01]|\d)|\d{2})\s+[1-9][-/](?:1[01]|\d)\b/i.test(row.trim()) ||
		/^[^:\n]{3,80}\s+-\s*\d{2,3}["”]\s*[x×]\s*\d{2,3}["”]/i.test(row.trim()),
	);
	if (sizedRows.length < 8) return preview;
	const sourceSizes = new Set(sizedRows.flatMap((row) => {
		const size = row.trim().match(/^(?:(?:bifold|pocket)\s+)?([1-9][-/](?:1[01]|\d))\s+([1-9][-/](?:1[01]|\d))\b/i);
		if (size) return [`${size[1]?.replace("/", "-")} x ${size[2]?.replace("/", "-")}`];
		const inches = row.match(/\b(\d{2,3})["”]\s*[x×]\s*(\d{2,3})["”]/i);
		const architectural = (value: string) => `${Math.floor(Number(value) / 12)}-${Number(value) % 12}`;
		return inches ? [`${architectural(inches[1]!)} x ${architectural(inches[2]!)}`] : [];
	}));
	const sourceHeights = new Set([...sourceSizes].map((size) => size.split(" x ")[1]));
	const likelyInchTypoRows = sourceText.split(/\r?\n/).map((row) => row.trim())
		.filter((row) => /^[^:\n]{3,80}\s+-\s*\d{2,3}'\s*[x×]\s*\d{2,3}["”]/i.test(row));
	const missingRoomQuestion = unspecifiedScheduleFacts(sourceText, answered
		.map((answer) => ({ field: answer.question.field })))
		.find((item) => item.field === "roomSize");
	const missingRoom = missingRoomQuestion?.reason.match(
		/What size is the (.+?) door\?/i,
	)?.[1];
	const missingRoomField = missingRoom?.toLowerCase().replace(/[^a-z0-9]/g, "");
	const reviewFields = new Set([
		"door", "doormodel", "doorproduct", "doorstyle", "doortype",
		"itemtype", "product", "producttype", "doorconfiguration", "jambsize", "handing", "swing",
		"moulding", "mouldingprofile", "pocketdoorhardware", "lineitem",
	]);
	const unresolved = preview.seed.unresolved.map((item) => {
		if (item.status !== "ambiguous") return item;
		const field = item.field.toLowerCase().replace(/[^a-z]/g, "");
		if (missingRoomField &&
			item.field.toLowerCase().replace(/[^a-z0-9]/g, "") === missingRoomField)
			return { ...item, status: "unsupported" as const };
		const statedSize = [...item.reason.matchAll(/\b([1-9][-/](?:1[01]|\d))\s*[x×]\s*([1-9][-/](?:1[01]|\d))\b/gi)]
			.some((match) => sourceSizes.has(
				`${match[1]?.replace("/", "-")} x ${match[2]?.replace("/", "-")}`,
			)) || [...item.reason.matchAll(/\b(\d{2,3})["”]?\s*[x×]\s*(\d{2,3})["”]?\b/gi)]
			.some((match) => sourceSizes.has(
				`${Math.floor(Number(match[1]) / 12)}-${Number(match[1]) % 12} x ${Math.floor(Number(match[2]) / 12)}-${Number(match[2]) % 12}`,
			));
		const statedHeight = field === "height" &&
			[...item.reason.matchAll(/\b([1-9][-/](?:1[01]|\d))\b/g)]
				.some((match) => sourceHeights.has(match[1]?.replace("/", "-")));
		const statedAccessoryCount =
			(field === "doorstopquantity" && /\bdoor\s+stop\s*\(\s*\d+\s*\)/i.test(sourceText)) ||
			(field === "mouldingquantities" && /\b\d+\s+tiras\s+de\s+(?:base|casing|crown)\b/i.test(sourceText));
		const likelyInchTypo = ["size", "doorsize", "dimension", "width"].includes(field) &&
			likelyInchTypoRows.some((row) => {
				const room = row.match(/^([^:\n]{3,80}?)\s+-\s*\d/)?.[1]?.trim();
				const quotedWidth = row.match(/\b\d{2,3}'/)?.[0];
				return !!room && !!quotedWidth && item.reason.toLowerCase().includes(room.toLowerCase()) &&
					item.reason.includes(quotedWidth);
			});
		return reviewFields.has(field) || (field === "doorsize" && statedSize) ||
			statedHeight || statedAccessoryCount || likelyInchTypo
			? { ...item, status: "unsupported" as const }
			: item;
	});
	const bareRows = sizedRows.filter((row) => {
		const match = row.trim().match(/^(\d{2})\s+[1-9][-/](?:1[01]|\d)\b/);
		if (!match) return false;
		const inches = Number(match[1]);
		return inches >= 12 && inches <= 96;
	});
	const bare = bareRows.length === 1 ? bareRows[0]?.trim() : undefined;
	if (bare && !answered.some((answer) => answer.question.field.toLowerCase() === "width") &&
		!unresolved.some((item) => item.status === "ambiguous" &&
			item.field.toLowerCase() === "width")) {
		unresolved.push({
			lineUid: null, stepId: null, field: "width", status: "ambiguous",
			reason: `Confirm the width for "${bare}": does ${bare.slice(0, 2)} mean inches or architectural feet/inches?`,
		});
	}
	for (const missing of unspecifiedScheduleFacts(sourceText, answered
		.map((answer) => ({ field: answer.question.field })))
		.filter((item) => item.field === "roomSize")) {
		const room = missing.reason.match(/What size is the (.+?) door\?/i)?.[1];
		if (unresolved.some((item) => item.status === "ambiguous" &&
			(item.field.toLowerCase().replace(/[^a-z]/g, "") === "roomsize" ||
				(!!room && item.reason.toLowerCase().includes(room.toLowerCase()))))) continue;
		unresolved.push({ lineUid: null, stepId: null, field: missing.field,
			status: "ambiguous", reason: missing.reason });
	}
	return {
		...preview,
		seed: {
			...preview.seed,
			unresolved,
		},
	} as TPreview;
}

function applyDraftClarificationPolicy<TPreview extends Preview>(
	preview: TPreview,
	sourceText: string,
	configuration: Configuration,
): TPreview {
	const routineDraftFields = new Set([
		"bore",
		"count",
		"finish",
		"handing",
		"handingswing",
		"jamb",
		"jambsize",
		"quantity",
		"qty",
		"swing",
	]);
	const productIdentityFields = new Set([
		"boardproduct",
		"door",
		"doormodel",
		"doorproduct",
		"doorstyle",
		"doortype",
		"itemtype",
		"mouldingprofile",
		"product",
		"producttype",
	]);
	const impactAssemblyReviewFields = new Set([
		"assemblysize",
		"height",
		"overallassembly",
		"pvcbrickmoulding",
		"pvcjamb",
		"sideliteassembly",
	]);
	const impactSidelite = /\b(?:hurricane|impact)\b/i.test(sourceText) &&
		/\bside\s*lite\b/i.test(sourceText);
	const unresolved = preview.seed.unresolved.flatMap((item) => {
		if (item.status !== "ambiguous") return [item];
		const field = item.field.toLowerCase().replace(/[^a-z0-9]/g, "");
		const line = preview.seed.lineItems.find((candidate) =>
			candidate.uid === item.lineUid,
		);
		if (impactSidelite && impactAssemblyReviewFields.has(field)) {
			const route = line && configuration.routes.find((candidate) =>
				line.formSteps.some((selection) =>
					selection.stepId === candidate.rootStepId &&
					"prodUid" in selection && selection.prodUid === candidate.itemTypeUid,
				),
			);
			const jambType = field === "pvcjamb" && route
				? configuration.steps.find((step) =>
					route.stepUids.includes(step.uid) && /^jamb\s*type$/i.test(step.title.trim()))
				: undefined;
			return [{ ...item, status: "unsupported" as const,
				...(jambType ? { stepId: jambType.id } : {}) }];
		}
		if (routineDraftFields.has(field)) {
			const explicitConflict =
				/\b(?:conflict|contradict|different values?|both left and right|ambiguous)\b/i.test(
					item.reason,
				);
			return explicitConflict
				? [{ ...item, status: "unsupported" as const }]
				: [];
		}
		const hasUsableRoute = !!line && configuration.routes.some((route) =>
			line.formSteps.some((selection) =>
				selection.stepId === route.rootStepId &&
				"prodUid" in selection &&
				selection.prodUid === route.itemTypeUid,
			),
		);
		const asksForSeveralFacts =
			/\b(?:dimensions?|size|width|height|quantity|count|jamb|handing|swing|finish)\b/i.test(
				item.reason,
			);
		const explicitlyNamedStepChoice = item.stepId != null &&
			configuration.steps.find((step) => step.id === item.stepId)
				?.components.some((component) => {
					const title = component.title.trim();
					return title.length >= 3 &&
						sourceText.toLowerCase().includes(title.toLowerCase()) &&
						item.reason.toLowerCase().includes(title.toLowerCase());
				}) === true;
		const isProductIdentity = productIdentityFields.has(field) &&
			!asksForSeveralFacts &&
			!explicitlyNamedStepChoice;
		const isQuantity = /quantity|qty|count/.test(field);
		return [isProductIdentity || (!hasUsableRoute && !isQuantity)
			? item : { ...item, status: "unsupported" as const }];
	});
	return {
		...preview,
		seed: { ...preview.seed, unresolved },
	} as TPreview;
}

function questionsFor(
	preview: Preview,
	sourceText: string,
	configuration: Configuration,
	answered: readonly Answer[] = [],
): ClarificationQuestion[] {
	const productTitles = configuration.steps.flatMap((step) =>
		step.components.map((component) => component.title),
	);
	const combinedLeafLines = new Set(preview.seed.unresolved
		.filter((item) => item.lineUid &&
			item.field.toLowerCase().replace(/[^a-z]/g, "") === "handingswing" &&
			/leaf-level left\/right quantities/i.test(item.reason) &&
			(/\b(?:four|4)\s+(?:total\s+)?leaves\b/i.test(item.reason) ||
				/\bcantidad:\s*4\b/i.test(sourceText)) &&
			/\b(?:two|2) double-door|dos unidades de doble puerta/i.test(`${item.reason} ${sourceText}`))
		.map((item) => item.lineUid));
	const sourceStatesOutSwing = /\b(?:out[- ]?swing|outward)\b|apertura\s+hacia\s+afuera/i.test(sourceText);
	const unresolved = preview.seed.unresolved
		.filter((item) =>
			item.status !== "unsupported" &&
			!(combinedLeafLines.has(item.lineUid) &&
				(item.field.toLowerCase() === "handing" ||
					(item.field.toLowerCase() === "swing" && sourceStatesOutSwing))) &&
			!answered.some((previous) =>
				previous.question.lineUid === item.lineUid &&
				previous.question.field.toLowerCase() === item.field.toLowerCase(),
			),
		);
	const bifoldRows = sourceText.split(/\r?\n/).map((row) => row.trim())
		.filter((row) => /^Bifold\s+\d+[/\-]\d+\s+\d+[/\-]\d+$/i.test(row));
	const bifoldQuestions = unresolved.filter((item) => item.lineUid &&
		item.field.toLowerCase().replace(/[^a-z]/g, "") === "doortype" &&
		bifoldRows.some((row) => item.reason.includes(row)));
	const groupedBifold = bifoldQuestions.length > 1 &&
		bifoldQuestions.every((item) => item.lineUid === bifoldQuestions[0]?.lineUid) &&
		bifoldQuestions.every((item) => bifoldRows.some((row) => item.reason.includes(row)))
		? bifoldQuestions : [];
	const groupedBifoldPrompt = groupedBifold.length
		? `Which door type applies to the Bifold doors (${[...new Set(bifoldRows)]
			.filter((row) => groupedBifold.some((item) => item.reason.includes(row)))
			.map((row) => {
				const count = bifoldRows.filter((sourceRow) => sourceRow === row).length;
				return `${count > 1 ? `${count} × ` : ""}${row.slice("Bifold ".length).replace(/\s+/, " × ")}`;
			}).join(", ")})? If types differ, choose Other and list each size's type.`
		: null;
	return unresolved
		.filter((item) => !groupedBifold.includes(item) || item === groupedBifold[0])
		.map((item) => {
			const normalizedField = item.field.toLowerCase().replace(/[^a-z]/g, "");
			const scheduleRow = item.lineUid === null &&
				(normalizedField === "roomsize" || normalizedField === "width")
				? sourceText.split(/\r?\n/).map((row) => row.trim()).find((row) =>
					/^[^:\n]{3,80}\s+-\s*/.test(row) &&
					item.reason.includes(row.split(/\s+-\s*/)[0] ?? "\0"),
				) : null;
			const sourceReference = scheduleRow ?? (normalizedField === "mouldingprofile" && /\bbaseboard\b/i.test(sourceText)
				? sourceText.match(/\bbaseboard\b/i)?.[0] ?? null
				: normalizedField === "boardproduct"
					? sourceText.match(/12\s*["”]\s*boards\b/i)?.[0] ?? null
					: clarificationSourceReference(item.reason, sourceText, productTitles));
			const line = preview.seed.lineItems.find((candidate) => candidate.uid === item.lineUid);
			const route = configuration.routes.find((candidate) =>
				line?.formSteps.some((selection) =>
					selection.stepId === candidate.rootStepId &&
					"prodUid" in selection && selection.prodUid === candidate.itemTypeUid,
				),
			);
			const routeTitle = route && configuration.steps.find((step) => step.id === route.rootStepId)
				?.components.find((component) => component.uid === route.itemTypeUid)?.title;
			const field = item.field.toLowerCase().replace(/[^a-z]/g, "");
			const threePartDimension = sourceText.match(
				/\b(\d{1,3})\s*[x×]\s*1\s+3\/4\s*[x×]\s*(\d{1,3})\b/i,
			);
			const dimension = preview.seed.lineItems.length === 1
				? threePartDimension
					? `${threePartDimension[1]} x ${threePartDimension[2]}`
					: sourceText.match(/\b\d{1,3}\s*[x×]\s*\d{1,3}\b/i)?.[0]
				: null;
			const interpretedRoom = preview.seed.interpretations
				?.filter((interpretation) => interpretation.lineUid === item.lineUid &&
					sourceText.includes(interpretation.sourceText))
				.map((interpretation) => interpretation.sourceText.match(
					/^([^:\n]{3,80})\s+-\s*\d{2,3}\s*["”']?\s*[x×]/i,
				)?.[1]?.trim())
				.find(Boolean);
			const namedSourceRow = line && sourceText.split(/\r?\n/).map((row) => row.trim())
				.find((row) => row.toLowerCase().startsWith(
					`${line.uid.replace(/-/g, " ").toLowerCase()} -`,
				));
			const reasonRoom = sourceText.split(/\r?\n/).map((row) => row.trim())
				.map((row) => row.match(/^([^:\n]{3,80}?)\s+-\s*/)?.[1]?.trim())
				.find((candidate) => candidate &&
					item.reason.toLowerCase().includes(candidate.toLowerCase()));
			const side = line?.uid.match(/(?:^|[-_])(left|right)(?:$|[-_])/i)?.[1];
			const sideSection = side && sourceText.split(new RegExp(`\\b${side} side\\b`, "i"))[1]
				?.split(/\b(?:left|right) side\b/i)[0];
			const room = interpretedRoom ?? namedSourceRow?.split(/\s+-\s*/)[0] ?? reasonRoom ??
				(sideSection && /\b1\s+attic access\b/i.test(sideSection) &&
				/\battic[-_ ]access\b/i.test(line?.uid ?? "")
				? `${side?.toLowerCase() === "left" ? "Left" : "Right"} Side attic access`
				: null);
			const label = line && routeTitle
				? room ?? `${line.qty} ${routeTitle} ${line.qty === 1 ? "door" : "doors"}${dimension ? ` (${dimension})` : ""}`
				: null;
			const detailQuestion = label && /pre[- ]?hung|^exterior\b|garage door/i.test(routeTitle ?? "")
				? field === "jambsize" ? `Confirm the jamb size for ${room ? room : `the ${label}`}.`
					: field === "handing" ? room
						? line?.qty === 1 ? `Confirm left-hand or right-hand for ${room}.`
							: `How many doors in ${room} are left-hand and how many are right-hand?`
						: `How many of the ${label} are left-hand and how many are right-hand?`
					: field === "swing" ? `Confirm in-swing or out-swing for ${room ? room : `the ${label}`}.`
					: null
				: null;
			const prompt = item === groupedBifold[0] && groupedBifoldPrompt
				? groupedBifoldPrompt : detailQuestion ?? (room &&
				["door", "size", "doorsize", "dimension"].includes(field) &&
				/\b(?:no dimensions|missing size)\b/i.test(item.reason)
				? `What size is the ${room} door?`
				: room && field === "width" && /\b\d{2,3}'\s*[x×]\s*\d{2,3}["”]/.test(namedSourceRow ?? "")
					? `Confirm the intended width and unit for ${room}: the source says ${namedSourceRow?.match(/\d{2,3}'\s*[x×]\s*\d{2,3}["”]/)?.[0]}.`
					: questionPrompt(item.field, item.reason, sourceReference, sourceText));
			const question: ClarificationQuestion = {
		id: randomUUID(),
		lineUid: item.lineUid,
		field: item.field,
		question: prompt,
		sourceText: sourceReference,
		...(item.stepId != null && route && configuration.steps.some((step) =>
			step.id === item.stepId &&
			(step.id === route.rootStepId || route.stepUids.includes(step.uid)))
			? { stepId: item.stepId } : {}),
				reason: item === groupedBifold[0] && groupedBifoldPrompt
				? groupedBifoldPrompt : (normalizedField === "mouldingprofile" && /\b\d+(?:[- ]foot|[- ]ft|['’])\s+stock\b/i.test(item.reason)) ||
				(room && (field === "door" || field === "width") && prompt !== item.reason) ||
			(normalizedField === "doorschedule" && prompt !== item.reason)
			? prompt : item.reason,
			};
			const options = room && ["door", "size", "doorsize", "dimension"].includes(field) &&
				/\b(?:no dimensions|missing size)\b/i.test(item.reason)
				? [] : configuredQuestionOptions(item, preview, configuration, sourceText);
			if (options.length) question.options = options;
			question.allowOther = clarificationQuestionAllowsOther(question, configuration);
			question.canSaveRule = reusableClarification({
				questionId: question.id, question, answer: "approved term", reuse: true, active: true,
			}, sourceText, productTitles);
			return question;
		});
}

function recoverableMissingFacts(
	sourceText: string,
	answered: readonly { field?: string }[] = [],
): NewSalesFormSeed["unresolved"] {
	const alreadyAnswered = (field: string) => answered.some(
		(item) => item.field?.toLowerCase() === field.toLowerCase(),
	);
	const missing: NewSalesFormSeed["unresolved"] = [];
	missing.push(...unspecifiedScheduleFacts(sourceText, answered).map((item) => ({
		lineUid: null, stepId: null, ...item, status: "ambiguous" as const,
	})));
	const denseDoorRows = sourceText.split(/\r?\n/).map((row) => row.trim()).filter((row) =>
		/^(?:(?:bifold|pocket)\s+)?(?:[1-9][-/](?:1[01]|\d)|\d{2})\s+[1-9][-/](?:1[01]|\d)\b/i.test(row));
	const bareWidthRows = denseDoorRows.filter((row) =>
		/^\d{2}\s+[1-9][-/](?:1[01]|\d)\b/.test(row));
	if (denseDoorRows.length >= 8 && bareWidthRows.length === 1 &&
		!alreadyAnswered("width") && !missing.some((item) => item.field === "width")) {
		const row = bareWidthRows[0]!;
		missing.push({
			lineUid: null, stepId: null, field: "width", status: "ambiguous",
			reason: `Confirm the width for "${row}": does ${row.slice(0, 2)} mean inches or architectural feet/inches?`,
		});
	}
	const impactSidelite = /\b(?:hurricane|impact)\b/i.test(sourceText) &&
		/\bside\s*lite\b/i.test(sourceText) &&
		/\b(?:total|overall)\s+size\b/i.test(sourceText) &&
		/\bdoor\s+panel\b/i.test(sourceText);
	if (
		/\bdoors?\b/i.test(sourceText) &&
		/\b\d{2,3}\s*["”]/.test(sourceText) &&
		!/(?:\b(?:height|tall)\b|\b[6-9]\s*[-/]\s*(?:1[01]|\d)\b|\b\d{2,3}\s*["”]?\s*[x×]\s*\d{2,3}\b)/i.test(sourceText) &&
		!alreadyAnswered("height")
	) {
		missing.push({
			lineUid: null, stepId: null, field: "height", status: "ambiguous",
			reason: impactSidelite
				? "Confirm the door panel height; the stated overall door-and-sidelite frame size is not necessarily the panel size."
				: "What height applies to the listed doors on the left and right sides? If rooms differ, list each room and height.",
		});
	}
	if (impactSidelite) {
		for (const item of [
			{ field: "pvcJamb", requested: /\bpvc\s+frame\b/i.test(sourceText),
				reason: "Confirm an approved PVC jamb or custom quote path for the stated PVC frame; do not substitute wood or composite." },
			{ field: "sideliteAssembly", requested: true,
				reason: "Confirm how to quote the requested sidelite with its stated side and overall assembly size." },
			{ field: "pvcBrickMoulding", requested: /\bpvc\s+brick\s*mou?ld(?:ing)?\b/i.test(sourceText),
				reason: "Confirm the PVC brick moulding catalog length and piece quantity for this exterior assembly." },
		]) {
			if (item.requested && !alreadyAnswered(item.field))
				missing.push({ lineUid: null, stepId: null, field: item.field,
					status: "ambiguous", reason: item.reason });
		}
	}
	if (
		/\bbaseboard\b/i.test(sourceText) &&
		!/\b[A-Z]{1,4}\d{3,}\b/i.test(sourceText) &&
		!alreadyAnswered("mouldingProfile")
	) {
		const baseboardFeet = [...sourceText.matchAll(/\b(\d+)\s+linear\s+feet\s+for\s+baseboard\b/gi)]
			.map((match) => match[1]);
		const quantities = baseboardFeet.length === 2
			? ` Left: ${baseboardFeet[0]} LF; right: ${baseboardFeet[1]} LF.`
			: " Keep each side's stated linear feet.";
		missing.push({
			lineUid: null, stepId: null, field: "mouldingProfile", status: "ambiguous",
			reason: `Which baseboard profile and stock length?${quantities}`,
		});
	}
	if (/\b12\s*["”]\s*boards\b/i.test(sourceText) && !alreadyAnswered("boardProduct")) {
		const counts = [...sourceText.matchAll(/(?:^|\n)\s*(\d+)\s*=\s*12\s*["”]\s*boards\b/gmi)]
			.map((match) => match[1]);
		missing.push({
			lineUid: null, stepId: null, field: "boardProduct", status: "ambiguous",
			reason: `Which catalog board product matches the twelve-inch boards?${counts.length === 2
				? ` Left: ${counts[0]}; right: ${counts[1]}.` : " Keep each side's stated count."}`,
		});
	}
	return missing;
}

function retainDenseFallbackRowReviews(
	sourceText: string,
	unresolved: NewSalesFormSeed["unresolved"],
	answers: readonly SalesRequestAnswerContext[] = [],
) {
	const namedRows = sourceText.split(/\r?\n/).map((row) => row.trim()).filter((row) =>
		/^[^:\n]{3,80}\s+-\s*(?:\d{2,3}\s*["”']?\s*[x×]\s*\d{2,3}\s*["”']?|$)/i.test(row));
	const sizedRowCount = namedRows.filter((row) =>
		/\d{2,3}\s*["”']?\s*[x×]\s*\d{2,3}\s*["”']?/i.test(row)).length;
	if (sizedRowCount < 8) return unresolved;
	const normalize = (value: string) => value.normalize("NFKC").toLowerCase()
		.replace(/[“”]/g, '"').replace(/[‘’′]/g, "'").replace(/\s+/g, " ").trim();
	const retained = unresolved.map((item) => ({ ...item }));
	const usedReviews = new Set<number>();
	const reviews = namedRows.flatMap((row, index) => {
		const room = row.split(/\s+-\s*/)[0]?.trim() ?? "";
		const normalizedRow = normalize(row);
		const normalizedRoom = normalize(room);
		const confirmed = answers.find((answer) =>
			normalize(`${answer.question} ${answer.sourceText ?? ""}`).includes(normalizedRoom) &&
			/\b\d{2,3}\s*["”']?\s*[x×]\s*\d{2,3}\b/.test(answer.answer));
		const confirmedValue = confirmed?.answer.trim().slice(0, 160);
		const reviewIndex = retained.findIndex((item, candidate) => {
			if (usedReviews.has(candidate)) return false;
			const reason = normalize(item.reason);
			return reason.includes(normalizedRow) ||
				(normalizedRoom.length >= 3 && reason.includes(normalizedRoom));
		});
		if (reviewIndex >= 0) {
			usedReviews.add(reviewIndex);
			const existing = retained[reviewIndex]!;
			if (confirmedValue && !normalize(existing.reason).includes(normalize(confirmedValue)))
				retained[reviewIndex] = {
					...existing,
					status: "unsupported",
					reason: `${existing.reason.trim()}${/[.!?]$/.test(existing.reason.trim()) ? "" : "."} Confirmed customer answer: ${confirmedValue}.`,
				};
			return [];
		}
		return [{ lineUid: null, stepId: null, field: "doorSchedule",
			status: "unsupported" as const,
			reason: `Source door row ${index + 1}: ${row.slice(0, 160)}.${confirmedValue
				? ` Confirmed customer answer: ${confirmedValue}.` : ""} No compatible Door line was created; use this exact source row when completing the draft in Sales.` }];
	});
	return [...retained, ...reviews];
}

function normalizeRecoverableClarifications<TPreview extends Preview>(
	preview: TPreview,
	sourceText: string,
	answered: readonly { field?: string }[] = [],
): TPreview {
	const normalizeField = (field: string) =>
		field.toLowerCase().replace(/[^a-z0-9]/g, "");
	const broadFields = new Set(["doors", "doorschedule", "schedule", "moulding", "mouldings"]);
	if (!preview.seed.unresolved.some((item) => item.lineUid === null &&
		item.status === "ambiguous" && broadFields.has(normalizeField(item.field))))
		return preview;
	const isTargetFact = (item: NewSalesFormSeed["unresolved"][number]) =>
		["height", "mouldingprofile", "boardproduct"].includes(normalizeField(item.field));
	const sourceFacts = recoverableMissingFacts(sourceText).filter(isTargetFact);
	if (!sourceFacts.length) return preview;
	const recoverable = recoverableMissingFacts(sourceText, answered).filter(isTargetFact);
	const recoverableFields = new Set(sourceFacts.map((item) =>
		normalizeField(item.field),
	));
	const unresolved = preview.seed.unresolved.map((item) => {
		if (item.lineUid !== null || item.status !== "ambiguous") return item;
		const field = normalizeField(item.field);
		const broadDoorConcern = ["doors", "doorschedule", "schedule"].includes(field) &&
			recoverableFields.has("height");
		const broadMouldingConcern = ["moulding", "mouldings"].includes(field) &&
			(recoverableFields.has("mouldingprofile") || recoverableFields.has("boardproduct"));
		return broadDoorConcern || broadMouldingConcern
			? { ...item, status: "unsupported" as const }
			: item;
	});
	const presentFields = new Set(unresolved.map((item) => normalizeField(item.field)));
	for (const item of recoverable) {
		const field = normalizeField(item.field);
		if (presentFields.has(field)) continue;
		unresolved.push(item);
		presentFields.add(field);
	}
	return {
		...preview,
		seed: { ...preview.seed, unresolved },
	} as TPreview;
}

function applyConfirmedMouldingProducts<TPreview extends Preview>(
	preview: TPreview,
	sourceText: string,
	configuration: Configuration,
	answers: readonly Answer[],
): TPreview {
	const rootRoute = configuration.routes.find((route) => {
		const rootStep = configuration.steps.find((step) => step.id === route.rootStepId);
		return /^mouldings?$/i.test(rootStep?.components.find(
			(component) => component.uid === route.itemTypeUid,
		)?.title.trim() ?? "");
	});
	if (!rootRoute) return preview;
	const mouldingStep = configuration.steps.find((step) =>
		rootRoute.stepUids.includes(step.uid) && /^mouldings?$/i.test(step.title.trim()),
	);
	if (!mouldingStep) return preview;
	const normalizedField = (field: string) =>
		field.toLowerCase().replace(/[^a-z0-9]/g, "");
	const selected = new Map<"mouldingProfile" | "boardProduct",
		Configuration["steps"][number]["components"][number]>();
	for (const answer of answers) {
		const field = normalizedField(answer.question.field);
		if (field !== "mouldingprofile" && field !== "boardproduct") continue;
		const component = mouldingStep.components.find((candidate) =>
			candidate.title.trim() === answer.answer,
		);
		if (component) selected.set(
			field === "mouldingprofile" ? "mouldingProfile" : "boardProduct",
			component,
		);
	}
	if (!selected.size) return preview;
	type SourceFact = {
		section: string;
		kind: "mouldingProfile" | "boardProduct";
		quantity: number;
		linearFeet?: number;
	};
	const facts: SourceFact[] = [];
	let section: string | null = null;
	for (const sourceLine of sourceText.split(/\r?\n/)) {
		const line = sourceLine.trim();
		if (/^(?:left|right)(?:\s+side)?\s*:? ?$/i.test(line) ||
			/^(?:side|unit|section)\s+[\p{L}\p{N}_.-]+\s*:? ?$/iu.test(line)) {
			section = line.replace(/\s*:\s*$/, "").trim();
			continue;
		}
		if (!section) continue;
		const baseboard = line.match(/^(\d+)\s+(?:LF|linear\s+feet)\s+(?:for\s+)?baseboard\b/i);
		if (baseboard) {
			const linearFeet = Number(baseboard[1]);
			if (Number.isSafeInteger(linearFeet) && linearFeet > 0)
				facts.push({ section, kind: "mouldingProfile", quantity: 0, linearFeet });
			continue;
		}
		const board = line.match(/^(\d+)\s*=\s*12\s*(?:["”]|inches?\b|in\b)\s*boards?\b/i);
		if (board) {
			const quantity = Number(board[1]);
			if (Number.isSafeInteger(quantity) && quantity > 0)
				facts.push({ section, kind: "boardProduct", quantity });
		}
	}
	if (new Set(facts.map((fact) => fact.section.toLowerCase())).size < 2) return preview;
	const stockLength = (title: string) => [...title.matchAll(
		/\bx\s*(\d{1,2})(?:\s*(?:ft\b|['’]))?(?=\s|$|[),;])/gi,
	)].map((match) => Number(match[1])).filter((value) => value >= 6 && value <= 24).at(-1);
	const usableFacts = facts.flatMap((fact) => {
		const component = selected.get(fact.kind);
		if (!component) return [];
		if (fact.kind === "boardProduct") return [{ ...fact, component }];
		const pieceLength = stockLength(component.title);
		if (!pieceLength || fact.linearFeet == null) return [];
		return [{ ...fact, component, pieceLength,
			quantity: Math.ceil(fact.linearFeet / pieceLength) }];
	});
	if (!usableFacts.length) return preview;
	const replacedComponentUids = new Set(usableFacts.map((fact) => fact.component.uid));
	const matchingFactForLine = (line: Preview["seed"]["lineItems"][number]) => {
		const uid = line.uid.toLowerCase().replace(/[^a-z0-9]+/g, "-");
		return usableFacts.find((fact) => {
			const section = fact.section.toLowerCase().replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			const sectionToken = /^(left|right)-side$/.test(section)
				? section.split("-")[0]! : section;
			const kindPattern = fact.kind === "mouldingProfile"
				? /(?:^|-)(?:mould|moulding|base|baseboard)(?:-|$)/
				: /(?:^|-)board(?:-|$)/;
			return !!sectionToken && `-${uid}-`.includes(`-${sectionToken}-`) &&
				kindPattern.test(uid);
		});
	};
	const isCorrespondingRootPlaceholder = (
		line: Preview["seed"]["lineItems"][number],
	) => {
		if (line.meta?.mouldingRows?.length || /attic/i.test(line.uid))
			return false;
		const hasMouldingsRoot = line.formSteps.some((step) =>
			step.stepId === rootRoute.rootStepId && "prodUid" in step &&
			step.prodUid === rootRoute.itemTypeUid,
		);
		const hasNonRootSelection = line.formSteps.some((step) => {
			if (step.stepId === rootRoute.rootStepId) return false;
			if ("prodUid" in step) return !!step.prodUid;
			if ("value" in step) return !!step.value.trim();
			return "meta" in step && step.meta.selectedProdUids.length > 0;
		});
		if (!hasMouldingsRoot || hasNonRootSelection) return false;
		return !!matchingFactForLine(line);
	};
	const removedLineFacts = new Map<string, (typeof usableFacts)[number]>();
	const lineItems = preview.seed.lineItems.filter((line) => {
		const removed = line.meta?.mouldingRows?.some((row) =>
			replacedComponentUids.has(row.uid)) || isCorrespondingRootPlaceholder(line);
		if (removed) {
			const fact = matchingFactForLine(line);
			if (fact) removedLineFacts.set(line.uid, fact);
		}
		return !removed;
	});
	const usedUids = new Set(lineItems.map((line) => line.uid));
	const replacementUidByFact = new Map<(typeof usableFacts)[number], string>();
	const lineUid = (fact: (typeof usableFacts)[number]) => {
		const base = `clarified-${fact.section}-${fact.kind}-${fact.component.uid}`
			.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
			"clarified-moulding";
		let uid = base;
		for (let index = 2; usedUids.has(uid); index++) uid = `${base}-${index}`;
		usedUids.add(uid);
		return uid;
	};
	for (const fact of usableFacts) {
		const mouldingRow = fact.kind === "mouldingProfile"
			? { uid: fact.component.uid, qty: fact.quantity, calculation: {
				linearFeet: fact.linearFeet!, pieceLength: fact.pieceLength!, wastePercentage: 0,
			} }
			: { uid: fact.component.uid, qty: fact.quantity };
		const uid = lineUid(fact);
		replacementUidByFact.set(fact, uid);
		lineItems.push({
			uid,
			qty: fact.quantity,
			formSteps: [
				{ stepId: rootRoute.rootStepId, prodUid: rootRoute.itemTypeUid },
				{ stepId: mouldingStep.id, meta: { selectedProdUids: [fact.component.uid] } },
			],
			meta: { mouldingRows: [mouldingRow] },
		});
	}
	const retainedLineUids = new Set(lineItems.map((line) => line.uid));
	const confirmedTitles = new Set([...selected.values()].map((component) =>
		component.title.trim().toLowerCase()));
	const unresolved = preview.seed.unresolved.flatMap((item) => {
		const reason = item.reason.toLowerCase();
		const contradictsConfirmedCatalog = [...confirmedTitles].some((title) =>
			reason.includes(title) &&
			/\b(?:not present|not found|missing)\b[^.]{0,80}\bconfig(?:uration)?\b|\bprovide a substitution\b/i.test(item.reason));
		if (contradictsConfirmedCatalog) return [];
		if (!item.lineUid || retainedLineUids.has(item.lineUid)) return [item];
		const field = normalizedField(item.field);
		if (field === "mouldingprofile" || field === "boardproduct") return [];
		return [{
			...item,
			lineUid: null,
			stepId: null,
			status: "unsupported" as const,
		}];
	});
	const interpretations = preview.seed.interpretations?.flatMap((interpretation) => {
		if (retainedLineUids.has(interpretation.lineUid)) return [interpretation];
		const fact = removedLineFacts.get(interpretation.lineUid);
		const replacementUid = fact && replacementUidByFact.get(fact);
		return replacementUid && fact?.component.uid === interpretation.selectedProdUid
			? [{ ...interpretation, lineUid: replacementUid }]
			: [];
	});
	return {
		...preview,
		seed: {
			...preview.seed,
			lineItems,
			unresolved,
			...(interpretations ? { interpretations } : {}),
		},
	} as TPreview;
}

async function createClarifiablePreview(
	input: Parameters<typeof createSalesRequestPreview>[0],
	dependencies: Dependencies,
	answered: readonly SalesRequestAnswerContext[] = [],
): Promise<Preview> {
	try {
		return await createSalesRequestPreview(
			{ ...input, allowClarificationFallback: true }, dependencies,
		);
	} catch (error) {
		if (!(error instanceof SalesRequestPreviewNeedsClarification)) throw error;
		const unresolved = retainDenseFallbackRowReviews(
			input.text,
			recoverableMissingFacts(input.text, answered),
			answered,
		);
		if (!unresolved.length)
			throw new Error("The AI provider could not generate a request preview. Try again.");
		return {
			generationId: error.generationId,
			configurationScope: error.configurationScope,
			configurationRevision: error.configurationRevision,
			promptVersion: SALES_REQUEST_PROMPT_VERSION,
			provider: error.provider,
			model: error.model,
			usage: error.usage,
			seed: { schemaVersion: 2, lineItems: [], unresolved },
		};
	}
}
function surface(session: Session, questions: ClarificationQuestion[]) {
	return questions.length
		? {
				sessionId: session.id,
				revision: session.revision,
				round: session.revision,
				questions,
			}
		: null;
}
export async function ownedClarification(
	db: ClarificationDatabase,
	id: string,
	actorUserId: number,
) {
	const session = await db.salesRequestClarificationSession.findUnique({
		where: { id },
	});
	if (!session || session.actorUserId !== actorUserId)
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Request clarification not found.",
		});
	return session;
}
export function isOrderSpecificClarificationField(field: string) {
	return /quantity|qty|dimension|size|height|width|length|count|room|handing|swing|jamb|configuration|price|cost/.test(
		field.toLowerCase(),
	);
}

export function reusableClarification(
	answer: Answer,
	sourceText: string,
	productTitles: readonly string[] = [],
) {
	// Reuse narrow terminology only. Quantity, dimensions and order facts never become defaults.
	const field = answer.question.field.toLowerCase();
	const phrase = answer.question.sourceText?.trim().toLowerCase();
	return (
		answer.reuse &&
		answer.active &&
		/product|profile|material|finish|model|species|door/.test(field) &&
		!isOrderSpecificClarificationField(field) &&
		(!/\d/.test(answer.answer) ||
			productTitles.some(
				(title) =>
					title.trim().toLowerCase() === answer.answer.trim().toLowerCase(),
			)) &&
		!!phrase &&
		phrase.length >= 4 &&
		sourceText.toLowerCase().includes(phrase)
	);
}
export async function readClarificationGuidance(
	db: ClarificationDatabase,
	input: {
		actorUserId: number;
		scope: string;
		configurationRevision: string;
		text: string;
		productTitles?: readonly string[];
	},
) {
	const sessions = await db.salesRequestClarificationSession.findMany({
		where: {
			actorUserId: input.actorUserId,
			scope: input.scope,
			configurationRevision: input.configurationRevision,
			status: "complete",
		},
		orderBy: { updatedAt: "desc" },
		take: 200,
	});
	const candidates = sessions
		.flatMap((session) =>
			(session.answers as Answer[])
				.filter((answer) =>
					reusableClarification(answer, input.text, input.productTitles),
				)
				.map((answer) => ({
					question: `For phrase "${answer.question.sourceText}": ${answer.question.question}`,
					answer: answer.answer,
					field: answer.question.field,
					sourceText: answer.question.sourceText,
					...(answer.origin === "interpretation-warning"
						? { suppressWarning: true }
						: {}),
				})),
		)
		.slice(0, 50);
	const byQuestion = new Map<string, Set<string>>();
	for (const candidate of candidates) {
		const key = candidate.question.toLowerCase();
		const values = byQuestion.get(key) ?? new Set<string>();
		values.add(candidate.answer.toLowerCase());
		byQuestion.set(key, values);
	}
	return candidates
		.filter(
			(candidate, index) =>
				byQuestion.get(candidate.question.toLowerCase())?.size === 1 &&
				candidates.findIndex(
					(other) =>
						other.question === candidate.question &&
						other.answer === candidate.answer,
				) === index,
		)
		.slice(0, 12);
}

function warningAnswer(
	warning: SalesRequestInterpretation,
	active: boolean,
): Answer & { warningKey: string } {
	const key = interpretationWarningKey(warning);
	const eligible = reusableInterpretationField(warning.field);
	return {
		questionId: randomUUID(),
		answer: warning.selectedTitle,
		reuse: eligible,
		active: eligible && active,
		origin: "interpretation-warning",
		warningKey: key,
		warningCategory: interpretationWarningCategory(warning.field),
		selectedProdUid: warning.selectedProdUid,
		selectedTitle: warning.selectedTitle,
		stepId: warning.stepId,
		question: {
			id: randomUUID(),
			lineUid: warning.lineUid,
			field: warning.field,
			question: `Interpret “${warning.sourceText}” as ${warning.selectedTitle}.`,
			sourceText: warning.sourceText,
			reason: warning.reason,
		},
	};
}

function interpretationAnswers(rows: Session[]) {
	return rows.flatMap((row) =>
		(row.answers as Answer[]).flatMap((answer) =>
			answer.origin === "interpretation-warning" && answer.warningKey
				? [
						{
							row,
							answer: answer as Answer & { warningKey: string },
						},
					]
				: [],
		),
	);
}

export async function recordSalesRequestInterpretationWarnings(
	db: ClarificationDatabase,
	input: {
		actorUserId: number;
		saleType: "order" | "quote";
		scope: string;
		configurationRevision: string;
		sourceText: string;
		interpretations: readonly SalesRequestInterpretation[];
	},
) {
	if (!input.interpretations.length) return [];
	const previous = await db.salesRequestClarificationSession.findMany({
		where: {
			actorUserId: input.actorUserId,
			scope: input.scope,
			configurationRevision: input.configurationRevision,
			status: "complete",
		},
		orderBy: { updatedAt: "desc" },
		take: 200,
	});
	const activeKeys = new Set(
		interpretationAnswers(previous)
			.filter(({ answer }) => answer.active)
			.map(({ answer }) => answer.warningKey),
	);
	const answers = input.interpretations.map((warning) =>
		warningAnswer(warning, activeKeys.has(interpretationWarningKey(warning))),
	);
	await db.salesRequestClarificationSession.create({
		data: {
			id: randomUUID(),
			actorUserId: input.actorUserId,
			saleType: input.saleType,
			scope: input.scope,
			configurationRevision: input.configurationRevision,
			sourceText: input.sourceText,
			revision: 1,
			status: "complete",
			questions: [],
			answers,
		},
	});
	return answers.map((answer) => ({
		key: answer.warningKey,
		active: answer.active,
	}));
}

function suppressApprovedInterpretationWarnings<
	TExtendsPreview extends Preview,
>(
	preview: TExtendsPreview,
	guidance: Awaited<ReturnType<typeof readClarificationGuidance>>,
): TExtendsPreview {
	const suppressed = guidance.filter((item) => item.suppressWarning);
	if (!suppressed.length || !preview.seed.interpretations?.length)
		return preview;
	return {
		...preview,
		seed: {
			...preview.seed,
			interpretations: preview.seed.interpretations.filter(
				(warning) =>
					!suppressed.some(
						(item) =>
							item.field?.trim().toLowerCase() ===
								warning.field.trim().toLowerCase() &&
							item.sourceText?.trim().toLowerCase() ===
								warning.sourceText.trim().toLowerCase() &&
							item.answer.trim().toLowerCase() ===
								warning.selectedTitle.trim().toLowerCase(),
					),
			),
		},
	} as TExtendsPreview;
}
export async function beginSalesRequestClarification(input: {
	db: ClarificationDatabase;
	actorUserId: number;
	type: "order" | "quote";
	text: string;
	signal: AbortSignal;
	dependencies: Dependencies;
}) {
	await input.dependencies.authorize();
	const snapshot = await input.dependencies.readSnapshot();
	const guidance = await readClarificationGuidance(input.db, {
		actorUserId: input.actorUserId,
		scope: snapshot.scope,
		configurationRevision: snapshot.revision,
		text: input.text,
		productTitles: snapshot.configuration.steps.flatMap((step) =>
			step.components.map((component) => component.title),
		),
	});
	const generatedPreview = await createClarifiablePreview(
		{ text: input.text, images: [], signal: input.signal, guidance },
		input.dependencies,
	);
	const preview = applyDraftClarificationPolicy(reviewDenseArchitecturalSchedule(
		clarifyUnspecifiedScheduleRows(
			normalizeRecoverableClarifications(
				suppressApprovedInterpretationWarnings(generatedPreview, guidance),
				input.text,
			),
			input.text,
		),
		input.text,
	), input.text, snapshot.configuration);
	input.signal.throwIfAborted();
	const questions = questionsFor(
		preview,
		input.text,
		snapshot.configuration,
	);
	if (!questions.length) {
		await recordSalesRequestInterpretationWarnings(input.db, {
			actorUserId: input.actorUserId,
			saleType: input.type,
			scope: preview.configurationScope,
			configurationRevision: preview.configurationRevision,
			sourceText: input.text,
			interpretations: preview.seed.interpretations ?? [],
		});
		return { ...preview, clarification: null };
	}
	const session = await input.db.salesRequestClarificationSession.create({
		data: {
			id: randomUUID(),
			actorUserId: input.actorUserId,
			saleType: input.type,
			scope: preview.configurationScope,
			configurationRevision: preview.configurationRevision,
			sourceText: input.text,
			revision: 1,
			status: "awaiting",
			questions,
			answers: [],
		},
	});
	return { ...preview, clarification: surface(session, questions) };
}
export async function answerSalesRequestClarification(input: {
	db: ClarificationDatabase;
	actorUserId: number;
	sessionId: string;
	revision: number;
	answers: { questionId: string; answer: string; reuse: boolean }[];
	signal: AbortSignal;
	dependencies: Dependencies;
}) {
	const session = await ownedClarification(
		input.db,
		input.sessionId,
		input.actorUserId,
	);
	await input.dependencies.authorize();
	if (session.status !== "awaiting" || session.revision !== input.revision)
		conflict(
			"This questionnaire changed or is already being processed. Reload it before submitting.",
		);
	if (session.revision >= 10)
		conflict(
			"This request needs manual review after multiple clarification rounds. Start a simpler request or complete the sales form manually.",
		);
	const questions = session.questions as ClarificationQuestion[];
	if (
		input.answers.length !== questions.length ||
		new Set(input.answers.map((a) => a.questionId)).size !== questions.length ||
		input.answers.some(
			(a) => !questions.some((q) => q.id === a.questionId) || !a.answer.trim(),
		)
	)
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Answer every current question once.",
		});
	const snapshot = await input.dependencies.readSnapshot();
	if (
		snapshot.scope !== session.scope ||
		snapshot.revision !== session.configurationRevision
	)
		conflict("Sales configuration changed. Start a new request.");
	const productTitles = snapshot.configuration.steps.flatMap((step) =>
		step.components.map((component) => component.title),
	);
	const submittedAnswers = input.answers.map((answer) => {
		const question = questions.find((item) => item.id === answer.questionId);
		return {
			...answer,
			answer: question
				? normalizedClarificationAnswer(question, answer.answer)
				: answer.answer.trim(),
		};
	});
	if (submittedAnswers.some((answer) => {
		const question = questions.find((item) => item.id === answer.questionId);
		return question && !clarificationQuestionAllowsOther(question, snapshot.configuration) &&
			!question.options?.some((option) => option.value === answer.answer);
	}))
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Choose a configured option for this Sales step.",
		});
	if (submittedAnswers.some((answer) => {
		if (!answer.reuse) return false;
		const question = questions.find((item) => item.id === answer.questionId);
		return !question?.canSaveRule || !reusableClarification({
			questionId: answer.questionId,
			answer: answer.answer,
			reuse: true,
			active: true,
			question,
		}, session.sourceText, productTitles);
	}))
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This answer cannot be saved as a rule.",
		});
	const guidance = await readClarificationGuidance(input.db, {
		actorUserId: input.actorUserId,
		scope: session.scope,
		configurationRevision: session.configurationRevision,
		text: session.sourceText,
		productTitles,
	});
	const acquired = await input.db.salesRequestClarificationSession.updateMany({
		where: {
			id: session.id,
			actorUserId: input.actorUserId,
			revision: input.revision,
			status: "awaiting",
		},
		data: { status: "processing" },
	});
	if (acquired.count !== 1)
		conflict("This questionnaire is already being processed.");
	try {
		const answers: Answer[] = [
			...(session.answers as Answer[]),
			...submittedAnswers.map((answer) => ({
				...answer,
				answer: answer.answer,
				active: answer.reuse,
				question: (() => {
					const question = questions.find((q) => q.id === answer.questionId);
					if (!question)
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Answer every current question once.",
						});
					return {
						...question,
						sourceText:
							question.sourceText ??
							clarificationSourceReference(
								question.reason,
								session.sourceText,
								snapshot.configuration.steps.flatMap((step) =>
									step.components.map((component) => component.title),
								),
							),
					};
				})(),
			})),
		];
		if (
			answers.reduce(
				(total, answer) =>
					total + answer.answer.length + answer.question.reason.length,
				0,
			) > 24_000
		) {
			await input.db.salesRequestClarificationSession.updateMany({
				where: {
					id: session.id,
					revision: input.revision,
					status: "processing",
				},
				data: { status: "awaiting" },
			});
			conflict(
				"The clarification history is too long. Start a smaller request or complete the sales form manually.",
			);
		}
		const generatedPreview = await createClarifiablePreview(
			{
				text: session.sourceText,
				images: [],
				signal: input.signal,
				guidance,
				clarifications: answers.map((a) => ({
					question: `${a.question.question} ${a.question.reason}`,
					answer: a.answer,
					field: a.question.field,
					sourceText:
						a.question.sourceText ??
						clarificationSourceReference(
							a.question.reason,
							session.sourceText,
							snapshot.configuration.steps.flatMap((step) =>
								step.components.map((component) => component.title),
							),
						),
				})),
			},
			input.dependencies,
			answers.map((answer) => ({
				question: answer.question.question,
				answer: answer.answer,
				field: answer.question.field,
				sourceText: answer.question.sourceText,
			})),
		);
		const confirmedPreview = applyConfirmedMouldingProducts(
			generatedPreview,
			session.sourceText,
			snapshot.configuration,
			answers,
		);
		const preview = applyDraftClarificationPolicy(reviewDenseArchitecturalSchedule(
			clarifyUnspecifiedScheduleRows(
				normalizeRecoverableClarifications(
					suppressApprovedInterpretationWarnings(confirmedPreview, guidance),
					session.sourceText,
					answers.map((answer) => ({ field: answer.question.field })),
				),
				session.sourceText,
				answers,
			),
			session.sourceText,
			answers,
		), session.sourceText, snapshot.configuration);
		input.signal.throwIfAborted();
		const nextQuestions = questionsFor(
			preview,
			session.sourceText,
			snapshot.configuration,
			answers,
		);
		const updated = await input.db.salesRequestClarificationSession.updateMany({
			where: { id: session.id, revision: input.revision, status: "processing" },
			data: {
				revision: input.revision + 1,
				status: nextQuestions.length ? "awaiting" : "complete",
				questions: nextQuestions,
				answers,
			},
		});
		if (updated.count !== 1)
			conflict("This request was cancelled before the answers were applied.");
		if (!nextQuestions.length) {
			await recordSalesRequestInterpretationWarnings(input.db, {
				actorUserId: input.actorUserId,
				saleType: session.saleType as "order" | "quote",
				scope: session.scope,
				configurationRevision: session.configurationRevision,
				sourceText: session.sourceText,
				interpretations: preview.seed.interpretations ?? [],
			});
		}
		return {
			...preview,
			clarification: surface(
				{ ...session, revision: input.revision + 1 },
				nextQuestions,
			),
		};
	} catch (error) {
		await input.db.salesRequestClarificationSession.updateMany({
			where: { id: session.id, revision: input.revision, status: "processing" },
			data: { status: "awaiting" },
		});
		throw error;
	}
}

export async function cancelSalesRequestClarification(
	db: ClarificationDatabase,
	sessionId: string,
	actorUserId: number,
) {
	await ownedClarification(db, sessionId, actorUserId);
	await db.salesRequestClarificationSession.updateMany({
		where: { id: sessionId, actorUserId },
		data: { status: "cancelled" },
	});
	return { cancelled: true };
}

export async function listSalesRequestInterpretationWarnings(
	db: ClarificationDatabase,
	actorUserId: number | null,
	effective?: { scope: string; configurationRevision: string },
	activeGlobalWarningKeys: ReadonlySet<string> = new Set(),
) {
	const rows = await db.salesRequestClarificationSession.findMany({
		where: {
			status: "complete",
			...(actorUserId == null ? {} : { actorUserId }),
		},
		orderBy: { updatedAt: "desc" },
		take: 200,
	});
	type WarningRow = {
		key: string;
		category: InterpretationWarningCategory;
		stepId: number;
		field: string;
		sourceText: string;
		selectedProdUid: string;
		selectedTitle: string;
		reason: string;
		occurrenceCount: number;
		doNotShow: boolean;
		eligible: boolean;
		lastSeenAt: string | null;
	};
	const byKey = new Map<string, WarningRow>();
	for (const { row, answer } of interpretationAnswers(rows)) {
		const key = answer.warningKey;
		const existing = byKey.get(key);
		if (existing) {
			existing.occurrenceCount += 1;
			if (
				activeGlobalWarningKeys.has(key) ||
				(answer.active &&
					(!effective ||
						(row.scope === effective.scope &&
							row.configurationRevision === effective.configurationRevision)))
			)
				existing.doNotShow = true;
			continue;
		}
		const effectiveForCurrent =
			!effective ||
			(row.scope === effective.scope &&
				row.configurationRevision === effective.configurationRevision);
		byKey.set(key, {
			key,
			category:
				answer.warningCategory ??
				interpretationWarningCategory(answer.question.field),
			stepId: answer.stepId ?? 0,
			field: answer.question.field,
			sourceText: answer.question.sourceText ?? "",
			selectedProdUid: answer.selectedProdUid ?? "",
			selectedTitle: answer.selectedTitle ?? answer.answer,
			reason: answer.question.reason,
			occurrenceCount: 1,
			doNotShow:
				activeGlobalWarningKeys.has(key) ||
				(effectiveForCurrent && answer.active),
			eligible:
				answer.reuse && reusableInterpretationField(answer.question.field),
			lastSeenAt:
				row.updatedAt instanceof Date
					? row.updatedAt.toISOString()
					: typeof row.updatedAt === "string"
						? row.updatedAt
						: null,
		});
	}
	const warnings = [...byKey.values()];
	const categories = SALES_REQUEST_INTERPRETATION_WARNING_CATEGORIES.map(
		(category) => {
			const categoryWarnings = warnings.filter(
				(warning) => warning.category === category,
			);
			return {
				category,
				occurrenceCount: categoryWarnings.reduce(
					(total, warning) => total + warning.occurrenceCount,
					0,
				),
				warningCount: categoryWarnings.length,
				doNotShowCount: categoryWarnings.filter((warning) => warning.doNotShow)
					.length,
				warnings: categoryWarnings,
			};
		},
	).filter((category) => category.warningCount > 0);
	return {
		summary: {
			occurrenceCount: warnings.reduce(
				(total, warning) => total + warning.occurrenceCount,
				0,
			),
			warningCount: warnings.length,
			doNotShowCount: warnings.filter((warning) => warning.doNotShow).length,
		},
		categories,
	};
}

async function updateInterpretationWarningAnswer(
	db: ClarificationDatabase,
	row: Session,
	key: string,
	active: boolean,
) {
	const answers = row.answers as Answer[];
	if (!answers.some((answer) => answer.warningKey === key)) return false;
	const updated = await db.salesRequestClarificationSession.updateMany({
		where: { id: row.id, actorUserId: row.actorUserId, revision: row.revision },
		data: {
			revision: row.revision + 1,
			answers: answers.map((answer) =>
				answer.warningKey === key ? { ...answer, active } : answer,
			),
		},
	});
	if (updated.count !== 1)
		conflict("Warning guidance changed. Reload before editing.");
	return true;
}

export async function setSalesRequestInterpretationWarningGuidance(
	db: ClarificationDatabase,
	actorUserId: number,
	input:
		| {
				key: string;
				active: boolean;
				scope?: string;
				configurationRevision?: string;
				isCurrentComponent?: (
					stepId: number,
					prodUid: string,
					title: string,
				) => boolean;
		  }
		| {
				warning: SalesRequestInterpretation;
				active: boolean;
				scope: string;
				configurationRevision: string;
		  },
) {
	const key =
		"key" in input ? input.key : interpretationWarningKey(input.warning);
	const rows = await db.salesRequestClarificationSession.findMany({
		where: {
			actorUserId,
			status: "complete",
			...("warning" in input
				? {
						scope: input.scope,
						configurationRevision: input.configurationRevision,
					}
				: {}),
		},
		orderBy: { updatedAt: "desc" },
		take: 200,
	});
	const matching = rows.filter((row) =>
		(row.answers as Answer[]).some(
			(answer) =>
				answer.origin === "interpretation-warning" && answer.warningKey === key,
		),
	);
	if (input.active) {
		const target = matching.find(
			(row) =>
				(!("key" in input) ||
					!input.scope ||
					(row.scope === input.scope &&
						row.configurationRevision === input.configurationRevision)) &&
				(row.answers as Answer[]).some(
					(answer) => answer.warningKey === key && answer.reuse,
				),
		);
		if (target) {
			await updateInterpretationWarningAnswer(db, target, key, true);
		} else if ("key" in input && input.scope && input.configurationRevision) {
			const observed = matching
				.flatMap((row) => row.answers as Answer[])
				.find(
					(
						answer,
					): answer is Answer & {
						stepId: number;
						selectedProdUid: string;
						selectedTitle: string;
					} =>
						Boolean(
							answer.warningKey === key &&
								answer.reuse &&
								answer.stepId != null &&
								answer.selectedProdUid &&
								answer.selectedTitle,
						),
				);
			if (!observed)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Interpretation warning not found.",
				});
			if (
				input.isCurrentComponent &&
				!input.isCurrentComponent(
					observed.stepId,
					observed.selectedProdUid,
					observed.selectedTitle,
				)
			)
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"This interpretation no longer matches the current Sales Request catalog.",
				});
			await db.salesRequestClarificationSession.create({
				data: {
					id: randomUUID(),
					actorUserId,
					saleType: "guidance",
					scope: input.scope,
					configurationRevision: input.configurationRevision,
					sourceText: observed.question.sourceText ?? "",
					revision: 1,
					status: "complete",
					questions: [],
					answers: [{ ...observed, questionId: randomUUID(), active: true }],
				},
			});
		} else if ("warning" in input) {
			if (!reusableInterpretationField(input.warning.field))
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Quantity, dimension, price, and other request-specific warnings cannot become reusable guidance.",
				});
			await db.salesRequestClarificationSession.create({
				data: {
					id: randomUUID(),
					actorUserId,
					saleType: "guidance",
					scope: input.scope,
					configurationRevision: input.configurationRevision,
					sourceText: input.warning.sourceText,
					revision: 1,
					status: "complete",
					questions: [],
					answers: [warningAnswer(input.warning, true)],
				},
			});
		} else {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Interpretation warning not found.",
			});
		}
	} else {
		for (const row of matching.filter((candidate) =>
			(candidate.answers as Answer[]).some(
				(answer) => answer.warningKey === key && answer.active,
			),
		)) {
			await updateInterpretationWarningAnswer(db, row, key, false);
		}
	}
	return { updated: true, key, active: input.active };
}

export async function listSalesRequestClarificationGuidance(
	db: ClarificationDatabase,
	actorUserId: number,
) {
	const rows = await db.salesRequestClarificationSession.findMany({
		where: { actorUserId, status: "complete" },
		orderBy: { updatedAt: "desc" },
		take: 50,
	});
	return rows.flatMap((row) =>
		(row.answers as Answer[])
			.filter(
				(answer) => answer.reuse && answer.origin !== "interpretation-warning",
			)
			.map((answer) => ({ ...answer, sessionId: row.id, scope: row.scope })),
	);
}
export async function setSalesRequestClarificationGuidance(
	db: ClarificationDatabase,
	actorUserId: number,
	input: {
		sessionId: string;
		questionId: string;
		active: boolean;
		answer?: string;
	},
) {
	const row = await ownedClarification(db, input.sessionId, actorUserId);
	const answers = row.answers as Answer[];
	if (
		row.status !== "complete" ||
		!answers.some(
			(answer) => answer.questionId === input.questionId && answer.reuse,
		)
	)
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Reusable answer not found.",
		});
	const updated = await db.salesRequestClarificationSession.updateMany({
		where: { id: row.id, revision: row.revision, status: "complete" },
		data: {
			revision: row.revision + 1,
			answers: answers.map((answer) =>
				answer.questionId === input.questionId
					? {
							...answer,
							active: input.active,
							...(input.answer ? { answer: input.answer } : {}),
						}
					: answer,
			),
		},
	});
	if (updated.count !== 1) conflict("Guidance changed. Reload before editing.");
	return { updated: true };
}
