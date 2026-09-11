import type { NewSalesFormSeed } from "../contracts/new-sales-form-seed";
import { newSalesFormSeedSchema } from "../contracts/new-sales-form-seed";
import {
	buildSelectedByStepUid,
	buildSelectedProdUidsByStepUid,
	computeHptFlatRate,
	computeHptSharedDoorSurcharge,
	getRouteConfigForLine,
	isCustomSalesFormComponent,
	isServiceItem,
	normalizeHptLineForLegacy,
	readSalesFormObjectMetadata,
	resolveDoorTierPricing,
	seedRouteStep,
} from "../domain";
import { resolveRequestStepSelection } from "../request-generation/default-policy";
import { buildWorkflowLinePricingPatch } from "../ui/workflow/workflow-line-totals";
import {
	type WorkflowComponentRecord,
	type WorkflowRouteData,
	type WorkflowRouteStepRecord,
	type WorkflowStepRecord,
	isMultiSelectStepTitle,
} from "../ui/workflow/workflow-records";
import { buildWorkflowServiceRowsPatch } from "../ui/workflow/workflow-row-patches";
import {
	proceedWorkflowMultiSelectStep,
	saveWorkflowSelectedComponent,
} from "../ui/workflow/workflow-selection-actions";
import {
	resolveWorkflowCatalogComponents,
	resolveWorkflowSalesPrice,
} from "../ui/workflow/workflow-visible-components";
import {
	type SalesFormExtraCostRecord,
	type SalesFormLineItemRecord,
	type SalesFormMetaRecord,
	type SalesFormSummaryRecord,
	createEmptySalesFormLineItem,
	hydrateSalesFormRecord,
	normalizeSalesFormLineItem,
} from "./record-normalization";

export type NewSalesFormSeedInitializationIssue = {
	lineUid: string | null;
	stepId: number | null;
	reason:
		| "root-step-missing"
		| "root-selection-missing"
		| "route-missing"
		| "step-outside-route"
		| "step-disabled-by-redirect"
		| "selection-shape-invalid"
		| "component-missing"
		| "component-not-visible"
		| "component-price-missing"
		| "default-component-missing"
		| "default-component-not-visible"
		| "default-dependency-unresolved"
		| "custom-step-not-supported"
		| "custom-value-requires-review"
		| "service-rows-outside-service-route"
		| "service-price-missing"
		| "delivery-price-missing"
		| "hpt-door-selection-missing"
		| "hpt-door-selection-ambiguous"
		| "hpt-door-price-missing";
	componentUid?: string;
};

export type NewSalesFormSeedBaseRecord = {
	type?: string | null;
	salesId?: number | null;
	slug?: string | null;
	version?: string | null;
	form?: SalesFormMetaRecord | null;
	lineItems?: SalesFormLineItemRecord[];
	extraCosts?: SalesFormExtraCostRecord[];
	summary?: SalesFormSummaryRecord | null;
	settings?: { cccPercentage?: number | null } | null;
	[key: string]: unknown;
};

export type ResolveNewSalesFormSeedComponents = (input: {
	lineUid: string;
	step: WorkflowRouteStepRecord;
}) =>
	| readonly WorkflowComponentRecord[]
	| Promise<readonly WorkflowComponentRecord[]>;

export type InitializeNewSalesFormSeedInput<
	TRecord extends NewSalesFormSeedBaseRecord,
> = {
	seed: NewSalesFormSeed;
	baseRecord: TRecord;
	routeData: WorkflowRouteData;
	resolveComponents: ResolveNewSalesFormSeedComponents;
	defaultsByItemTypeUid?: Readonly<
		Record<string, Readonly<Record<string, string>>>
	>;
	pricing: {
		profileCoefficient: number;
		pricingView?: "internal" | "dealer";
		dealerSalesPercentage?: number | null;
		componentOverrides?: ReadonlyMap<string, Partial<WorkflowComponentRecord>>;
	};
};

export type InitializedNewSalesFormSeed<
	TRecord extends NewSalesFormSeedBaseRecord,
> = {
	record: TRecord & {
		lineItems: SalesFormLineItemRecord[];
		extraCosts: SalesFormExtraCostRecord[];
		summary: SalesFormSummaryRecord;
	};
	unresolved: NewSalesFormSeed["unresolved"];
	issues: NewSalesFormSeedInitializationIssue[];
};

function stepUid(step: WorkflowRouteStepRecord) {
	return String(step.uid || "").trim();
}

function stepId(step: WorkflowRouteStepRecord) {
	const value = Number(step.id);
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function rootStep(routeData: WorkflowRouteData) {
	const uid = String(routeData.rootStepUid || "").trim();
	if (uid) return routeData.stepsByUid?.[uid] || null;
	return (
		Object.values(routeData.stepsByUid || {}).find((step) =>
			Object.keys(routeData.composedRouter || {}).some((componentUid) =>
				Array.isArray((step as { components?: unknown[] })?.components)
					? (
							(step as { components: Array<{ uid?: string | null }> })
								.components || []
						).some((component) => component.uid === componentUid)
					: false,
			),
		) || null
	);
}

function componentStatus(
	components: WorkflowComponentRecord[],
	componentUid: string,
) {
	const component = components.find(
		(candidate) => String(candidate.uid || "") === componentUid,
	);
	if (!component) return { component: null, status: "missing" as const };
	if (component._metaData?.visible !== true)
		return { component, status: "hidden" as const };
	return { component, status: "visible" as const };
}

function comparableCustomValue(value: unknown) {
	return String(value || "")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase();
}

function stepSupportsCustom(step: WorkflowStepRecord) {
	return readSalesFormObjectMetadata(step.meta)?.custom === true;
}

/**
 * A generated custom value is preview-only until an authorized apply boundary
 * resolves or creates its canonical catalog component.
 */
function buildTransientCustomComponent(stepId: number, value: string) {
	return {
		id: null,
		uid: `custom-preview:${stepId}`,
		title: value,
		basePrice: 0,
		salesPrice: 0,
		custom: true,
		_metaData: {
			custom: true,
			visible: true,
			previewOnly: true,
		},
	} satisfies WorkflowComponentRecord;
}

function defaultBlocker(seed: NewSalesFormSeed, lineUid: string) {
	const blocksEveryDefault = seed.unresolved.some(
		(entry) =>
			entry.lineUid === null ||
			(entry.lineUid === lineUid && entry.stepId === null),
	);
	const blockedStepIds = new Set(
		seed.unresolved
			.filter((entry) => entry.lineUid === lineUid && entry.stepId != null)
			.map((entry) => entry.stepId as number),
	);
	return {
		blocksEveryDefault,
		blockedStepIds,
	};
}

function issue(
	issues: NewSalesFormSeedInitializationIssue[],
	lineUid: string | null,
	stepId: number | null,
	reason: NewSalesFormSeedInitializationIssue["reason"],
	componentUid?: string,
) {
	issues.push({
		lineUid,
		stepId,
		reason,
		...(componentUid ? { componentUid } : {}),
	});
}

function emptySeedLine(lineUid: string, qty: number, index: number) {
	return {
		...createEmptySalesFormLineItem(index),
		uid: lineUid,
		qty,
	};
}

function selectedComponentsForStep(step: { meta?: unknown }) {
	const selected = readSalesFormObjectMetadata(step.meta)?.selectedComponents;
	return Array.isArray(selected) ? (selected as WorkflowComponentRecord[]) : [];
}

function buildHptLine(
	line: SalesFormLineItemRecord,
	seedLine: NewSalesFormSeed["lineItems"][number],
	routeData: WorkflowRouteData,
	profileCoefficient: number,
	pricingView: "internal" | "dealer" | undefined,
	dealerSalesPercentage: number | null | undefined,
	issues: NewSalesFormSeedInitializationIssue[],
) {
	if (!seedLine.housePackageTool) return line;
	const doorStep = (line.formSteps || []).find(
		(step) =>
			String(step?.step?.title || "")
				.trim()
				.toLowerCase() === "door",
	);
	const selectedDoors = selectedComponentsForStep(doorStep || {});
	if (!selectedDoors.length) {
		issue(
			issues,
			seedLine.uid,
			Number(doorStep?.stepId) || null,
			"hpt-door-selection-missing",
		);
		return line;
	}
	if (selectedDoors.length !== 1) {
		issue(
			issues,
			seedLine.uid,
			Number(doorStep?.stepId) || null,
			"hpt-door-selection-ambiguous",
		);
		return line;
	}
	const component = selectedDoors[0];
	if (!component) return line;
	const routeConfig = getRouteConfigForLine({
		routeData,
		line,
		step: doorStep,
		component,
	});
	const noHandle = Boolean(routeConfig.noHandle);
	const hasSwing = routeConfig.hasSwing !== false;
	const supplierUid =
		typeof routeConfig.supplierUid === "string"
			? routeConfig.supplierUid
			: null;
	const doors = seedLine.housePackageTool.doors.map((door) => {
		const tier = resolveDoorTierPricing({
			pricing: component.pricing as Record<string, unknown> | null | undefined,
			size: door.dimension,
			supplierUid,
			supplierVariants: Array.isArray(component.supplierVariants)
				? component.supplierVariants
				: [],
			fallbackSalesPrice: component.salesPrice,
			fallbackBasePrice: component.basePrice,
		});
		const doorSalesUnitPrice = tier.hasPrice
			? resolveWorkflowSalesPrice({
					salesPrice: tier.salesPrice,
					basePrice: tier.basePrice,
					profileCoefficient,
					pricingView,
					dealerSalesPercentage,
				})
			: 0;
		if (!tier.hasPrice) {
			issue(
				issues,
				seedLine.uid,
				Number(doorStep?.stepId) || null,
				"hpt-door-price-missing",
				String(component.uid || ""),
			);
		}
		const totalQty = door.lhQty + door.rhQty;
		return {
			id: null,
			dimension: door.dimension,
			swing: door.swing,
			doorType: String(component.title || ""),
			doorPrice: 0,
			jambSizePrice: doorSalesUnitPrice,
			casingPrice: 0,
			unitPrice: 0,
			lhQty: door.lhQty,
			rhQty: door.rhQty,
			totalQty,
			lineTotal: 0,
			stepProductId: component.id ?? null,
			meta: {
				baseUnitPrice: tier.hasPrice ? tier.basePrice : 0,
				doorSalesUnitPrice,
				componentUid: component.uid || null,
				componentTitle: component.title || null,
				priceMissing: !tier.hasPrice,
			},
		};
	});
	const lineWithDoors = {
		...line,
		meta: {
			...(line.meta || {}),
			workflowDoorRouteConfig: { noHandle, hasSwing },
		},
		housePackageTool: {
			id: null,
			doors,
			totalDoors: 0,
			totalPrice: 0,
		},
	};
	return normalizeHptLineForLegacy(lineWithDoors, {
		sharedDoorSurcharge: computeHptSharedDoorSurcharge(lineWithDoors),
		flatRate: computeHptFlatRate(lineWithDoors),
		noHandle,
		hasSwing,
	}) as SalesFormLineItemRecord;
}

async function initializeLine(
	seed: NewSalesFormSeed,
	seedLine: NewSalesFormSeed["lineItems"][number],
	index: number,
	input: InitializeNewSalesFormSeedInput<NewSalesFormSeedBaseRecord>,
	issues: NewSalesFormSeedInitializationIssue[],
) {
	const root = rootStep(input.routeData);
	const rootId = root ? stepId(root) : null;
	if (!root || rootId == null) {
		issue(issues, seedLine.uid, null, "root-step-missing");
		return emptySeedLine(seedLine.uid, seedLine.qty, index);
	}
	const requestedRoot = seedLine.formSteps.find(
		(selection) => selection.stepId === rootId && "prodUid" in selection,
	);
	if (!requestedRoot || !("prodUid" in requestedRoot)) {
		issue(issues, seedLine.uid, rootId, "root-selection-missing");
		return emptySeedLine(seedLine.uid, seedLine.qty, index);
	}
	const route = input.routeData.composedRouter?.[requestedRoot.prodUid];
	if (!route) {
		issue(issues, seedLine.uid, rootId, "route-missing", requestedRoot.prodUid);
		return emptySeedLine(seedLine.uid, seedLine.qty, index);
	}

	let formSteps = [seedRouteStep(root)] as WorkflowStepRecord[];
	const rootComponents = resolveWorkflowCatalogComponents({
		components: [
			...(await input.resolveComponents({ lineUid: seedLine.uid, step: root })),
		],
		steps: formSteps,
		activeStep: formSteps[0] || null,
		overrides: new Map(input.pricing.componentOverrides || []),
		profileCoefficient: input.pricing.profileCoefficient,
		pricingView: input.pricing.pricingView,
		dealerSalesPercentage: input.pricing.dealerSalesPercentage,
	});
	const rootStatus = componentStatus(rootComponents, requestedRoot.prodUid);
	if (rootStatus.status !== "visible" || !rootStatus.component) {
		issue(
			issues,
			seedLine.uid,
			rootId,
			rootStatus.status === "hidden"
				? "component-not-visible"
				: "component-missing",
			requestedRoot.prodUid,
		);
		return emptySeedLine(seedLine.uid, seedLine.qty, index);
	}
	const rootMutation = saveWorkflowSelectedComponent({
		routeData: input.routeData,
		line: emptySeedLine(seedLine.uid, seedLine.qty, index),
		steps: formSteps,
		currentStepIndex: 0,
		component: rootStatus.component,
		visibleComponents: rootComponents,
		activeStepTitle: root.title,
		selectedOverride: true,
		profileCoefficient: input.pricing.profileCoefficient,
	});
	if (!rootMutation)
		throw new Error(
			"The workflow root selection mutation could not be applied",
		);
	formSteps = rootMutation.linePatch.formSteps;
	const resolvedStepUids = new Set([stepUid(root)]);
	const blockedDefaults = defaultBlocker(seed, seedLine.uid);
	const defaults = input.defaultsByItemTypeUid?.[requestedRoot.prodUid] || {};

	for (
		let currentStepIndex = 1;
		currentStepIndex < formSteps.length;
		currentStepIndex += 1
	) {
		const current = formSteps[currentStepIndex];
		const currentId = Number(current?.stepId);
		const currentStep = current?.step as WorkflowRouteStepRecord | undefined;
		if (!current || !currentStep || !Number.isSafeInteger(currentId)) continue;
		const requested = seedLine.formSteps.find(
			(selection) => selection.stepId === currentId,
		);
		if (readSalesFormObjectMetadata(current.meta)?.redirectDisabled === true) {
			if (requested) {
				issue(issues, seedLine.uid, currentId, "step-disabled-by-redirect");
			}
			continue;
		}
		const defaultUid =
			!requested &&
			!blockedDefaults.blocksEveryDefault &&
			!blockedDefaults.blockedStepIds.has(currentId)
				? defaults[stepUid(currentStep)]
				: undefined;
		if (!requested && !defaultUid) continue;
		const expectedMulti = isMultiSelectStepTitle(currentStep.title);
		if (
			requested &&
			!("value" in requested) &&
			expectedMulti !== "meta" in requested
		) {
			issue(issues, seedLine.uid, currentId, "selection-shape-invalid");
			continue;
		}
		if (requested && "value" in requested && !stepSupportsCustom(current)) {
			issue(issues, seedLine.uid, currentId, "custom-step-not-supported");
			continue;
		}
		const selectedUids = requested
			? "prodUid" in requested
				? [requested.prodUid]
				: "meta" in requested
					? requested.meta.selectedProdUids
					: []
			: [defaultUid as string];
		const catalog = resolveWorkflowCatalogComponents({
			components: [
				...(await input.resolveComponents({
					lineUid: seedLine.uid,
					step: currentStep,
				})),
			],
			steps: formSteps,
			activeStep: current,
			overrides: new Map(input.pricing.componentOverrides || []),
			profileCoefficient: input.pricing.profileCoefficient,
			pricingView: input.pricing.pricingView,
			dealerSalesPercentage: input.pricing.dealerSalesPercentage,
		});
		if (!requested && defaultUid) {
			const defaultSelection = resolveRequestStepSelection({
				stepUid: stepUid(currentStep),
				inputStatus: "omitted",
				requestedComponentUid: null,
				defaultComponentUid: defaultUid,
				candidates: catalog.map((component) => ({
					uid: String(component.uid || ""),
					variations: Array.isArray(component.variations)
						? component.variations
						: [],
					isDeleted: component.isDeleted,
				})),
				selectedByStepUid: buildSelectedByStepUid(formSteps),
				selectedProdUidsByStepUid: buildSelectedProdUidsByStepUid(formSteps),
				resolvedStepUids: [...resolvedStepUids],
			});
			if (defaultSelection.status === "unresolved") {
				issue(
					issues,
					seedLine.uid,
					currentId,
					defaultSelection.reason.startsWith("default-dependency-unresolved:")
						? "default-dependency-unresolved"
						: defaultSelection.reason === "default-component-not-visible"
							? "default-component-not-visible"
							: "default-component-missing",
					defaultUid,
				);
				continue;
			}
		}
		let valid = true;
		const selectedComponents: WorkflowComponentRecord[] = [];
		if (requested && "value" in requested) {
			const comparableValue = comparableCustomValue(requested.value);
			const exactStandard = catalog.find(
				(component) =>
					component._metaData?.visible === true &&
					!isCustomSalesFormComponent(component) &&
					comparableCustomValue(component.title) === comparableValue,
			);
			selectedComponents.push(
				exactStandard ||
					buildTransientCustomComponent(currentId, requested.value),
			);
			if (!exactStandard) {
				issue(issues, seedLine.uid, currentId, "custom-value-requires-review");
			}
		}
		for (const componentUid of selectedUids) {
			const status = componentStatus(catalog, componentUid);
			if (status.status !== "visible" || !status.component) {
				issue(
					issues,
					seedLine.uid,
					currentId,
					requested
						? status.status === "hidden"
							? "component-not-visible"
							: "component-missing"
						: status.status === "hidden"
							? "default-component-not-visible"
							: "default-component-missing",
					componentUid,
				);
				valid = false;
				continue;
			}
			selectedComponents.push(status.component);
			const isHptDoorStep =
				Boolean(seedLine.housePackageTool) &&
				String(currentStep.title || "")
					.trim()
					.toLowerCase() === "door";
			if (status.component._metaData?.priceMissing === true && !isHptDoorStep) {
				issue(
					issues,
					seedLine.uid,
					currentId,
					"component-price-missing",
					componentUid,
				);
			}
		}
		if (!valid) continue;
		const selectionCatalog = [
			...catalog,
			...selectedComponents.filter(
				(component) =>
					!catalog.some(
						(candidate) => String(candidate.uid) === String(component.uid),
					),
			),
		];
		if (expectedMulti) {
			for (const component of selectedComponents) {
				const mutation = saveWorkflowSelectedComponent({
					routeData: input.routeData,
					line: {
						...emptySeedLine(seedLine.uid, seedLine.qty, index),
						formSteps,
					},
					steps: formSteps,
					currentStepIndex,
					component,
					visibleComponents: selectionCatalog,
					selectedOverride: true,
					activeStepTitle: currentStep.title,
					profileCoefficient: input.pricing.profileCoefficient,
				});
				if (mutation) formSteps = mutation.linePatch.formSteps;
			}
			const routed = proceedWorkflowMultiSelectStep({
				routeData: input.routeData,
				line: {
					...emptySeedLine(seedLine.uid, seedLine.qty, index),
					formSteps,
				},
				stepIndex: currentStepIndex,
				visibleComponents: selectionCatalog,
			});
			if (routed) formSteps = routed.linePatch.formSteps;
		} else {
			const component = selectedComponents[0];
			if (component) {
				const mutation = saveWorkflowSelectedComponent({
					routeData: input.routeData,
					line: {
						...emptySeedLine(seedLine.uid, seedLine.qty, index),
						formSteps,
					},
					steps: formSteps,
					currentStepIndex,
					component,
					visibleComponents: selectionCatalog,
					activeStepTitle: currentStep.title,
					selectedOverride: true,
					profileCoefficient: input.pricing.profileCoefficient,
				});
				if (mutation) formSteps = mutation.linePatch.formSteps;
			}
		}
		resolvedStepUids.add(stepUid(currentStep));
	}
	const finalRouteStepIds = new Set(
		formSteps.map((step) => Number(step.stepId)).filter(Number.isSafeInteger),
	);
	for (const selection of seedLine.formSteps) {
		if (!finalRouteStepIds.has(selection.stepId)) {
			issue(issues, seedLine.uid, selection.stepId, "step-outside-route");
		}
	}

	let line: SalesFormLineItemRecord = {
		...emptySeedLine(seedLine.uid, seedLine.qty, index),
		title: String(rootStatus.component.title || ""),
		formSteps,
	};
	line = buildHptLine(
		line,
		seedLine,
		input.routeData,
		input.pricing.profileCoefficient,
		input.pricing.pricingView,
		input.pricing.dealerSalesPercentage,
		issues,
	);
	if (!line.housePackageTool?.doors?.length) {
		line = {
			...line,
			...buildWorkflowLinePricingPatch(line, formSteps),
		};
	}
	const serviceRows =
		"meta" in seedLine && seedLine.meta ? seedLine.meta.serviceRows : undefined;
	if (serviceRows?.length) {
		if (!isServiceItem(line)) {
			issue(issues, seedLine.uid, rootId, "service-rows-outside-service-route");
		} else {
			for (const _row of serviceRows) {
				issue(issues, seedLine.uid, rootId, "service-price-missing");
			}
			line = {
				...line,
				...buildWorkflowServiceRowsPatch({
					line,
					rows: serviceRows.map((row) => ({
						...row,
						taxxable: false,
						produceable: false,
						unitPrice: 0,
						lineTotal: 0,
					})),
				}),
			};
		}
	}
	return normalizeSalesFormLineItem(line, index);
}

/** Replays a portable seed through the same route, selection, pricing, and record algorithms as the editor. */
export async function initializeNewSalesFormSeed<
	TRecord extends NewSalesFormSeedBaseRecord,
>(
	input: InitializeNewSalesFormSeedInput<TRecord>,
): Promise<InitializedNewSalesFormSeed<TRecord>> {
	if (input.baseRecord.salesId != null)
		throw new Error("A new-sales-form seed cannot initialize a persisted sale");
	if (
		!Number.isFinite(input.pricing.profileCoefficient) ||
		input.pricing.profileCoefficient <= 0
	)
		throw new Error("A positive pricing profile coefficient is required");
	const seed = newSalesFormSeedSchema.parse(input.seed);
	const issues: NewSalesFormSeedInitializationIssue[] = [];
	const lineItems: SalesFormLineItemRecord[] = [];
	for (const [index, seedLine] of seed.lineItems.entries()) {
		lineItems.push(
			await initializeLine(
				seed,
				seedLine,
				index,
				input as InitializeNewSalesFormSeedInput<NewSalesFormSeedBaseRecord>,
				issues,
			),
		);
	}
	const seedForm = seed.schemaVersion === 2 ? seed.form : undefined;
	const seedDeliveryCost =
		seed.schemaVersion === 2 ? seed.extraCosts?.[0] : undefined;
	let extraCosts = [...(input.baseRecord.extraCosts || [])];
	if (seedForm?.deliveryOption === "pickup") {
		extraCosts = extraCosts.filter((cost) => cost.type !== "Delivery");
	}
	if (seedDeliveryCost) {
		extraCosts = [
			...extraCosts.filter((cost) => cost.type !== "Delivery"),
			{ ...seedDeliveryCost },
		];
	} else if (seedForm?.deliveryOption === "delivery") {
		extraCosts = [
			...extraCosts.filter((cost) => cost.type !== "Delivery"),
			{
				id: null,
				label: "Delivery",
				type: "Delivery",
				amount: 0,
				taxxable: false,
			},
		];
		issue(issues, null, null, "delivery-price-missing");
	}
	const record = hydrateSalesFormRecord({
		...input.baseRecord,
		salesId: null,
		form: seedForm
			? {
					...(input.baseRecord.form || {}),
					...seedForm,
				}
			: input.baseRecord.form,
		lineItems,
		extraCosts,
	}) as InitializedNewSalesFormSeed<TRecord>["record"];
	return {
		record,
		unresolved: seed.unresolved.map((entry) => ({ ...entry })),
		issues,
	};
}
