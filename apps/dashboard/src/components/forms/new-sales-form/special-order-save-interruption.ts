export type SpecialOrderEnrollmentAccessState =
	| { status: "pending" }
	| { status: "error" }
	| { status: "ready"; canEnroll: boolean };

export type SpecialOrderSaveInterruption =
	| "CONTINUE"
	| "CUSTOMER_EMAIL_REQUIRED"
	| "DECLARATION_REQUIRED"
	| "ENROLLMENT_ACCESS_PENDING"
	| "ENROLLMENT_ACCESS_ERROR";

export function resolveSpecialOrderSaveInterruption(input: {
	type: "order" | "quote";
	intent: "draft" | "close" | "new" | "final";
	declaration?: "NO" | "YES" | null;
	hasCustomerEmail: boolean;
	enrollmentAccess: SpecialOrderEnrollmentAccessState;
}): SpecialOrderSaveInterruption {
	if (input.type !== "order") return "CONTINUE";
	if (input.declaration === "YES") {
		return input.hasCustomerEmail ? "CONTINUE" : "CUSTOMER_EMAIL_REQUIRED";
	}
	if (input.declaration === "NO" || input.intent === "draft") {
		return "CONTINUE";
	}
	if (input.enrollmentAccess.status === "pending") {
		return "ENROLLMENT_ACCESS_PENDING";
	}
	if (input.enrollmentAccess.status === "error") {
		return "ENROLLMENT_ACCESS_ERROR";
	}
	return input.enrollmentAccess.canEnroll ? "DECLARATION_REQUIRED" : "CONTINUE";
}
