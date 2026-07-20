import { z } from "zod";
import {
	buildConfiguredRouteSteps,
	readSalesFormObjectMetadata,
} from "./sales-form";

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
};

type RouteStep = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	meta?: unknown;
	components?: RouteComponent[];
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
	components: Array<{
		id: number | null;
		uid: string;
		title: string;
		img: string | null;
		redirectUid: string | null;
	}>;
};

function safeString(value: unknown) {
	return String(value ?? "").trim();
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

/**
 * Projects a canonical Dyke route into a restrictive public workflow. It does
 * not calculate compatibility or prices; those stay in the shared sales
 * engines. Invalid hidden defaults are surfaced as readiness issues instead of
 * silently changing the customer configuration.
 */
export function projectStorefrontOfferRoute(input: {
	routeData: any;
	rootStepUid: string;
	rootComponentUid: string;
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
		const available = (sourceStep?.components ?? [])
			.filter((component) => {
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
		const visible = policy?.visible ?? true;
		const selectedComponentUid =
			defaultUid && available.some((component) => component.uid === defaultUid)
				? defaultUid
				: null;

		if (!available.length && stepUid !== input.rootStepUid) {
			issues.push({
				code: "NO_AVAILABLE_COMPONENTS",
				message: "This step has no published storefront components.",
				stepUid,
			});
		}
		if (!visible && !defaultUid) {
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
			selectedComponentUid:
				stepUid === input.rootStepUid
					? input.rootComponentUid
					: selectedComponentUid,
			components:
				stepUid === input.rootStepUid
					? [publicComponent(rootComponent)]
					: available,
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
