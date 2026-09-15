import { AppError, classifyError } from "@gnd/errors";
import type { AssistantDiagnosticContext } from "./diagnostic-details";
import { captureAssistantDiagnostic } from "./diagnostics";
import { presentAssistantOutcome, type AssistantOutcome } from "./outcomes";
import { AssistantAttachmentInputError } from "./attachment-errors";

export class AssistantOperationError extends AppError {
	constructor(
		options: ConstructorParameters<typeof AppError>[0],
		readonly assistantOutcome: AssistantOutcome,
	) {
		super(options);
	}
}

export async function runAssistantOperation<T>(
	context: AssistantDiagnosticContext,
	execute: () => Promise<T>,
	options: {
		uncertainOnFailure?: boolean;
		fallbackOutcome?: "temporary" | "upload-failed";
		capture?: typeof captureAssistantDiagnostic;
		signal?: AbortSignal;
	} = {},
): Promise<T> {
	const startedAt = performance.now();
	try {
		return await execute();
	} catch (error) {
		if (options.signal?.aborted || error instanceof AssistantOperationError)
			throw error;
		const classified = (() => {
			try {
				return classifyError(error);
			} catch {
				return classifyError(new Error("Assistant operation failed"));
			}
		})();
		const kind: AssistantOutcome["kind"] =
			error instanceof AssistantAttachmentInputError ? error.outcomeKind : classified.category === "permission"
				? "denied"
				: classified.category === "authentication"
					? "signed-out"
					: classified.category === "validation"
						? "input"
						: classified.category === "conflict"
							? "conflict"
							: options.uncertainOnFailure
								? "uncertain"
								: options.fallbackOutcome ?? "temporary";
		const diagnostic = await (options.capture ?? captureAssistantDiagnostic)(
			error,
			{ ...context, durationMs: Math.max(0, Math.round(performance.now() - startedAt)), outcome: kind },
		);
		throw new AssistantOperationError(
			{
				code: classified.code,
				referenceId: diagnostic.reference,
				operation: context.operation,
				publicMessage: presentAssistantOutcome({ kind }).message,
				retryable: kind === "temporary",
				reportable: false,
			},
			{ kind, reference: diagnostic.reference },
		);
	}
}
