import { ERROR_DESCRIPTORS } from "./descriptors";
import { createErrorReference } from "./reference";
import type {
	ErrorAction,
	ErrorCategory,
	ErrorCode,
	ErrorSeverity,
	ErrorTransportCode,
} from "./types";

export type AppErrorOptions = {
	action?: ErrorAction;
	cause?: unknown;
	code: ErrorCode;
	internalMessage?: string;
	operation?: string;
	publicMessage?: string;
	referenceId?: string;
	reportable?: boolean;
	retryable?: boolean;
	severity?: ErrorSeverity;
	transportCode?: ErrorTransportCode;
};

export class AppError extends Error {
	readonly action?: ErrorAction;
	readonly category: ErrorCategory;
	readonly code: ErrorCode;
	readonly operation?: string;
	readonly publicMessage: string;
	readonly referenceId: string;
	readonly reportable: boolean;
	readonly retryable: boolean;
	readonly severity: ErrorSeverity;
	readonly transportCode: ErrorTransportCode;

	constructor(options: AppErrorOptions) {
		const descriptor = ERROR_DESCRIPTORS[options.code];
		super(
			options.internalMessage ??
				options.publicMessage ??
				descriptor.publicMessage,
			{
				cause: options.cause,
			},
		);
		this.name = "AppError";
		this.action = options.action ?? descriptor.action;
		this.category = descriptor.category;
		this.code = options.code;
		this.operation = options.operation;
		this.publicMessage = options.publicMessage ?? descriptor.publicMessage;
		this.referenceId = options.referenceId ?? createErrorReference();
		this.reportable = options.reportable ?? descriptor.reportable;
		this.retryable = options.retryable ?? descriptor.retryable;
		this.severity = options.severity ?? descriptor.severity;
		this.transportCode = options.transportCode ?? descriptor.transportCode;
	}
}
