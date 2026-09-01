"use client";

import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { useId, useRef, useState } from "react";

import { getProductionDispatchMutationPolicy } from "@gnd/sales/production-dispatch-policy";
import { Accordion } from "@gnd/ui/accordion";
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
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";

import { useSaleOverview } from "../../context";
import { ProductionAssignmentForm } from "../../production-assignment-form";
import {
	ProductionAssignmentRow,
	ProductionAssignmentRowProvider,
} from "../../production-assignment-row";
import {
	ProductionItemAssignmentsProvider,
	useProductionAssignments,
} from "../../production-assignments";
import { ProductionDeletionLockNotice } from "../../production-deletion-lock-notice";
import { useProductionItem } from "../../production-item-context";
import { ProductionSubmitForm } from "../../production-submit-form";
import { getWorkerProductionSubmissionProgress } from "../../production-worker-policy";
import { getProductionConfigKey } from "./production-item-presentation";
import {
	getEligibleProductionSubmissionAssignments,
	hasPendingProductionQuantity,
	resolveProductionSubmissionAssignmentIndex,
} from "./production-submission-selection";

function ProductionV2RecordsSection() {
	const { item, queryCtx } = useProductionItem();
	const saleOverview = useSaleOverview();
	const { data, error, refreshAssignments } = useProductionAssignments();
	const workerMode = Boolean(queryCtx.assignedTo);
	const orderFulfilled =
		getSalesOverviewDocumentStatus(saleOverview.data).status === "fulfilled";
	const label = workerMode ? "Submissions" : "Assignments";
	const submissionProgress = getWorkerProductionSubmissionProgress(item);
	const assignmentCount = data?.assignments?.length || 0;
	const staffedAssignmentCount =
		data?.assignments?.filter((assignment) => assignment.assignedToId).length ||
		0;
	const headingId = useId();
	const [createOpen, setCreateOpen] = useState(false);
	const createTriggerRef = useRef<HTMLButtonElement>(null);
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
	const hasWorkerSubmissions = Boolean(
		data?.assignments?.some((assignment) => assignment.submissions?.length),
	);
	const workerSubmissionEmpty =
		workerMode && Boolean(data?.uid) && !hasWorkerSubmissions;
	const hasPendingAssignmentQuantity = hasPendingProductionQuantity(
		item.analytics?.assignment?.pending,
	);
	const mutationPolicy = getProductionDispatchMutationPolicy({
		dispatchMode: Boolean(queryCtx.dispatchMode),
		hasPendingAssignmentQuantity,
		hasPendingSubmissionQuantity: selectedAssignmentIndex !== null,
	});
	const createDisabled = workerMode
		? !mutationPolicy.canSubmitExistingAssignment
		: !mutationPolicy.canCreateAssignment;
	const createDisabledReason = workerMode
		? selectedAssignmentIndex === null
			? "No assignment has a pending quantity available to submit."
			: queryCtx.dispatchMode
				? "Submissions are locked while this order is in dispatch mode."
				: null
		: queryCtx.dispatchMode
			? "New production assignments are locked while this order is in dispatch mode. Existing assignments can still be submitted."
			: !hasPendingAssignmentQuantity
				? "All production quantity for this item is already assigned."
				: null;
	const closeCreateForm = () => {
		setCreateOpen(false);
		refreshAssignments();
		createTriggerRef.current?.focus();
	};
	const createButtonLabel = createOpen
		? `Close ${workerMode ? "submission" : "assignment"} form`
		: `Create ${workerMode ? "submission" : "assignment"}`;
	const compactWorkerButton = workerMode && hasWorkerSubmissions;
	const createButton = (
		<CollapsibleTrigger asChild>
			<Button
				ref={createTriggerRef}
				type="button"
				size={compactWorkerButton || !workerMode ? "icon-sm" : "sm"}
				variant={createOpen ? "outline" : "default"}
				disabled={createDisabled}
				aria-label={createButtonLabel}
				className={compactWorkerButton || !workerMode ? "rounded-xl" : "w-full"}
			>
				{createOpen ? <Icons.Close /> : <Icons.Add />}
				{compactWorkerButton || !workerMode
					? null
					: createOpen
						? "Close"
						: "Create submission"}
			</Button>
		</CollapsibleTrigger>
	);
	const createButtonWithTooltip = createDisabledReason ? (
		<TooltipProvider delayDuration={100}>
			<Tooltip>
				<TooltipTrigger asChild>
					<span
						aria-label={`Create unavailable: ${createDisabledReason}`}
						aria-disabled="true"
						tabIndex={0}
						className={
							compactWorkerButton || !workerMode ? "inline-flex" : "block"
						}
					>
						{createButton}
					</span>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="max-w-xs">
					<p className="font-medium">Create unavailable</p>
					<p className="text-muted-foreground">{createDisabledReason}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	) : (
		createButton
	);

	return (
		<section className="px-4 py-5 sm:px-5" aria-labelledby={headingId}>
			<Collapsible open={createOpen} onOpenChange={setCreateOpen}>
				<div className="mb-3 flex min-h-9 items-center justify-between gap-3 pr-8">
					<h3 id={headingId} className="text-sm font-semibold">
						{label}
					</h3>
					<div className="flex items-center gap-2">
						<Badge variant="secondary">
							{workerMode
								? `${submissionProgress.submitted}/${submissionProgress.assigned} submitted`
								: `${staffedAssignmentCount} of ${assignmentCount} staffed`}
						</Badge>
						{workerMode
							? hasWorkerSubmissions
								? createButtonWithTooltip
								: null
							: createButtonWithTooltip}
					</div>
				</div>
				{orderFulfilled ? (
					<div className="pb-4">
						<ProductionDeletionLockNotice>
							{workerMode
								? "This order is fulfilled. Submission records can no longer be deleted."
								: "This order is fulfilled. Assignment and submission records can no longer be deleted."}
						</ProductionDeletionLockNotice>
					</div>
				) : null}
				{workerSubmissionEmpty ? (
					<div className="pb-4">{createButtonWithTooltip}</div>
				) : null}
				<CollapsibleContent className="pb-4">
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
									<ProductionSubmitForm afterSuccess={closeCreateForm} />
								</ProductionAssignmentRowProvider>
							</div>
						)
					) : (
						<ProductionAssignmentForm closeForm={closeCreateForm} />
					)}
				</CollapsibleContent>
			</Collapsible>
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
				workerMode ? (
					<div>
						{data.assignments.map((assignment, index) => (
							<ProductionAssignmentRow
								key={assignment.id}
								index={index}
								view="submissions"
								showCreateAction={false}
								showRecordHeading={false}
								presentation="document"
							/>
						))}
					</div>
				) : (
					<Accordion
						type="multiple"
						defaultValue={
							data.assignments[0]?.id ? [String(data.assignments[0].id)] : []
						}
						className="border-t border-border"
					>
						{data.assignments.map((assignment, index) => (
							<ProductionAssignmentRow
								key={assignment.id}
								index={index}
								presentation="document"
							/>
						))}
					</Accordion>
				)
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
					{configs.map((config, index) => (
						<div key={getProductionConfigKey(config, index)}>
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
				<ProductionV2RecordsSection />
				<Separator />
				<ProductionV2DetailsSection />
				<Separator />
				<ProductionV2NotesSection />
			</div>
		</ProductionItemAssignmentsProvider>
	);
}
