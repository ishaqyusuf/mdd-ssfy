import type { NewSalesFormSeed } from "@gnd/sales/sales-form";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";
import type { NewSalesFormStepRouting } from "./schema";

export type SalesRequestReviewRouteData = Pick<
	NewSalesFormStepRouting,
	"settingsMeta" | "composedRouter" | "stepsById" | "stepsByUid"
>;

export type SalesRequestReviewSelection = {
	stepId: number;
	stepTitle: string;
	values: string[];
	kind: "single" | "multiple" | "custom";
};

export type SalesRequestReviewHptRow = {
	dimension: string;
	quantity: number;
	handed?: string | null;
	swing?: string | null;
};

export type SalesRequestReviewMouldingRow = {
	title: string;
	quantity: number;
	calculation: string | null;
};

export type SalesRequestReviewServiceRow = {
	service: string;
	quantity: number;
};

export type SalesRequestReviewLine = {
	uid: string;
	quantity: number;
	selections: SalesRequestReviewSelection[];
	hptRows: SalesRequestReviewHptRow[];
	mouldingRows: SalesRequestReviewMouldingRow[];
	serviceRows: SalesRequestReviewServiceRow[];
};

export type SalesRequestReviewUnresolved = {
	lineLabel: string;
	stepLabel: string;
	field: string;
	status: "ambiguous" | "unreadable" | "unsupported";
	reason: string;
};

export type SalesRequestReviewWarning = {
	lineLabel: string;
	stepLabel: string;
	detail: string;
};

export type SalesRequestReviewDefault = {
	lineLabel: string;
	stepLabel: string;
	value: string;
};

export type SalesRequestReviewModel = {
	lines: SalesRequestReviewLine[];
	delivery: {
		option: "pickup" | "delivery";
		amount: number | null;
	} | null;
	unresolved: SalesRequestReviewUnresolved[];
	warnings: SalesRequestReviewWarning[];
	defaults: SalesRequestReviewDefault[];
};

type PreviewOrSeed =
	| NewSalesFormSeed
	| Pick<SalesRequestGeneratePreviewOutput, "seed">;

type ReviewStep = NonNullable<
	NonNullable<SalesRequestReviewRouteData["stepsByUid"]>[string]
>;

function readRecord(value: unknown): Record<string, unknown> {
	if (typeof value === "string") {
		try {
			return readRecord(JSON.parse(value));
		} catch {
			return {};
		}
	}
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function text(value: unknown, fallback: string) {
	const normalized = typeof value === "string" ? value.trim() : "";
	return normalized || fallback;
}

function readSeed(input: PreviewOrSeed): NewSalesFormSeed {
	return "seed" in input ? input.seed : input;
}

function routeStep(
	routeData: SalesRequestReviewRouteData | null | undefined,
	stepId: number,
): ReviewStep | undefined {
	const stepUid = routeData?.stepsById?.[stepId];
	return stepUid ? routeData?.stepsByUid?.[stepUid] : undefined;
}

function componentForUid(
	routeData: SalesRequestReviewRouteData | null | undefined,
	stepId: number,
	uid: string,
) {
	const scopedStep = routeStep(routeData, stepId);
	const scopedComponent = scopedStep?.components?.find(
		(component) => component.uid === uid,
	);
	if (scopedComponent) return scopedComponent;
	for (const step of Object.values(routeData?.stepsByUid ?? {})) {
		const component = step.components?.find(
			(candidate) => candidate.uid === uid,
		);
		if (component) return component;
	}
	return undefined;
}

function stepTitle(
	routeData: SalesRequestReviewRouteData | null | undefined,
	stepId: number,
) {
	return text(routeStep(routeData, stepId)?.title, `Step ${stepId}`);
}

function rootUidForLine(
	line: Extract<NewSalesFormSeed["lineItems"][number], { formSteps: unknown }>,
	routeData: SalesRequestReviewRouteData | null | undefined,
) {
	const configuredRoots = new Set(Object.keys(routeData?.composedRouter ?? {}));
	for (const formStep of line.formSteps) {
		const scalarStep = formStep as { prodUid?: unknown };
		if (
			typeof scalarStep.prodUid === "string" &&
			configuredRoots.has(scalarStep.prodUid)
		) {
			return scalarStep.prodUid;
		}
	}
	for (const formStep of line.formSteps) {
		const prodUid = (formStep as { prodUid?: unknown }).prodUid;
		if (typeof prodUid === "string") return prodUid;
	}
	return null;
}

function readRouteDefaults(
	routeData: SalesRequestReviewRouteData | null | undefined,
	rootUid: string | null,
) {
	if (!rootUid) return [] as Array<[string, string]>;
	const settingsMeta = readRecord(routeData?.settingsMeta);
	const directRoute = readRecord(settingsMeta.route);
	const nestedData = readRecord(settingsMeta.data);
	const route = Object.keys(directRoute).length
		? directRoute
		: readRecord(nestedData.route);
	const routeDefinition = readRecord(route[rootUid]);
	const requestGeneration = readRecord(routeDefinition.requestGeneration);
	const defaults = readRecord(requestGeneration.defaults);
	return Object.entries(defaults).filter(
		(entry): entry is [string, string] => typeof entry[1] === "string",
	);
}

function selectionValues(
	formStep:
		| { stepId: number; prodUid: string }
		| { stepId: number; meta: { selectedProdUids: string[] } }
		| { stepId: number; value: string },
	routeData: SalesRequestReviewRouteData | null | undefined,
	warnings: SalesRequestReviewWarning[],
	lineLabel: string,
) {
	const titleForUid = (uid: string) => {
		const component = componentForUid(routeData, formStep.stepId, uid);
		if (component) return text(component.title, `Component ${uid}`);
		warnings.push({
			lineLabel,
			stepLabel: stepTitle(routeData, formStep.stepId),
			detail: `The current catalog did not provide an authoritative title for ${uid}.`,
		});
		return `Unknown component (${uid})`;
	};

	if ("prodUid" in formStep) {
		return {
			values: [titleForUid(formStep.prodUid)],
			kind: "single" as const,
		};
	}
	if ("meta" in formStep) {
		return {
			values: formStep.meta.selectedProdUids.map(titleForUid),
			kind: "multiple" as const,
		};
	}
	return { values: [formStep.value], kind: "custom" as const };
}

function reviewLine(
	line: NewSalesFormSeed["lineItems"][number],
	lineIndex: number,
	routeData: SalesRequestReviewRouteData | null | undefined,
	warnings: SalesRequestReviewWarning[],
): SalesRequestReviewLine {
	const lineLabel = `Line ${lineIndex + 1}`;
	const selections = line.formSteps.map((formStep) => {
		const values = selectionValues(formStep, routeData, warnings, lineLabel);
		return {
			stepId: formStep.stepId,
			stepTitle: stepTitle(routeData, formStep.stepId),
			...values,
		};
	});
	const hptRows = (line.housePackageTool?.doors ?? []).map((door) => {
		if ("totalQty" in door) {
			return {
				dimension: door.dimension,
				quantity: door.totalQty,
				handed: null,
				swing: "swing" in door ? (door.swing ?? null) : null,
			};
		}
		return {
			dimension: door.dimension,
			quantity: door.lhQty + door.rhQty,
			handed: `LH ${door.lhQty} · RH ${door.rhQty}`,
			swing: door.swing ?? null,
		};
	});
	const lineMeta = "meta" in line ? line.meta : undefined;
	const mouldingRows = (lineMeta?.mouldingRows ?? []).map((row) => {
		const component = componentForUid(routeData, 0, row.uid);
		if (!component) {
			warnings.push({
				lineLabel,
				stepLabel: "Mouldings",
				detail: `The current catalog did not provide an authoritative title for ${row.uid}.`,
			});
		}
		return {
			title: component
				? text(component.title, `Component ${row.uid}`)
				: `Unknown component (${row.uid})`,
			quantity: "qty" in row ? row.qty : 0,
			calculation:
				"calculation" in row
					? `${row.calculation.linearFeet} LF · ${row.calculation.pieceLength} ft${
							row.calculation.wastePercentage == null
								? ""
								: ` · ${row.calculation.wastePercentage}% waste`
						}`
					: null,
		};
	});
	const serviceRows = (lineMeta?.serviceRows ?? []).map((row) => ({
		service: row.service,
		quantity: row.qty,
	}));

	return {
		uid: line.uid,
		quantity: line.qty,
		selections,
		hptRows,
		mouldingRows,
		serviceRows,
	};
}

export function buildSalesRequestReviewModel(
	input: PreviewOrSeed,
	routeData: SalesRequestReviewRouteData | null | undefined,
): SalesRequestReviewModel {
	const seed = readSeed(input);
	const warnings: SalesRequestReviewWarning[] = [];
	const lines = seed.lineItems.map((line, index) =>
		reviewLine(line, index, routeData, warnings),
	);
	const defaults: SalesRequestReviewDefault[] = [];
	for (const [lineIndex, line] of seed.lineItems.entries()) {
		const rootUid = rootUidForLine(line, routeData);
		const selectedStepIds = new Set(
			line.formSteps.map((formStep) => formStep.stepId),
		);
		for (const [stepUid, componentUid] of readRouteDefaults(
			routeData,
			rootUid,
		)) {
			const configuredStep = routeData?.stepsByUid?.[stepUid];
			if (configuredStep && selectedStepIds.has(configuredStep.id)) continue;
			const component = configuredStep?.components?.find(
				(candidate) => candidate.uid === componentUid,
			);
			defaults.push({
				lineLabel: `Line ${lineIndex + 1}`,
				stepLabel: text(configuredStep?.title, stepUid),
				value: component
					? text(component.title, `Component ${componentUid}`)
					: `Unknown component (${componentUid})`,
			});
		}
	}

	const unresolved = seed.unresolved.map((issue) => {
		const lineIndex = issue.lineUid
			? seed.lineItems.findIndex((line) => line.uid === issue.lineUid)
			: -1;
		return {
			lineLabel: lineIndex >= 0 ? `Line ${lineIndex + 1}` : "Request",
			stepLabel:
				issue.stepId == null ? "Request" : stepTitle(routeData, issue.stepId),
			field: issue.field,
			status: issue.status,
			reason: issue.reason,
		};
	});

	const v2Seed = seed.schemaVersion === 2 ? seed : null;
	const deliveryCost = v2Seed?.extraCosts?.find(
		(cost) => cost.type === "Delivery",
	);
	const deliveryOption = v2Seed?.form?.deliveryOption;
	return {
		lines,
		delivery:
			deliveryOption || deliveryCost
				? {
						option: deliveryOption ?? "delivery",
						amount: deliveryCost?.amount ?? null,
					}
				: null,
		unresolved,
		warnings,
		defaults,
	};
}
