import { z } from "zod";

const optionalAmount = z.number().min(0).max(10_000_000).nullable();
const optionalWeight = z.number().positive().max(1_000_000).nullable();

export const storefrontAddressAutocompleteSchema = z.object({
	query: z.string().trim().min(3).max(191),
	sessionToken: z.string().uuid(),
});

export const storefrontPlaceDetailsSchema = z.object({
	placeId: z.string().trim().min(1).max(191),
	sessionToken: z.string().uuid(),
});

export const storefrontShippingDestinationSchema = z.object({
	placeId: z.string().trim().min(1).max(191),
	formattedAddress: z.string().trim().min(3).max(500),
	sessionToken: z.string().uuid().optional(),
});

export const storefrontShippingPreviewSchema = z.object({
	cartVersion: z.number().int().positive(),
	destination: storefrontShippingDestinationSchema,
});

const doorWeightProfileSchema = z.object({
	dimension: z.string().trim().min(1).max(100),
	componentUid: z.string().trim().min(1).max(191).nullable().optional(),
	weightLb: z.number().positive().max(100_000),
	handlingFeePerUnit: z.number().min(0).max(1_000_000).default(0),
});

const mouldingWeightProfileSchema = z.object({
	categoryId: z.string().trim().min(1).max(191).nullable().optional(),
	componentUid: z.string().trim().min(1).max(191).nullable().optional(),
	lbPerLinearFoot: z.number().positive().max(10_000),
});

const shelfCategoryWeightSchema = z.object({
	categoryId: z.union([
		z.number().int().positive(),
		z.string().trim().min(1).max(191),
	]),
	weightPerUnitLb: z.number().positive().max(100_000),
});

const productWeightOverrideSchema = z.object({
	key: z.string().trim().min(1).max(191),
	weightLb: z.number().positive().max(100_000).nullable().optional(),
	lbPerLinearFoot: z.number().positive().max(10_000).nullable().optional(),
	handlingFeePerUnit: z.number().min(0).max(1_000_000).default(0),
});

export const storefrontShippingPolicyInputSchema = z.object({
	enabled: z.boolean(),
	approvalMode: z.enum(["OFFICE_REVIEW", "AUTO_WHEN_CONFIDENT"]),
	originPlaceId: z.string().trim().min(1).max(191).nullable(),
	originFormattedAddress: z.string().trim().min(1).max(500).nullable(),
	baseDispatchFee: z.number().min(0).max(1_000_000),
	baseVehicleRatePerMile: z.number().min(0).max(100_000),
	roundTripMultiplier: z.number().min(1).max(10),
	includedWeightLb: z.number().min(0).max(1_000_000),
	weightUnitLb: z.number().positive().max(1_000_000),
	weightDistanceRate: z.number().min(0).max(100_000),
	packagingMultiplier: z.number().min(1).max(10),
	weightRoundingIncrementLb: z.number().positive().max(100_000),
	minimumCharge: z.number().min(0).max(1_000_000),
	maximumCharge: optionalAmount,
	maxDistanceMiles: optionalWeight,
	maxWeightLb: optionalWeight,
	freeDeliveryThreshold: optionalAmount,
	autoApprovalMaxDistanceMiles: optionalWeight,
	autoApprovalMaxWeightLb: optionalWeight,
	autoApprovalMaxAmount: optionalAmount,
	allowGlobalFallbackForAutoApproval: z.boolean(),
	globalDoorWeightLb: optionalWeight,
	globalMouldingLbPerLinearFoot: optionalWeight,
	globalShelfWeightPerUnitLb: optionalWeight,
	doorWeightProfiles: z.array(doorWeightProfileSchema).max(1_000),
	mouldingWeightProfiles: z.array(mouldingWeightProfileSchema).max(1_000),
	shelfCategoryWeights: z.array(shelfCategoryWeightSchema).max(5_000),
	productWeightOverrides: z.array(productWeightOverrideSchema).max(10_000),
});

export const storefrontShippingReviewSchema = z.object({
	quoteId: z.string().trim().min(1),
	finalAmount: z.number().min(0).max(10_000_000),
	reviewNote: z.string().trim().max(5_000).nullable().optional(),
});

export type StorefrontShippingPolicyInput = z.infer<
	typeof storefrontShippingPolicyInputSchema
>;
