import type { RouterOutputs } from "@api/trpc/routers/_app";
import { getPublicError } from "@gnd/errors";

export type SalesRequestGeneratePreviewOutput =
	RouterOutputs["salesRequest"]["generatePreview"] & {
		userReviewed?: true;
		/** Exact source copied into form metadata on Apply; never part of the provider seed or save claim. */
		sourceText?: string;
		clarification?: SalesRequestClarification | null;
	};

export type SalesRequestClarification = {
 sessionId: string;
 revision: number;
 round: number;
 questions: Array<{ id: string; lineUid: string | null; field: string; question: string; sourceText: string | null; reason: string }>;
};
export type SalesRequestClarificationAnswer = { questionId: string; answer: string; reuse: boolean };
export type SalesRequestClarificationSubmission = { sessionId: string; revision: number; answers: SalesRequestClarificationAnswer[]; signal?: AbortSignal };

export type SalesRequestGeneratePreviewVariables = {
	text: string;
	signal?: AbortSignal;
};

export type SalesRequestGenerationRevisionInput = {
	formRevision?: string | number | null;
	configurationRevision?: string | null;
};

export type SalesRequestGenerationRevision = {
	formRevision: string | null;
	configurationRevision: string | null;
};

export type SalesRequestGenerationFailureCode =
	| "disabled"
	| "permission"
	| "credential"
	| "usage-limit"
	| "timeout"
	| "invalid-output"
	| "configuration-changed"
	| "configuration-required"
	| "cancelled"
	| "unknown";

export type SalesRequestGenerationFailure = {
	code: SalesRequestGenerationFailureCode;
	message: string;
	retryable: boolean;
	referenceId: string;
};

export type SalesRequestGenerationStatus =
	| "idle"
	| "pending"
	| "success"
	| "error"
	| "cancelled";

export type SalesRequestGenerationSnapshot = {
	sourceText: string;
	status: SalesRequestGenerationStatus;
	requestId: number | null;
	capturedRevision: SalesRequestGenerationRevision | null;
	result: SalesRequestGeneratePreviewOutput | null;
	failure: SalesRequestGenerationFailure | null;
	isStale: boolean;
	canRetry: boolean;
	clarification: SalesRequestClarification | null;
	clarificationHistory: Array<{ round: number; answers: Array<{ question: string; answer: string; reuse: boolean }> }>;
};

type GeneratePreview = (
	input: SalesRequestGeneratePreviewVariables,
) => Promise<SalesRequestGeneratePreviewOutput>;

type Listener = () => void;

const FAILURE_DEFINITIONS: Record<
	SalesRequestGenerationFailureCode,
	Pick<SalesRequestGenerationFailure, "message" | "retryable">
> = {
	disabled: {
		message: "Request generation is currently disabled.",
		retryable: false,
	},
	permission: {
		message: "You do not have permission to generate a request preview.",
		retryable: false,
	},
	credential: {
		message:
			"Configure an approved sales request provider before generating a preview.",
		retryable: false,
	},
	"usage-limit": {
		message:
			"Request generation is temporarily unavailable because the usage limit was reached.",
		retryable: true,
	},
	timeout: {
		message: "Request generation took too long. Try again.",
		retryable: true,
	},
	"invalid-output": {
		message:
			"The generated preview could not be validated. Review the request and try again.",
		retryable: true,
	},
	"configuration-changed": {
		message:
			"The form or sales configuration changed. Generate the preview again.",
		retryable: true,
	},
	"configuration-required": {
		message: "Request AI settings need review before generation. Check the provider approval in Sales Settings.",
		retryable: false,
	},
	cancelled: {
		message: "Request generation was cancelled.",
		retryable: false,
	},
	unknown: {
		message: "We could not generate a request preview. Try again.",
		retryable: true,
	},
};

function normalizeRevision(
	value: string | number | null | undefined,
): string | null {
	return value === null || value === undefined ? null : String(value);
}

export function normalizeSalesRequestGenerationRevision(
	revision: SalesRequestGenerationRevisionInput,
): SalesRequestGenerationRevision {
	return {
		formRevision: normalizeRevision(revision.formRevision),
		configurationRevision: normalizeRevision(revision.configurationRevision),
	};
}

function revisionsEqual(
	left: SalesRequestGenerationRevision,
	right: SalesRequestGenerationRevision,
) {
	return (
		left.formRevision === right.formRevision &&
		left.configurationRevision === right.configurationRevision
	);
}

function readRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: null;
}

function readString(value: unknown) {
	return typeof value === "string" ? value : "";
}

function readTransportCode(error: unknown) {
	const record = readRecord(error);
	const data = readRecord(record?.data);
	const shape = readRecord(record?.shape);
	const shapeData = readRecord(shape?.data);
	const appError =
		readRecord(data?.appError) ?? readRecord(shapeData?.appError);
	return readString(
		data?.code ?? shapeData?.code ?? appError?.code ?? record?.code,
	);
}

function readErrorMessage(error: unknown) {
	const record = readRecord(error);
	const data = readRecord(record?.data);
	const shape = readRecord(record?.shape);
	const shapeData = readRecord(shape?.data);
	const appError =
		readRecord(data?.appError) ?? readRecord(shapeData?.appError);
	if (appError?.message) return readString(appError.message);
	if (data?.message) return readString(data.message);
	if (shapeData?.message) return readString(shapeData.message);
	if (record?.message) return readString(record.message);
	return error instanceof Error ? error.message : "";
}

function isAbortLikeError(error: unknown) {
	const record = readRecord(error);
	const name = readString(record?.name).toLowerCase();
	const message = readErrorMessage(error).toLowerCase();
	return (
		name === "aborterror" ||
		message.includes("abort") ||
		message.includes("cancel")
	);
}

function failureFor(
	code: SalesRequestGenerationFailureCode,
	referenceId = "",
): SalesRequestGenerationFailure {
	return { code, referenceId, ...FAILURE_DEFINITIONS[code] };
}

export function mapSalesRequestGenerationError(
	error: unknown,
): SalesRequestGenerationFailure {
	const publicError = getPublicError(error, {
		operation: "sales-request.generate-preview",
	});
	const transportCode = readTransportCode(error);
	const message = readErrorMessage(error).toLowerCase();
	const code = publicError.code;

	if (
		message.includes("not enabled") ||
		message.includes("generation is disabled")
	) {
		return failureFor("disabled", publicError.referenceId);
	}
	if (transportCode === "FORBIDDEN" || code === "PERMISSION_DENIED") {
		return failureFor("permission", publicError.referenceId);
	}
	if (
		code === "PROVIDER_UNAVAILABLE" ||
		message.includes("api key") ||
		message.includes("credential") ||
		message.includes("configure the")
	) {
		return failureFor("credential", publicError.referenceId);
	}
	if (
		transportCode === "TOO_MANY_REQUESTS" ||
		code === "RATE_LIMITED" ||
		message.includes("usage limit") ||
		message.includes("usage checks") ||
		message.includes("too many requests")
	) {
		return failureFor("usage-limit", publicError.referenceId);
	}
	if (
		message.includes("configuration changed") ||
		message.includes("generate the preview again") ||
		message.includes("changed during generation")
	) {
		return failureFor("configuration-changed", publicError.referenceId);
	}
	if (isAbortLikeError(error)) {
		return failureFor("cancelled", publicError.referenceId);
	}
	if (
		readString(readRecord(error)?.name).toLowerCase() === "timeouterror" ||
		message.includes("timed out") ||
		message.includes("timeout") ||
		message.includes("took too long")
	) {
		return failureFor("timeout", publicError.referenceId);
	}
	if (
		transportCode === "PRECONDITION_FAILED" ||
		message.includes("benchmark approval") ||
		message.includes("pilot authority")
	) {
		return failureFor("configuration-required", publicError.referenceId);
	}
	if (
		code === "VALIDATION_FAILED" ||
		message.includes("seed format") ||
		message.includes("structured output") ||
		message.includes("could not be validated")
	) {
		return failureFor("invalid-output", publicError.referenceId);
	}

	return failureFor("unknown", publicError.referenceId);
}

function isResultStale(
	snapshot: SalesRequestGenerationSnapshot,
	currentRevision: SalesRequestGenerationRevision,
) {
	if (!snapshot.result || !snapshot.capturedRevision) return false;
	if (!revisionsEqual(snapshot.capturedRevision, currentRevision)) return true;
	if (currentRevision.configurationRevision === null) return false;
	return (
		normalizeRevision(snapshot.result.configurationRevision) !==
		currentRevision.configurationRevision
	);
}

export function createSalesRequestGenerationController(
	generatePreview: GeneratePreview,
	initialRevision: SalesRequestGenerationRevisionInput,
 clarificationActions?: {
  answer: (input: SalesRequestClarificationSubmission) => Promise<SalesRequestGeneratePreviewOutput>;
  cancel: (sessionId: string) => Promise<unknown>;
 },
) {
	let currentRevision =
		normalizeSalesRequestGenerationRevision(initialRevision);
	let nextRequestId = 0;
	let disposed = false;
	let activeRequest: {
		id: number;
		text: string;
		revision: SalesRequestGenerationRevision;
		abortController: AbortController;
		promise: Promise<SalesRequestGeneratePreviewOutput | null>;
	} | null = null;
	const listeners = new Set<Listener>();

	let snapshot: SalesRequestGenerationSnapshot = {
		sourceText: "",
		status: "idle",
		requestId: null,
		capturedRevision: null,
		result: null,
		failure: null,
		isStale: false,
		canRetry: false,
		clarification: null,
		clarificationHistory: [],
	};

	function emit() {
		if (disposed) return;
		for (const listener of listeners) listener();
	}

	function setSnapshot(next: SalesRequestGenerationSnapshot) {
		snapshot = next;
		emit();
	}

	function abortActiveRequest() {
		activeRequest?.abortController.abort();
		activeRequest = null;
	}

	function setRevision(revision: SalesRequestGenerationRevisionInput) {
		const normalizedRevision =
			normalizeSalesRequestGenerationRevision(revision);
		const nextRevision = {
			...normalizedRevision,
			configurationRevision:
				normalizedRevision.configurationRevision ??
				currentRevision.configurationRevision,
		};
		if (revisionsEqual(nextRevision, currentRevision)) return;
		currentRevision = nextRevision;

		if (
			activeRequest &&
			!revisionsEqual(activeRequest.revision, nextRevision)
		) {
			abortActiveRequest();
			setSnapshot({
				...snapshot,
				status: "error",
				failure: failureFor("configuration-changed"),
				isStale: true,
				canRetry: Boolean(snapshot.sourceText.trim()),
			});
			return;
		}

		setSnapshot({
			...snapshot,
			isStale: isResultStale(snapshot, currentRevision),
		});
	}

	function setSourceText(sourceText: string) {
		const isChanged = sourceText !== snapshot.sourceText;
		if (!isChanged) return;
		setSnapshot({
			...snapshot,
			sourceText,
			isStale: snapshot.status === "success" || snapshot.clarification ? true : snapshot.isStale,
			canRetry: snapshot.status !== "pending" && Boolean(sourceText.trim()),
		});
	}

	function generate(sourceText = snapshot.sourceText, answers?: SalesRequestClarificationAnswer[]) {
		const clarification = answers ? snapshot.clarification : null;
		if (answers && (!clarification || !clarificationActions || snapshot.isStale)) return Promise.resolve(null);
		if (disposed || !sourceText.trim()) return Promise.resolve(null);
		if (
			activeRequest &&
			activeRequest.text === sourceText &&
			revisionsEqual(activeRequest.revision, currentRevision)
		) {
			return activeRequest.promise;
		}

		abortActiveRequest();
        if (!answers && snapshot.clarification) void clarificationActions?.cancel(snapshot.clarification.sessionId).catch(() => undefined);
		const id = ++nextRequestId;
		const revision = currentRevision;
		const abortController = new AbortController();
		setSnapshot({
            ...snapshot,
            clarification: clarification ?? null,
            clarificationHistory: answers ? snapshot.clarificationHistory : [],
			sourceText,
			status: "pending",
			requestId: id,
			capturedRevision: revision,
			result: null,
			failure: null,
			isStale: false,
			canRetry: false,
		});

		const promise = (clarification && answers && clarificationActions
            ? clarificationActions.answer({sessionId: clarification.sessionId, revision: clarification.revision, answers, signal: abortController.signal})
            : generatePreview({ text: sourceText, signal: abortController.signal }))
			.then((providerResult) => {
				const result = { ...providerResult, sourceText };
				if (
					disposed ||
					!activeRequest ||
					activeRequest.id !== id ||
					abortController.signal.aborted
				) {
					return null;
				}
				activeRequest = null;
				const resultConfigurationRevision = normalizeRevision(
					result.configurationRevision,
				);
				const formRevisionChanged =
					revision.formRevision !== currentRevision.formRevision;
				const knownConfigurationRevisionChanged =
					currentRevision.configurationRevision !== null &&
					revision.configurationRevision !==
						currentRevision.configurationRevision;
				const isStale =
					formRevisionChanged || knownConfigurationRevisionChanged;
				if (!isStale && currentRevision.configurationRevision === null) {
					currentRevision = {
						...currentRevision,
						configurationRevision: resultConfigurationRevision,
					};
				}
				const completedRevision = {
					...revision,
					configurationRevision:
						currentRevision.configurationRevision ??
						resultConfigurationRevision,
				};
				setSnapshot({
					...snapshot,
					status: "success",
					requestId: id,
					capturedRevision: completedRevision,
					result,
                    clarification: result.clarification ?? null,
                    clarificationHistory: clarification && answers ? [...snapshot.clarificationHistory, {round: clarification.round, answers: clarification.questions.map(question => ({question: question.question, answer: answers.find(answer => answer.questionId === question.id)?.answer ?? "", reuse: answers.find(answer => answer.questionId === question.id)?.reuse ?? true}))}] : snapshot.clarificationHistory,
					failure: null,
					isStale:
						isStale ||
						(currentRevision.configurationRevision !== null &&
							resultConfigurationRevision !==
								currentRevision.configurationRevision),
					canRetry: true,
				});
				return result;
			})
			.catch((error: unknown) => {
				if (disposed || !activeRequest || activeRequest.id !== id) {
					return null;
				}
				activeRequest = null;
				if (abortController.signal.aborted || isAbortLikeError(error)) {
					setSnapshot({
						...snapshot,
						status: "cancelled",
						failure: null,
						canRetry: true,
					});
					return null;
				}
				const failure = mapSalesRequestGenerationError(error);
				setSnapshot({
					...snapshot,
					status: "error",
					failure,
					canRetry: failure.retryable,
				});
				return null;
			});

		activeRequest = {
			id,
			text: sourceText,
			revision,
			abortController,
			promise,
		};
		return promise;
	}

	function cancel() {
		if (!activeRequest) return;
		abortActiveRequest();
		setSnapshot({
			...snapshot,
			status: "cancelled",
			result: null,
			failure: null,
			isStale: false,
			canRetry: Boolean(snapshot.sourceText.trim()),
		});
	}

	function retry() {
		return generate(snapshot.sourceText);
	}

	function clear() {
		if (disposed) return;
        if (snapshot.clarification) void clarificationActions?.cancel(snapshot.clarification.sessionId).catch(() => undefined);
		abortActiveRequest();
		setSnapshot({
			sourceText: "",
            clarification: null,
            clarificationHistory: [],
			status: "idle",
			requestId: null,
			capturedRevision: null,
			result: null,
			failure: null,
			isStale: false,
			canRetry: false,
		});
	}

	function subscribe(listener: Listener) {
		if (disposed) return () => undefined;
		listeners.add(listener);
		return () => listeners.delete(listener);
	}

	function dispose() {
		if (disposed) return;
		disposed = true;
		abortActiveRequest();
		listeners.clear();
		snapshot = {
			...snapshot,
			status: "cancelled",
			result: null,
			failure: null,
		};
	}

	function release() {
		cancel();
	}

	return {
		getSnapshot: () => snapshot,
		subscribe,
		setRevision,
		setSourceText,
		generate,
        answerQuestions: (answers: SalesRequestClarificationAnswer[]) => generate(snapshot.sourceText, answers),
		cancel,
		clear,
		retry,
		release,
		dispose,
	};
}
