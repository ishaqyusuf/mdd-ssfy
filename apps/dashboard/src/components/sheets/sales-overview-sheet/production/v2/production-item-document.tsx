"use client";

import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { useId, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@gnd/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@gnd/ui/item";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";

import { useProduction } from "../../context";
import { ProductionAssignmentForm } from "../../production-assignment-form";
import {
	ProductionAssignmentRow,
	ProductionAssignmentRowProvider,
} from "../../production-assignment-row";
import {
	ProductionItemAssignmentsProvider,
	useProductionAssignments,
} from "../../production-assignments";
import { useProductionItem } from "../../production-item-context";
import { ProductionSubmitForm } from "../../production-submit-form";
import {
	getWorkerProductionSubmissionProgress,
	shouldWarnWorkerProductionItemMaterialReview,
} from "../../production-worker-policy";
import {
	getEligibleProductionSubmissionAssignments,
	hasPendingProductionQuantity,
	resolveProductionSubmissionAssignmentIndex,
} from "./production-submission-selection";

function ProductionV2CreateAction() {
	const { item, queryCtx } = useProductionItem();
	const { data } = useProductionAssignments();
	const production = useProduction();
	const workerMode = Boolean(queryCtx.assignedTo);
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [requestedAssignmentIndex, setRequestedAssignmentIndex] = useState<
		number | null
	>(null);
	const eligibleAssignments = getEligibleProductionSubmissionAssignments(
		data?.assignments || [],
	);
	const selectedAssignmentIndex = resolveProductionSubmissionAssignmentIndex(
		eligibleAssignments,
		requestedAssignmentIndex,
	);
	const materialReviewExpected = shouldWarnWorkerProductionItemMaterialReview({
		itemId: item.itemId,
		readiness: production.readiness,
		readinessUnavailable: production.readinessUnavailable,
	});
	const disabled = workerMode
		? selectedAssignmentIndex === null || queryCtx.dispatchMode
		: !hasPendingProductionQuantity(item.analytics?.assignment?.pending) ||
			queryCtx.dispatchMode;
	const label = workerMode ? "Create submission" : "Create assignment";
	const disabledReason = queryCtx.dispatchMode
		? "Production changes are locked while this order is in dispatch mode."
		: workerMode && selectedAssignmentIndex === null
			? "No assignment has a pending quantity available to submit."
			: !workerMode &&
					!hasPendingProductionQuantity(item.analytics?.assignment?.pending)
				? "All production quantity for this item is already assigned."
				: null;
	const closeForm = () => {
		setOpen(false);
		triggerRef.current?.focus();
	};

	return (
		<section className="px-4 py-4 sm:px-5" aria-label={label}>
			<Collapsible open={open} onOpenChange={setOpen}>
				<ItemGroup>
					<Item className="border-0 p-0">
						<ItemContent>
							<ItemTitle>{label}</ItemTitle>
							<ItemDescription>
								{workerMode
									? "Record completed production for this item."
									: "Assign the remaining quantity to a production worker."}
							</ItemDescription>
						</ItemContent>
						<ItemActions>
							<CollapsibleTrigger asChild>
								<Button
									ref={triggerRef}
									type="button"
									size="sm"
									variant={open ? "outline" : "default"}
									disabled={disabled}
								>
									{open ? (
										<Icons.Close data-icon="inline-start" />
									) : (
										<Icons.Add data-icon="inline-start" />
									)}
									{open ? "Close" : label}
								</Button>
							</CollapsibleTrigger>
						</ItemActions>
					</Item>
				</ItemGroup>
				{materialReviewExpected && workerMode ? (
					<Alert variant="warning" className="mt-3">
						<Icons.AlertTriangle />
						<AlertTitle>Material verification required</AlertTitle>
						<AlertDescription>
							You can report completed work now. It will remain awaiting admin
							approval until the material record is resolved.
						</AlertDescription>
					</Alert>
				) : disabledReason ? (
					<Alert className="mt-3">
						<Icons.Info />
						<AlertTitle>Create unavailable</AlertTitle>
						<AlertDescription>{disabledReason}</AlertDescription>
					</Alert>
				) : null}
				<CollapsibleContent className="pt-4">
					{workerMode ? (
						selectedAssignmentIndex === null ? (
							<Empty className="min-h-32 p-4">
								<EmptyHeader>
									<EmptyTitle>No pending assignment</EmptyTitle>
									<EmptyDescription>
										No assignment has a quantity available to submit.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						) : (
							<div className="flex flex-col gap-4 rounded-md border p-4">
								{eligibleAssignments.length > 1 ? (
									<FieldGroup className="max-w-sm gap-2">
										<Field>
											<FieldLabel>Assignment</FieldLabel>
											<Select
												value={String(selectedAssignmentIndex)}
												onValueChange={(value) =>
													setRequestedAssignmentIndex(Number(value))
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select assignment" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{eligibleAssignments.map(
															({ assignment, index }) => (
																<SelectItem
																	key={assignment.id}
																	value={String(index)}
																>
																	{assignment.assignedTo || "My assignment"} ·{" "}
																	{Number(
																		assignment.pending?.qty ||
																			assignment.pending?.lh ||
																			assignment.pending?.rh ||
																			0,
																	)}{" "}
																	pending
																</SelectItem>
															),
														)}
													</SelectGroup>
												</SelectContent>
											</Select>
										</Field>
									</FieldGroup>
								) : null}
								<ProductionAssignmentRowProvider
									args={[selectedAssignmentIndex]}
								>
									<ProductionSubmitForm afterSuccess={closeForm} />
								</ProductionAssignmentRowProvider>
							</div>
						)
					) : (
						<ProductionAssignmentForm closeForm={closeForm} />
					)}
				</CollapsibleContent>
			</Collapsible>
		</section>
	);
}

function ProductionV2RecordsSection() {
	const { item, queryCtx } = useProductionItem();
	const { data, error } = useProductionAssignments();
	const workerMode = Boolean(queryCtx.assignedTo);
	const label = workerMode ? "Submissions" : "Assignments";
	const submissionProgress = getWorkerProductionSubmissionProgress(item);
	const headingId = useId();

	return (
		<section className="px-4 py-5 sm:px-5" aria-labelledby={headingId}>
			<div className="mb-3 flex items-center justify-between gap-3">
				<h3 id={headingId} className="text-sm font-semibold">
					{label}
				</h3>
				<Badge variant="secondary">
					{workerMode
						? `${submissionProgress.submitted}/${submissionProgress.assigned} submitted`
						: `${data?.assignments?.length || 0} total`}
				</Badge>
			</div>
			{error ? (
				<Alert>
					<Icons.AlertTriangle />
					<AlertTitle>Assignments unavailable</AlertTitle>
					<AlertDescription>
						The assignment records could not be loaded. Details and notes remain
						available.
					</AlertDescription>
				</Alert>
			) : !data?.uid ? (
				<div className="flex flex-col gap-3">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : data.assignments?.length ? (
				<div>
					{data.assignments.map((assignment, index) => (
						<ProductionAssignmentRow
							key={assignment.id}
							index={index}
							view={workerMode ? "submissions" : "assignments"}
							showCreateAction={!workerMode}
							showRecordHeading={!workerMode}
							presentation="document"
						/>
					))}
				</div>
			) : null}
		</section>
	);
}

function ProductionV2DetailsSection() {
	const { item } = useProductionItem();
	const configs = item.configs?.filter((config) => !config.hidden) || [];
	const headingId = useId();

	return (
		<section className="px-4 py-5 sm:px-5" aria-labelledby={headingId}>
			<h3 id={headingId} className="mb-4 text-sm font-semibold">
				Details
			</h3>
			{configs.length ? (
				<dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
					{configs.map((config) => (
						<div key={`${config.label}-${config.value}`}>
							<dt className="text-xs font-medium uppercase text-muted-foreground">
								{config.label}
							</dt>
							<dd
								className={
									config.color === "red"
										? "mt-1 uppercase text-destructive"
										: "mt-1 uppercase"
								}
							>
								{config.value}
							</dd>
						</div>
					))}
				</dl>
			) : (
				<Empty className="min-h-32 p-4">
					<EmptyHeader>
						<EmptyTitle>No item details</EmptyTitle>
						<EmptyDescription>
							No configuration details are available for this item.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</section>
	);
}

function ProductionV2NotesSection() {
	const { item } = useProductionItem();
	const headingId = useId();

	return (
		<section className="px-4 py-5 sm:px-5" aria-labelledby={headingId}>
			<h3 id={headingId} className="mb-4 text-sm font-semibold">
				Notes & activity
			</h3>
			<Note
				subject="Production Note"
				headline=""
				statusFilters={["public"]}
				typeFilters={["production", "general"]}
				tagFilters={[
					noteTagFilter("itemControlUID", item.controlUid),
					noteTagFilter("salesItemId", item.itemId),
					noteTagFilter("salesId", item.salesId),
				]}
			/>
		</section>
	);
}

export function ProductionV2ItemDocument() {
	return (
		<ProductionItemAssignmentsProvider args={[]}>
			<div>
				<ProductionV2CreateAction />
				<Separator />
				<ProductionV2RecordsSection />
				<Separator />
				<ProductionV2DetailsSection />
				<Separator />
				<ProductionV2NotesSection />
			</div>
		</ProductionItemAssignmentsProvider>
	);
}
