import { z } from "zod";
import { readSalesFormObjectMetadata } from "./sales-form/domain/metadata";
import { buildConfiguredRouteSteps } from "./sales-form/domain/route-engine";

export const storefrontPublicationStatusSchema = z.enum([
	"DRAFT",
	"PUBLISHED",
	"ARCHIVED",
]);

export const storefrontAvailabilitySchema = z
	.object({
		purchasable: z.boolean().default(true),
		mode: z
			.enum(["IN_STOCK", "MADE_TO_ORDER", "BACKORDER"])
			.default("MADE_TO_ORDER"),
		leadTimeMinDays: z
			.number()
			.int()
			.min(0)
			.max(3_650)
			.nullable()
			.default(null),
		leadTimeMaxDays: z
			.number()
			.int()
			.min(0)
			.max(3_650)
			.nullable()
			.default(null),
		message: z.string().trim().max(500).nullable().default(null),
	})
	.superRefine((value, ctx) => {
		if (
			value.leadTimeMinDays != null &&
			value.leadTimeMaxDays != null &&
			value.leadTimeMaxDays < value.leadTimeMinDays
		) {
			ctx.addIssue({
				code: "custom",
				message: "Maximum lead time must be at least the minimum lead time.",
				path: ["leadTimeMaxDays"],
			});
		}
	});

export function normalizeStorefrontAvailability(value: unknown) {
	const parsed = storefrontAvailabilitySchema.safeParse(value);
	return parsed.success ? parsed.data : storefrontAvailabilitySchema.parse({});
}

export const storefrontStepPolicySchema = z.object({
	stepUid: z.string().trim().min(1).max(191),
	title: z.string().trim().max(255).nullish(),
	helpText: z.string().trim().max(5_000).nullish(),
	visible: z.boolean().default(true),
	required: z.boolean().default(false),
	allowSkip: z.boolean().default(false),
	autoSelect: z.boolean().default(false),
	defaultComponentUid: z.string().trim().max(191).nullish(),
	sortOrder: z.number().int().min(0).max(10_000).default(0),
	metadata: z.record(z.string(), z.unknown()).nullish(),
});

export const storefrontOfferComponentPolicySchema = z.object({
	stepUid: z.string().trim().min(1).max(191),
	sourceComponentUid: z.string().trim().min(1).max(191),
	enabled: z.boolean().default(true),
	defaultSelected: z.boolean().default(false),
	sortOrder: z.number().int().min(0).max(10_000).default(0),
	metadata: z.record(z.string(), z.unknown()).nullish(),
});

export const storefrontComponentSchema = z.object({
	sourceStepUid: z.string().trim().min(1).max(191),
	sourceComponentUid: z.string().trim().min(1).max(191),
	availableOnStorefront: z.boolean().default(false),
	title: z.string().trim().max(255).nullish(),
	description: z.string().trim().max(20_000).nullish(),
	imageUrl: z.string().trim().max(4_000).nullish(),
	status: storefrontPublicationStatusSchema.default("DRAFT"),
	sortOrder: z.number().int().min(0).max(10_000).default(0),
	metadata: z.record(z.string(), z.unknown()).nullish(),
});

export const storefrontCategoryInputSchema = z.object({
	id: z.string().optional(),
	rootStepUid: z.string().trim().min(1).max(191),
	rootComponentUid: z.string().trim().min(1).max(191),
	listingStepUid: z.string().trim().max(191).nullish(),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(191)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	title: z.string().trim().min(1).max(255),
	description: z.string().trim().max(20_000).nullish(),
	imageUrl: z.string().trim().max(4_000).nullish(),
	seo: z.record(z.string(), z.unknown()).nullish(),
	status: storefrontPublicationStatusSchema.default("DRAFT"),
	sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const storefrontOfferInputSchema = z.object({
	id: z.string().optional(),
	categoryId: z.string().trim().min(1),
	sourceStepUid: z.string().trim().min(1).max(191),
	sourceComponentUid: z.string().trim().min(1).max(191),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(191)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	title: z.string().trim().min(1).max(255),
	description: z.string().trim().max(20_000).nullish(),
	imageUrl: z.string().trim().max(4_000).nullish(),
	seo: z.record(z.string(), z.unknown()).nullish(),
	availability: storefrontAvailabilitySchema.optional(),
	status: storefrontPublicationStatusSchema.default("DRAFT"),
	sortOrder: z.number().int().min(0).max(10_000).default(0),
	configurationVersion: z.number().int().positive().default(1),
	stepPolicies: z.array(storefrontStepPolicySchema).max(100).default([]),
	componentPolicies: z
		.array(storefrontOfferComponentPolicySchema)
		.max(2_000)
		.default([]),
});

export type StorefrontStepPolicy = z.infer<typeof storefrontStepPolicySchema>;
export type StorefrontOfferComponentPolicy = z.infer<
	typeof storefrontOfferComponentPolicySchema
>;
export type StorefrontComponent = z.infer<typeof storefrontComponentSchema>;
export type StorefrontOfferInput = z.infer<typeof storefrontOfferInputSchema>;
export type StorefrontCategoryInput = z.infer<
	typeof storefrontCategoryInputSchema
>;

export type StorefrontPolicyIssue = {
	code:
		| "MISSING_ROUTE"
		| "MISSING_STEP"
		| "HIDDEN_STEP_WITHOUT_DEFAULT"
		| "DEFAULT_NOT_AVAILABLE"
		| "NO_AVAILABLE_COMPONENTS";
	message: string;
	stepUid?: string;
	componentUid?: string;
};

type RouteComponent = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	redirectUid?: string | null;
	meta?: unknown;
};

type RouteStep = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	meta?: unknown;
	components?: RouteComponent[];
};

type StorefrontRouteData = {
	stepsByUid?: Record<string, RouteStep>;
	composedRouter?: Record<string, unknown>;
};

export type PublicStorefrontComponent = {
	id: number | null;
	uid: string;
	title: string;
	img: string | null;
	redirectUid: string | null;
	price?: number | null;
	basePrice?: number | null;
};

export type PublicStorefrontStep = {
	stepId: number | null;
	stepUid: string;
	title: string;
	helpText: string | null;
	visible: boolean;
	required: boolean;
	allowSkip: boolean;
	selectedComponentUid: string | null;
	role: "ROOT" | "IDENTITY" | "PRODUCT" | "OPTION";
	components: PublicStorefrontComponent[];
};

export type StorefrontDoorScheduleComponentCandidate = {
	stepProductId: number;
	componentUid: string;
	title: string;
	sizes: Array<{
		dimension: string;
		hasPrice: boolean;
		unitPrice: number;
		basePrice: number;
	}>;
};

export function projectStorefrontDoorScheduleComponents(
	components: StorefrontDoorScheduleComponentCandidate[],
) {
	return components.map((component) => ({
		stepProductId: component.stepProductId,
		componentUid: component.componentUid,
		title: component.title,
		sizes: component.sizes.flatMap((size) =>
			size.hasPrice
				? [
						{
							dimension: size.dimension,
							unitPrice: size.unitPrice,
							basePrice: size.basePrice,
						},
					]
				: [],
		),
	}));
}

function safeString(value: unknown) {
	return String(value ?? "").trim();
}

function storefrontOptionKey(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

export function deduplicateStorefrontOptions<
	T extends { uid: string; title: string },
>(components: T[]) {
	const seen = new Set<string>();
	return components.filter((component) => {
		const key = storefrontOptionKey(component.title) || component.uid;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function isStorefrontStepWaivedBySelection(
	step: { title: string },
	steps: Array<{
		stepUid: string;
		components: Array<{ uid: string; title: string }>;
	}>,
	selections: Record<string, string>,
) {
	const stepTitle = storefrontOptionKey(step.title);
	if (!stepTitle) return false;
	const selectedTitles = steps.flatMap((candidate) => {
		const selectedUid = selections[candidate.stepUid];
		const selected = candidate.components.find(
			(component) => component.uid === selectedUid,
		);
		return selected ? [storefrontOptionKey(selected.title)] : [];
	});
	return selectedTitles.some(
		(title) => title === `no ${stepTitle}` || title === `without ${stepTitle}`,
	);
}

function publicComponent(
	component: RouteComponent,
	overlay?: StorefrontComponent,
) {
	return {
		id: component.id ?? null,
		uid: safeString(component.uid),
		title:
			safeString(overlay?.title) ||
			safeString(component.title) ||
			"Untitled option",
		img: safeString(overlay?.imageUrl) || safeString(component.img) || null,
		redirectUid: safeString(component.redirectUid) || null,
	};
}

function storefrontProductIdentityUids(component?: RouteComponent) {
	const meta = readSalesFormObjectMetadata(component?.meta);
	const show = meta?.show;
	if (!show || typeof show !== "object" || Array.isArray(show)) return [];
	return Object.entries(show)
		.filter(([, enabled]) => enabled === true)
		.map(([uid]) => safeString(uid))
		.filter(Boolean);
}

/** Finds every root route explicitly allowed by the canonical product rules. */
export function resolveStorefrontProductTypes(input: {
	routeData: StorefrontRouteData;
	rootStepUid: string;
	fallbackRootComponentUid: string;
	offerSourceStepUid?: string | null;
	offerSourceComponentUid?: string | null;
	components?: StorefrontComponent[];
}) {
	const rootStep = input.routeData.stepsByUid?.[input.rootStepUid];
	const sourceStep =
		input.routeData.stepsByUid?.[safeString(input.offerSourceStepUid)];
	const sourceComponent = sourceStep?.components?.find(
		(component) =>
			safeString(component.uid) === safeString(input.offerSourceComponentUid),
	);
	const sourceMeta = readSalesFormObjectMetadata(sourceComponent?.meta);
	const candidateUids = new Set([safeString(input.fallbackRootComponentUid)]);
	const variations = Array.isArray(sourceMeta?.variations)
		? sourceMeta.variations
		: [];
	for (const variation of variations) {
		const rules = Array.isArray(variation?.rules) ? variation.rules : [];
		for (const rule of rules) {
			if (
				safeString(rule?.stepUid) !== input.rootStepUid ||
				safeString(rule?.operator).toLowerCase() !== "is"
			) {
				continue;
			}
			const componentUids = Array.isArray(rule?.componentsUid)
				? rule.componentsUid
				: [];
			for (const uid of componentUids) {
				const normalized = safeString(uid);
				if (normalized) candidateUids.add(normalized);
			}
		}
	}

	const overlays = new Map(
		(input.components || []).map((component) => [
			component.sourceComponentUid,
			component,
		]),
	);
	return deduplicateStorefrontOptions(
		(rootStep?.components || [])
			.filter((component) => candidateUids.has(safeString(component.uid)))
			.filter((component) =>
				Boolean(input.routeData.composedRouter?.[safeString(component.uid)]),
			)
			.filter((component) => {
				if (!input.components) return true;
				const overlay = overlays.get(safeString(component.uid));
				return (
					overlay?.availableOnStorefront === true &&
					overlay.status === "PUBLISHED"
				);
			})
			.map((component) =>
				publicComponent(component, overlays.get(safeString(component.uid))),
			),
	);
}

/**
 * Projects a canonical Dyke route into a restrictive public workflow. It does
 * not calculate compatibility or prices; those stay in the shared sales
 * engines. Invalid hidden defaults are surfaced as readiness issues instead of
 * silently changing the customer configuration.
 */
export function projectStorefrontOfferRoute(input: {
	routeData: StorefrontRouteData;
	rootStepUid: string;
	rootComponentUid: string;
	offerSourceStepUid?: string | null;
	offerSourceComponentUid?: string | null;
	rootComponentUids?: string[];
	stepPolicies: StorefrontStepPolicy[];
	componentPolicies: StorefrontOfferComponentPolicy[];
	components: StorefrontComponent[];
}) {
	const issues: StorefrontPolicyIssue[] = [];
	const rootStep = input.routeData?.stepsByUid?.[input.rootStepUid] as
		| RouteStep
		| undefined;
	const rootComponent = rootStep?.components?.find(
		(component) => safeString(component.uid) === input.rootComponentUid,
	);

	if (!rootStep || !rootComponent) {
		issues.push({
			code: "MISSING_ROUTE",
			message: "The storefront offer no longer resolves to its Dyke root.",
			stepUid: input.rootStepUid,
			componentUid: input.rootComponentUid,
		});
		return { ready: false, issues, steps: [] as PublicStorefrontStep[] };
	}

	const configured = buildConfiguredRouteSteps(
		input.routeData,
		rootStep,
		publicComponent(rootComponent),
	);
	const stepPolicies = new Map(
		input.stepPolicies.map((policy) => [policy.stepUid, policy]),
	);
	const offerSourceStepUid = safeString(input.offerSourceStepUid);
	const offerSourceComponentUid = safeString(input.offerSourceComponentUid);
	const identityUids = storefrontProductIdentityUids(
		input.routeData.stepsByUid?.[offerSourceStepUid]?.components?.find(
			(component) => safeString(component.uid) === offerSourceComponentUid,
		),
	);
	const identityUidByStep = new Map<string, string>();
	for (const configuredStep of configured) {
		const stepUid = safeString(configuredStep?.step?.uid);
		const identityUid = identityUids.find((uid) =>
			input.routeData.stepsByUid?.[stepUid]?.components?.some(
				(component) => safeString(component.uid) === uid,
			),
		);
		if (identityUid) identityUidByStep.set(stepUid, identityUid);
	}
	if (offerSourceStepUid && offerSourceComponentUid) {
		const configuredPolicy = stepPolicies.get(offerSourceStepUid);
		stepPolicies.set(offerSourceStepUid, {
			stepUid: offerSourceStepUid,
			title: configuredPolicy?.title ?? null,
			helpText: configuredPolicy?.helpText ?? null,
			visible: false,
			required: true,
			allowSkip: false,
			autoSelect: true,
			defaultComponentUid: offerSourceComponentUid,
			sortOrder: configuredPolicy?.sortOrder ?? 0,
			metadata: configuredPolicy?.metadata ?? null,
		});
	}
	for (const [stepUid, identityUid] of identityUidByStep) {
		const configuredPolicy = stepPolicies.get(stepUid);
		stepPolicies.set(stepUid, {
			stepUid,
			title: configuredPolicy?.title ?? null,
			helpText: configuredPolicy?.helpText ?? null,
			visible: false,
			required: true,
			allowSkip: false,
			autoSelect: true,
			defaultComponentUid: identityUid,
			sortOrder: configuredPolicy?.sortOrder ?? 0,
			metadata: configuredPolicy?.metadata ?? null,
		});
	}
	const componentOverlays = new Map(
		input.components.map((component) => [
			component.sourceComponentUid,
			component,
		]),
	);
	const offerPoliciesByStep = new Map<
		string,
		Map<string, StorefrontOfferComponentPolicy>
	>();
	for (const policy of input.componentPolicies) {
		const policies =
			offerPoliciesByStep.get(policy.stepUid) ??
			new Map<string, StorefrontOfferComponentPolicy>();
		policies.set(policy.sourceComponentUid, policy);
		offerPoliciesByStep.set(policy.stepUid, policies);
	}

	const steps = configured.map((configuredStep): PublicStorefrontStep => {
		const stepUid = safeString(configuredStep?.step?.uid);
		const sourceStep = input.routeData?.stepsByUid?.[stepUid] as
			| RouteStep
			| undefined;
		const policy = stepPolicies.get(stepUid);
		if (!sourceStep) {
			issues.push({
				code: "MISSING_STEP",
				message: "A configured storefront step no longer exists.",
				stepUid,
			});
		}

		const offerPolicies = offerPoliciesByStep.get(stepUid);
		const allowedRootUids = new Set(
			input.rootComponentUids || [input.rootComponentUid],
		);
		const sourceComponents = (sourceStep?.components ?? []).filter(
			(component) =>
				stepUid !== input.rootStepUid ||
				allowedRootUids.has(safeString(component.uid)),
		);
		const structuralStep = sourceComponents.length === 0;
		const available = sourceComponents
			.filter((component) => {
				if (stepUid === input.rootStepUid) return true;
				const uid = safeString(component.uid);
				const overlay = componentOverlays.get(uid);
				const offerPolicy = offerPolicies?.get(uid);
				return (
					overlay?.availableOnStorefront === true &&
					overlay.status === "PUBLISHED" &&
					offerPolicy?.enabled !== false
				);
			})
			.sort((a, b) => {
				const aUid = safeString(a.uid);
				const bUid = safeString(b.uid);
				return (
					(offerPolicies?.get(aUid)?.sortOrder ??
						componentOverlays.get(aUid)?.sortOrder ??
						0) -
					(offerPolicies?.get(bUid)?.sortOrder ??
						componentOverlays.get(bUid)?.sortOrder ??
						0)
				);
			})
			.map((component) =>
				publicComponent(
					component,
					componentOverlays.get(safeString(component.uid)),
				),
			);

		const defaultUid =
			safeString(policy?.defaultComponentUid) ||
			safeString(
				Array.from(offerPolicies?.values() ?? []).find(
					(candidate) => candidate.defaultSelected && candidate.enabled,
				)?.sourceComponentUid,
			) ||
			null;
		const visible = structuralStep ? false : (policy?.visible ?? true);
		const selectedComponentUid =
			defaultUid && available.some((component) => component.uid === defaultUid)
				? defaultUid
				: null;

		if (!structuralStep && !available.length && stepUid !== input.rootStepUid) {
			issues.push({
				code: "NO_AVAILABLE_COMPONENTS",
				message: "This step has no published storefront components.",
				stepUid,
			});
		}
		if (!structuralStep && !visible && !defaultUid) {
			issues.push({
				code: "HIDDEN_STEP_WITHOUT_DEFAULT",
				message: "A hidden storefront step requires a valid default.",
				stepUid,
			});
		}
		if (defaultUid && !selectedComponentUid) {
			issues.push({
				code: "DEFAULT_NOT_AVAILABLE",
				message: "The configured default is not published for this offer.",
				stepUid,
				componentUid: defaultUid,
			});
		}

		const stepMeta = readSalesFormObjectMetadata(sourceStep?.meta);
		return {
			stepId: sourceStep?.id ?? null,
			stepUid,
			title:
				safeString(policy?.title) ||
				safeString(sourceStep?.title) ||
				"Choose an option",
			helpText:
				safeString(policy?.helpText) ||
				safeString(stepMeta?.description) ||
				null,
			visible,
			required: policy?.required ?? !policy?.allowSkip,
			allowSkip: policy?.allowSkip ?? false,
			role:
				stepUid === input.rootStepUid
					? "ROOT"
					: stepUid === offerSourceStepUid
						? "PRODUCT"
						: identityUidByStep.has(stepUid)
							? "IDENTITY"
							: "OPTION",
			selectedComponentUid:
				stepUid === input.rootStepUid
					? input.rootComponentUid
					: selectedComponentUid,
			components: available,
		};
	});

	return {
		ready: issues.length === 0,
		issues,
		steps: steps.sort((a, b) => {
			const aOrder = stepPolicies.get(a.stepUid)?.sortOrder ?? 0;
			const bOrder = stepPolicies.get(b.stepUid)?.sortOrder ?? 0;
			return aOrder - bOrder;
		}),
	};
}
