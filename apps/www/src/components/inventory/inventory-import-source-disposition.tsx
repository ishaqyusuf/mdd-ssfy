"use client";

import ConfirmBtn from "@/components/confirm-button";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useId, useState } from "react";

type SourceReviewCandidate =
	RouterOutputs["inventories"]["inventoryImportSourceReview"]["candidates"][number];
type TargetCategory =
	RouterOutputs["inventories"]["inventoryImportCategoryCleanupReview"]["targetCategories"][number];
type SourceDisposition = "retain_as_inventory" | "retain_as_custom";

type SourceDispositionInput = {
	inventoryId: number;
	targetCategoryId: number;
	disposition: SourceDisposition;
	baseline: {
		categoryId: number;
		sourceStepUid: string | null;
		sourceComponentUid: string | null;
		sourceCustom: boolean;
	};
};

export function InventoryImportSourceDisposition({
	candidate,
	targetCategories,
	isPending,
	onApply,
}: {
	candidate: SourceReviewCandidate;
	targetCategories: TargetCategory[];
	isPending: boolean;
	onApply: (input: SourceDispositionInput) => void;
}) {
	const panelId = useId();
	const [open, setOpen] = useState(false);
	const [targetCategoryId, setTargetCategoryId] = useState<string>();
	const [disposition, setDisposition] = useState<SourceDisposition>(
		"retain_as_inventory",
	);
	const compatibleTargets = targetCategories.filter(
		(category) => category.productKind === candidate.productKind,
	);

	return (
		<div className="mt-2 border-t pt-2">
			<Button
				type="button"
				size="sm"
				variant="ghost"
				className="h-7 px-2 text-xs"
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => setOpen((current) => !current)}
			>
				{open ? "Close retain / move" : "Retain / move item"}
			</Button>

			{open ? (
				<div
					id={panelId}
					className="mt-2 grid gap-2 rounded-md border bg-background p-3"
				>
					<div className="grid gap-1">
						<label
							className="text-xs font-medium"
							htmlFor={`${panelId}-target`}
						>
							Active target category
						</label>
						<Select
							value={targetCategoryId}
							onValueChange={setTargetCategoryId}
						>
							<SelectTrigger id={`${panelId}-target`} className="h-8 text-xs">
								<SelectValue placeholder="Choose a matching category" />
							</SelectTrigger>
							<SelectContent>
								{compatibleTargets.map((category) => (
									<SelectItem key={category.id} value={String(category.id)}>
										{category.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{compatibleTargets.length === 0 ? (
							<p className="text-xs text-rose-700">
								No active {candidate.productKind} category is available.
							</p>
						) : null}
					</div>

					<div className="grid gap-1">
						<label
							className="text-xs font-medium"
							htmlFor={`${panelId}-disposition`}
						>
							Retained visibility
						</label>
						<Select
							value={disposition}
							onValueChange={(value) =>
								setDisposition(value as SourceDisposition)
							}
						>
							<SelectTrigger
								id={`${panelId}-disposition`}
								className="h-8 text-xs"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="retain_as_inventory">
									Standard operational inventory
								</SelectItem>
								<SelectItem value="retain_as_custom">
									Custom inventory exception
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<p className="text-xs text-muted-foreground">
						This moves the item, detaches its legacy import ownership, and
						records the reviewed before/after state.
					</p>

					<ConfirmBtn
						type="button"
						size="sm"
						variant="outline"
						icon="Warn"
						className="w-fit"
						isDeleting={isPending}
						disabled={!targetCategoryId || compatibleTargets.length === 0}
						onClick={async () => {
							if (!targetCategoryId) return;
							onApply({
								inventoryId: candidate.inventoryId,
								targetCategoryId: Number(targetCategoryId),
								disposition,
								baseline: {
									categoryId: candidate.categoryId,
									sourceStepUid: candidate.sourceStepUid,
									sourceComponentUid: candidate.sourceComponentUid,
									sourceCustom: candidate.sourceCustom,
								},
							});
						}}
					>
						Apply retained disposition
					</ConfirmBtn>
				</div>
			) : null}
		</div>
	);
}
