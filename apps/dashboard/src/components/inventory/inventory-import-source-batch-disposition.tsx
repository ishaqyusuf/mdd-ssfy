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
type BatchDispositionInput = {
	items: Array<{
		inventoryId: number;
		targetCategoryId: number;
		disposition: SourceDisposition;
		baseline: {
			categoryId: number;
			sourceStepUid: string | null;
			sourceComponentUid: string | null;
			sourceCustom: boolean;
		};
	}>;
};

export function InventoryImportSourceBatchDisposition({
	candidates,
	targetCategories,
	isPending,
	onApply,
}: {
	candidates: SourceReviewCandidate[];
	targetCategories: TargetCategory[];
	isPending: boolean;
	onApply: (input: BatchDispositionInput) => void;
}) {
	const panelId = useId();
	const [open, setOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [targetCategoryId, setTargetCategoryId] = useState<string>();
	const [disposition, setDisposition] = useState<SourceDisposition>(
		"retain_as_inventory",
	);
	const selectedCandidates = candidates.filter((candidate) =>
		selectedIds.includes(candidate.inventoryId),
	);
	const selectedKind = selectedCandidates[0]?.productKind;
	const compatibleTargets = selectedKind
		? targetCategories.filter(
				(category) => category.productKind === selectedKind,
			)
		: [];

	function toggleCandidate(candidate: SourceReviewCandidate, checked: boolean) {
		if (checked) {
			if (selectedKind && candidate.productKind !== selectedKind) return;
			setSelectedIds((current) => [...current, candidate.inventoryId]);
			return;
		}
		setSelectedIds((current) =>
			current.filter((inventoryId) => inventoryId !== candidate.inventoryId),
		);
		if (selectedIds.length === 1) setTargetCategoryId(undefined);
	}

	return (
		<div className="mt-3 rounded-md border bg-muted/20 p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<div className="text-sm font-medium">Batch retained disposition</div>
					<div className="text-xs text-muted-foreground">
						Move up to 12 reviewed rows of one inventory kind.
					</div>
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					aria-expanded={open}
					aria-controls={panelId}
					onClick={() => setOpen((current) => !current)}
				>
					{open ? "Close batch" : "Batch retain / move"}
				</Button>
			</div>

			{open ? (
				<div id={panelId} className="mt-3 grid gap-3">
					<fieldset className="grid gap-2">
						<legend className="text-xs font-medium">Reviewed rows</legend>
						<div className="grid max-h-52 gap-1 overflow-y-auto rounded-md border bg-background p-2 md:grid-cols-2">
							{candidates.slice(0, 12).map((candidate) => {
								const checked = selectedIds.includes(candidate.inventoryId);
								const disabled =
									Boolean(selectedKind) &&
									candidate.productKind !== selectedKind &&
									!checked;
								return (
									<label
										key={candidate.inventoryId}
										className="flex min-w-0 items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40"
									>
										<input
											type="checkbox"
											className="mt-0.5 size-4 shrink-0"
											checked={checked}
											disabled={disabled || isPending}
											onChange={(event) =>
												toggleCandidate(candidate, event.target.checked)
											}
										/>
										<span className="min-w-0">
											<span className="block truncate font-medium">
												{candidate.inventoryName}
											</span>
											<span className="text-muted-foreground">
												{candidate.productKind} · {candidate.status}
											</span>
										</span>
									</label>
								);
							})}
						</div>
					</fieldset>

					<div className="grid gap-3 md:grid-cols-2">
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
								disabled={!selectedIds.length}
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
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<ConfirmBtn
							type="button"
							size="sm"
							variant="outline"
							icon="Warn"
							isDeleting={isPending}
							disabled={!selectedIds.length || !targetCategoryId}
							onClick={async () => {
								if (!targetCategoryId || !selectedCandidates.length) return;
								onApply({
									items: selectedCandidates.map((candidate) => ({
										inventoryId: candidate.inventoryId,
										targetCategoryId: Number(targetCategoryId),
										disposition,
										baseline: {
											categoryId: candidate.categoryId,
											sourceStepUid: candidate.sourceStepUid,
											sourceComponentUid: candidate.sourceComponentUid,
											sourceCustom: candidate.sourceCustom,
										},
									})),
								});
							}}
						>
							Apply to {selectedIds.length} row(s)
						</ConfirmBtn>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							disabled={!selectedIds.length || isPending}
							onClick={() => {
								setSelectedIds([]);
								setTargetCategoryId(undefined);
							}}
						>
							Clear selection
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
