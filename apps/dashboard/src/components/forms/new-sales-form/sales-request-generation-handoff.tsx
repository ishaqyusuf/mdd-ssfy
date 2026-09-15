"use client";

import { toast } from "@gnd/ui/use-toast";
import { Button } from "@gnd/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNewSalesFormStepRoutingQuery } from "./api";
import { SalesRequestDoorReview } from "./request-generation-door-review";
import { resolveSalesRequestDoorProduct } from "./request-generation-review-edit";
import { SalesRequestReviewContent } from "./request-generation-panel";
import { buildSalesRequestReviewModel } from "./request-generation-presentation";
import {
	clearSalesRequestGenerationHandoff,
	readSalesRequestGenerationHandoff,
	writeSalesRequestGenerationHandoff,
} from "./request-generation-handoff";
import {
	getSalesRequestGenerationApplyMessage,
	useSalesRequestGenerationApply,
} from "./use-request-generation-apply";

export function SalesRequestGenerationHandoff(props: {
	type: "order" | "quote";
	generationId: string;
	onBeforeApply?: () => void;
	loadingFallback?: ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const attemptedRef = useRef(false);
	const [failure, setFailure] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [retrying, setRetrying] = useState(false);
	const [preview, setPreview] = useState(() =>
		readSalesRequestGenerationHandoff(props.generationId),
	);
	const routing = useNewSalesFormStepRoutingQuery({}, Boolean(preview));
	const reviewModel = useMemo(
		() =>
			preview ? buildSalesRequestReviewModel(preview, routing.data) : null,
		[preview, routing.data],
	);
	const apply = useSalesRequestGenerationApply({
		type: props.type,
		open: Boolean(preview),
		preview,
		routeData: routing.data,
		routingPending: routing.isPending,
		routingError: routing.isError,
		// Unresolved facts may open a draft only when native initialization succeeds.
		// Failed initialization retains this preview, including requested quantities.
		hasUnresolved: false,
		allowUnresolvedDraft: true,
		onBeforeApply: props.onBeforeApply,
	});

	useEffect(() => {
		if (preview || attemptedRef.current) return;
		attemptedRef.current = true;
		const next = new URLSearchParams(searchParams.toString());
		next.delete("salesRequestGeneration");
		const query = next.toString();
		router.replace(query ? `${pathname}?${query}` : pathname);
		toast({
			variant: "destructive",
			title: "Generated draft expired",
			description: "Paste the request again to create a new draft.",
		});
	}, [pathname, preview, router, searchParams]);

	useEffect(() => {
		if (
			!preview ||
			preview.seed.lineItems.length === 0 ||
			attemptedRef.current ||
			apply.applyDisabled
		)
			return;
		attemptedRef.current = true;
		void apply.apply().then((result) => {
			if (
				result?.status === "applied" ||
				result?.status === "already-applied"
			) {
				clearSalesRequestGenerationHandoff(props.generationId);
				const next = new URLSearchParams(searchParams.toString());
				next.delete("salesRequestGeneration");
				const query = next.toString();
				router.replace(query ? `${pathname}?${query}` : pathname);
				toast({
					variant: "success",
					title: preview.seed.unresolved.length
						? "Draft needs review"
						: "Draft created",
					description: preview.seed.unresolved.length
						? `${preview.seed.unresolved.length} request detail${preview.seed.unresolved.length === 1 ? "" : "s"} could not be resolved.`
						: "Review the order and select a customer if needed.",
				});
				return;
			}
			setFailure(
				getSalesRequestGenerationApplyMessage(result) ||
					"The generated request could not be applied to the sales form.",
			);
		});
	}, [
		apply.apply,
		apply.applyDisabled,
		apply.applyMessage,
		pathname,
		preview,
		props.generationId,
		router,
		searchParams,
		retryCount,
	]);

	if (!preview) return props.loadingFallback ?? null;
	const dependencyError =
		apply.applyDisabledReason === "routing-error" ||
		apply.applyDisabledReason === "route-unavailable"
			? "The sales workflow could not be loaded."
			: apply.applyDisabledReason === "profile-error"
				? "The customer profile could not be loaded."
				: apply.applyDisabledReason === "persisted-record"
					? "This request needs a new, unsaved sales form."
					: null;
	const emptyDraft = preview.seed.lineItems.length === 0;
	const message = emptyDraft
		? "No draftable items were found. Review the unresolved details, then paste a revised request."
		: failure || dependencyError;
	if (!message && props.loadingFallback) return props.loadingFallback;
	const reviewTargets = [
		...preview.seed.unresolved,
		...(reviewModel?.lines.flatMap((line) =>
			line.selections.flatMap((selection) => {
				const title = selection.stepTitle.trim().toLowerCase();
				return title === "door" || title === "door type"
					? [
							{
								lineUid: line.uid,
								stepId: selection.stepId,
								field: title === "door" ? "door" : "doorType",
							},
						]
					: [];
			}),
		) || []),
	];
	return (
		<section
			className="m-4 space-y-3 rounded-lg border p-4"
			aria-label="Generated request"
		>
			<p role={message ? "alert" : "status"} className="text-sm">
				{message || "Opening generated draft…"}
			</p>
			{preview.sourceText ? (
				<details className="rounded-md border p-3">
					<summary className="cursor-pointer text-sm font-medium">
						Original customer request
					</summary>
					<pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm font-sans">
						{preview.sourceText}
					</pre>
				</details>
			) : null}
			{message && reviewModel ? (
				<SalesRequestReviewContent model={reviewModel} />
			) : null}
			{message && apply.applyResult?.status === "blocked" ? (
				<ul className="space-y-1 text-sm" aria-label="Draft opening issues">
					{apply.applyResult.issues
						.filter((issue) => issue.reason !== "unresolved-facts")
						.map((issue, index) => {
							const stepUid =
								issue.stepId == null
									? null
									: routing.data?.stepsById?.[issue.stepId];
							const step = stepUid ? routing.data?.stepsByUid?.[stepUid] : null;
							const lineIndex = preview.seed.lineItems.findIndex(
								(line) => line.uid === issue.lineUid,
							);
							return (
								<li key={index}>
									Line {lineIndex + 1} · {step?.title || "Item"}:{" "}
									{getSalesRequestGenerationApplyMessage({
										status: "blocked",
										reason: "initializer-issue",
										issues: [issue],
									})}
								</li>
							);
						})}
				</ul>
			) : null}
			{message
				? reviewTargets
						.filter(
							(entry, index, entries) =>
								entry.lineUid &&
								entry.stepId &&
								["door", "doortype"].includes(
									entry.field.trim().toLowerCase(),
								) &&
								entries.findIndex(
									(other) =>
										other.lineUid === entry.lineUid &&
										other.stepId === entry.stepId &&
										other.field.trim().toLowerCase() ===
											entry.field.trim().toLowerCase(),
								) === index,
						)
						.map((entry) => (
							<SalesRequestDoorReview
								key={`${entry.lineUid}:${entry.stepId}`}
								lineLabel={`Line ${preview.seed.lineItems.findIndex((line) => line.uid === entry.lineUid) + 1}`}
								fieldLabel={
									entry.field.trim().toLowerCase() === "doortype"
										? "Door type"
										: "Door product"
								}
								selections={
									preview.seed.lineItems.find(
										(line) => line.uid === entry.lineUid,
									)?.formSteps || []
								}
								stepUids={routing.data?.stepsById || {}}
								stepId={entry.stepId!}
								disabled={retrying}
								onChoose={(componentUid) => {
									const next = resolveSalesRequestDoorProduct(preview, {
										lineUid: entry.lineUid!,
										stepId: entry.stepId!,
										componentUid,
										field:
											entry.field.trim().toLowerCase() === "doortype"
												? "doorType"
												: "door",
										replaceExisting: true,
									});
									writeSalesRequestGenerationHandoff(next);
									setPreview(next);
									setFailure(
										"Product selected. Retry opening to validate the reviewed request.",
									);
								}}
							/>
						))
				: null}
			{message ? (
				<div className="flex gap-2">
					<Button
						type="button"
						size="sm"
						disabled={retrying || emptyDraft}
						onClick={async () => {
							setRetrying(true);
							try {
								await Promise.all([routing.refetch(), apply.refetchProfile()]);
								setFailure(null);
								attemptedRef.current = false;
								setRetryCount((count) => count + 1);
							} finally {
								setRetrying(false);
							}
						}}
					>
						Retry opening
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							clearSalesRequestGenerationHandoff(props.generationId);
							const next = new URLSearchParams(searchParams.toString());
							next.delete("salesRequestGeneration");
							const query = next.toString();
							router.replace(query ? `${pathname}?${query}` : pathname);
						}}
					>
						Discard request
					</Button>
				</div>
			) : null}
		</section>
	);
}
