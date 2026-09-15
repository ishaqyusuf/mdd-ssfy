"use client";

import { useTRPCClient } from "@/trpc/client";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import {
	type NewSalesRequestPilotSurface,
	useSalesRequestGeneratePreviewMutation,
} from "./api";
import {
	type SalesRequestGenerationRevisionInput,
	createSalesRequestGenerationController,
} from "./request-generation-controller";

export type UseSalesRequestGenerationControllerOptions =
	SalesRequestGenerationRevisionInput & {
		type: NewSalesRequestPilotSurface;
	};

export function useSalesRequestGenerationController(
	options: UseSalesRequestGenerationControllerOptions,
) {
	const trpcClient = useTRPCClient();
	const previewMutation = useSalesRequestGeneratePreviewMutation(options.type);
	const mutationRef = useRef(previewMutation.mutateAsync);
	mutationRef.current = previewMutation.mutateAsync;
	const revision = useMemo(
		() => ({
			formRevision: options.formRevision,
			configurationRevision: options.configurationRevision,
		}),
		[options.formRevision, options.configurationRevision],
	);
	const controllerRef = useRef<ReturnType<
		typeof createSalesRequestGenerationController
	> | null>(null);
	if (!controllerRef.current) {
		controllerRef.current = createSalesRequestGenerationController(
			(input) => mutationRef.current(input),
			revision,
			{
				answer: ({ signal, ...input }) =>
					trpcClient.salesRequest.answerClarification.mutate(
						input,
						signal ? { signal } : undefined,
					),
				cancel: (sessionId) =>
					trpcClient.salesRequest.cancelClarification.mutate({ sessionId }),
			},
		);
	}
	const controller = controllerRef.current;

	useEffect(() => {
		controller.setRevision(revision);
	}, [controller, revision]);

	useEffect(() => {
		return () => controller.release();
	}, [controller]);

	const snapshot = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
		controller.getSnapshot,
	);
	const setSourceText = useCallback(
		(sourceText: string) => controller.setSourceText(sourceText),
		[controller],
	);
	const generate = useCallback(
		(sourceText?: string) => controller.generate(sourceText),
		[controller],
	);
	const cancel = useCallback(() => controller.cancel(), [controller]);
	const clear = useCallback(() => controller.clear(), [controller]);
	const retry = useCallback(() => controller.retry(), [controller]);

	return {
		...snapshot,
		setSourceText,
		generate,
		answerQuestions: controller.answerQuestions,
		cancel,
		clear,
		retry,
	};
}
