export type ErrorCategory =
	| "authentication"
	| "conflict"
	| "database"
	| "network"
	| "not_found"
	| "permission"
	| "provider"
	| "rate_limit"
	| "unexpected"
	| "validation";

export type ErrorCode =
	| "AUTHENTICATION_REQUIRED"
	| "CONFLICT"
	| "DATABASE_CONSTRAINT"
	| "DATABASE_POOL_TIMEOUT"
	| "DATABASE_TRANSACTION_TIMEOUT"
	| "DATABASE_WRITE_CONFLICT"
	| "NETWORK_UNAVAILABLE"
	| "NOT_FOUND"
	| "PERMISSION_DENIED"
	| "PROVIDER_UNAVAILABLE"
	| "RATE_LIMITED"
	| "SPECIAL_ORDER_APPROVAL_REQUIRED"
	| "UNEXPECTED"
	| "VALIDATION_FAILED";

export type ErrorSeverity = "info" | "warning" | "error" | "fatal";

export type ErrorAction = "contact_support" | "refresh" | "retry" | "sign_in";

export type ErrorTransportCode =
	| "BAD_REQUEST"
	| "CONFLICT"
	| "FORBIDDEN"
	| "INTERNAL_SERVER_ERROR"
	| "NOT_FOUND"
	| "PRECONDITION_FAILED"
	| "TOO_MANY_REQUESTS"
	| "UNAUTHORIZED";

export type PublicError = {
	action?: ErrorAction;
	code: ErrorCode;
	message: string;
	referenceId: string;
	retryable: boolean;
};

export type ErrorDescriptor = {
	action?: ErrorAction;
	category: ErrorCategory;
	code: ErrorCode;
	publicMessage: string;
	reportable: boolean;
	retryable: boolean;
	severity: ErrorSeverity;
	title: string;
	transportCode: ErrorTransportCode;
};

export type ErrorClassificationOptions = {
	operation?: string;
	publicMessage?: string;
	referenceId?: string;
};
