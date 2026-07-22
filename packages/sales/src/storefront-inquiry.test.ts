import { describe, expect, test } from "bun:test";
import {
	canTransitionStorefrontInquiry,
	storefrontCustomInquiryDraftSchema,
	storefrontInquiryReference,
} from "./storefront-inquiry";

describe("storefront custom inquiry", () => {
	test("validates a complete structured brief", () => {
		const parsed = storefrontCustomInquiryDraftSchema.parse({
			name: "Alex Customer",
			email: "ALEX@example.com",
			phone: "305-555-1212",
			website: "",
			brief: {
				projectTypes: ["CUSTOM_DOOR", "TRIM_MOULDING"],
				propertyType: "RESIDENTIAL",
				city: "Miami",
				state: "FL",
				postalCode: "33186",
				dimensions: "Opening is 36 x 80 inches.",
				styleAndMaterials: "Paint-grade wood with simple panels.",
				targetDate: null,
				timingFlexible: true,
				budget: "Not sure",
				fulfillmentNotes: null,
				description:
					"Replace an existing entry door and coordinate matching trim.",
				contactPreference: "EMAIL",
			},
		});

		expect(parsed.email).toBe("ALEX@example.com");
		expect(parsed.brief.projectTypes).toHaveLength(2);
	});

	test("rejects incomplete project descriptions", () => {
		const result = storefrontCustomInquiryDraftSchema.safeParse({
			name: "Alex Customer",
			email: "alex@example.com",
			brief: {
				projectTypes: ["CUSTOM_DOOR"],
				propertyType: "RESIDENTIAL",
				city: "Miami",
				state: "FL",
				postalCode: "33186",
				description: "Too short",
				contactPreference: "EMAIL",
			},
		});

		expect(result.success).toBe(false);
	});

	test("requires a phone number for phone-only follow-up", () => {
		const result = storefrontCustomInquiryDraftSchema.safeParse({
			name: "Alex Customer",
			email: "alex@example.com",
			phone: null,
			brief: {
				projectTypes: ["CUSTOM_DOOR"],
				propertyType: "RESIDENTIAL",
				city: "Miami",
				state: "FL",
				postalCode: "33186",
				description:
					"Replace an existing entry door with a matching custom unit.",
				contactPreference: "PHONE",
			},
		});

		expect(result.success).toBe(false);
	});

	test("enforces the inquiry workflow and deterministic references", () => {
		expect(canTransitionStorefrontInquiry("NEW", "IN_REVIEW")).toBe(true);
		expect(canTransitionStorefrontInquiry("NEW", "QUOTE_CREATED")).toBe(false);
		expect(canTransitionStorefrontInquiry("CLOSED", "IN_REVIEW")).toBe(true);
		expect(storefrontInquiryReference("cm1234567890", "CUSTOM_QUOTE")).toBe(
			"CMW-1234567890",
		);
	});
});
