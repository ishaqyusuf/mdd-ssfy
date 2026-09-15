"use client";

import { RequestClarificationQuestionnaire } from "@/components/forms/new-sales-form/request-clarification-questionnaire";
import type {
	SalesRequestGeneratePreviewOutput,
	SalesRequestClarificationAnswer,
} from "@/components/forms/new-sales-form/request-generation-controller";
import { writeSalesRequestGenerationHandoff } from "@/components/forms/new-sales-form/request-generation-handoff";
import { useSalesRequestGenerationController } from "@/components/forms/new-sales-form/use-request-generation-controller";
import { useSalesRequestQuickCreateStore } from "@/store/sales-request-quick-create";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Textarea } from "@gnd/ui/textarea";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { SalesRequestGuidanceSection } from "./sales-request-guidance-section";

export function SalesRequestQuickCreateModal() {
	const router = useRouter();
	const [showGuidance, setShowGuidance] = useState(false);
	const searchParams = useSearchParams();
	const isOpen = useSalesRequestQuickCreateStore((state) => state.isOpen);
	const setOpen = useSalesRequestQuickCreateStore((state) => state.setOpen);
	const controller = useSalesRequestGenerationController({ type: "order" });

	useEffect(() => {
		if (!isOpen) {
			controller.clear();
			setShowGuidance(false);
		}
	}, [controller.clear, isOpen]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		openDraft(await controller.generate());
	}

	async function answerQuestions(answers: SalesRequestClarificationAnswer[]) {
		openDraft(await controller.answerQuestions(answers));
	}

	function openDraft(result: SalesRequestGeneratePreviewOutput | null) {
		if (!result || result.clarification || result.seed.lineItems.length === 0)
			return;
		writeSalesRequestGenerationHandoff({
			...result,
			sourceText: result.sourceText ?? controller.sourceText,
		});
		const next = new URLSearchParams({
			salesRequestGeneration: result.generationId,
		});
		const selectedCustomerId = searchParams.get("selectedCustomerId");
		if (selectedCustomerId) next.set("selectedCustomerId", selectedCustomerId);
		setOpen(false);
		router.push(`/sales-form/create-order?${next.toString()}`);
	}

	function openManually() {
		controller.clear();
		setOpen(false);
		const next = new URLSearchParams();
		const customerId = searchParams.get("selectedCustomerId");
		if (customerId) next.set("selectedCustomerId", customerId);
		router.push(
			`/sales-form/create-order${next.size ? `?${next.toString()}` : ""}`,
		);
	}

	function handleOpenChange(open: boolean) {
		if (!open && controller.status === "pending") controller.cancel();
		setOpen(open);
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="w-[calc(100%-1rem)] max-w-xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
				<form
					onSubmit={submit}
					className="space-y-4"
					aria-busy={controller.status === "pending"}
				>
					<DialogHeader>
						<DialogTitle>New request</DialogTitle>
						<DialogDescription>
							Paste the customer request. The generated order opens as a draft.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						autoFocus
						value={controller.sourceText}
						onChange={(event) => controller.setSourceText(event.target.value)}
						placeholder="Paste request"
						aria-label="Customer request"
						className="min-h-52 resize-y"
						maxLength={50_000}
						disabled={controller.status === "pending"}
					/>
					{controller.clarification ? (
						<RequestClarificationQuestionnaire
							key={`${controller.clarification.sessionId}-${controller.clarification.revision}`}
							clarification={controller.clarification}
							history={controller.clarificationHistory}
							pending={controller.status === "pending"}
							stale={controller.isStale}
							onSubmit={(answers) => void answerQuestions(answers)}
						/>
					) : null}
					{controller.failure ? (
						<p role="alert" className="text-sm text-destructive">
							{controller.failure.message}
							{controller.failure.referenceId
								? ` Reference: ${controller.failure.referenceId}`
								: ""}
						</p>
					) : null}
					{controller.status === "success" &&
					!controller.isStale &&
					!controller.clarification &&
					controller.result?.seed.lineItems.length === 0 ? (
						<div role="alert" className="space-y-2 text-sm">
							<p>
								No draftable items were found. Review the request and catalog
								selections before trying again.
							</p>
							{controller.result.seed.unresolved.map((issue, index) => (
								<p key={index}>{issue.reason}</p>
							))}
						</div>
					) : null}
					<div className="space-y-3">
						<Button
							type="button"
							variant="ghost"
							aria-expanded={showGuidance}
							aria-controls="sales-request-saved-guidance"
							onClick={() => setShowGuidance((value) => !value)}
						>
							Saved request guidance
						</Button>
						{showGuidance ? (
							<div id="sales-request-saved-guidance">
								<SalesRequestGuidanceSection />
							</div>
						) : null}
					</div>
					<DialogFooter className="flex-wrap gap-2">
						<Button type="button" variant="outline" onClick={openManually}>
							Open sales form manually
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={() => handleOpenChange(false)}
						>
							Cancel
						</Button>
						{!controller.clarification || controller.isStale ? (
							<Button
								type="submit"
								disabled={
									controller.status === "pending" ||
									!controller.sourceText.trim()
								}
							>
								{controller.status === "pending" ? (
									<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Icons.Sparkles className="mr-2 size-4" />
								)}
								{controller.status === "pending" ? "Creating…" : "Create draft"}
							</Button>
						) : null}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
