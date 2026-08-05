export { AppError, type AppErrorOptions } from "./app-error";
export { classifyError } from "./classify";
export { ERROR_DESCRIPTORS } from "./descriptors";
export {
	getPublicError,
	getPublicErrorHttpStatus,
	getUserErrorMessage,
	toPublicError,
} from "./public-error";
export { createErrorReference } from "./reference";
export { getErrorPresentation } from "./presentation";
export type {
	ErrorAction,
	ErrorCategory,
	ErrorClassificationOptions,
	ErrorCode,
	ErrorDescriptor,
	ErrorSeverity,
	ErrorTransportCode,
	PublicError,
} from "./types";
