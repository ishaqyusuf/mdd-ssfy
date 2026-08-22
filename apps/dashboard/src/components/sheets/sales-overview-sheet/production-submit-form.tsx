import { createSubmissionSchema } from "@/actions/schema";
import { submitSalesAssignmentAction } from "@/actions/submit-sales-assignment";
import FormInput from "@/components/common/controls/form-input";
import { SubmitButton } from "@/components/submit-button";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import { SalesFormQuantityStepper } from "@sales/sales-form";
import { useAction } from "next-safe-action/hooks";
import { type Control, useController, useFormContext } from "react-hook-form";
import type z from "zod";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Form } from "@gnd/ui/form";
import { Field, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";

import { useProduction } from "./context";
import { useAssignmentRow } from "./production-assignment-row";
import { useProductionItem } from "./production-item-context";
import { isWorkerProductionItemSubmissionBlocked } from "./production-worker-policy";

type ProductionSubmissionFormValues = z.infer<typeof createSubmissionSchema>;

export function ProductionSubmitForm({
	afterSuccess,
}: {
	afterSuccess?: () => void;
} = {}) {
	const ctx = useAssignmentRow();
	const pending = ctx.assignment.pending;
	const { item, queryCtx } = useProductionItem();
	const production = useProduction();
	const workerMode = Boolean(queryCtx.assignedTo);
	const form = useZodForm(createSubmissionSchema, {
		defaultValues: {
			pending: { ...pending },
			qty: {
				lh: pending.lh,
				rh: pending.rh,
				qty: pending.lh || pending.rh ? null : pending.qty,
			},
			salesId: item.salesId,
			itemId: item.itemId,
			assignmentId: ctx.assignment.id,
			itemUid: item.controlUid,
			idempotencyKey: crypto.randomUUID(),
		},
	});
	const formData = form.watch();
	const toast = useLoadingToast();
	const createSubmit = useAction(submitSalesAssignmentAction, {
		onSuccess(args) {
			if (args.data?.state === "pending_material_review") {
				toast.success("Submitted for admin verification", {
					description:
						"Your completed work is saved. An admin will verify the pending material record before production is finalized.",
				});
			} else {
				toast.success("Submitted");
			}
			toast.clearToastId();
			ctx.setOpenSubmitForm(false);
			afterSuccess?.();
			queryCtx.salesQuery.productionUpdated();
		},
		onError({ error }) {
			toast.error("Unable to complete", {
				description:
					error.serverError || "The production submission could not be saved.",
			});
		},
	});
	const materialReviewExpected =
		production.readinessUnavailable ||
		(production.readiness && production.readiness.state !== "ready");
	const materialBlocked =
		workerMode &&
		isWorkerProductionItemSubmissionBlocked({
			itemId: item.itemId,
			readiness: production.readiness,
			readinessUnavailable: production.readinessUnavailable,
		});

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit((values) => {
					if (materialBlocked) return;
					toast.display({
						title: "Creating assignment",
						duration: Number.POSITIVE_INFINITY,
					});
					createSubmit.execute(createSubmissionSchema.parse(values));
				})}
			>
				<div
					className={cn(
						"flex flex-col gap-4 duration-300 animate-in fade-in-50 slide-in-from-top-5",
						workerMode ? "mt-2" : "mt-4 border border-border p-3",
					)}
				>
					{workerMode ? null : (
						<h5 className="text-sm font-medium">Submit Assignment</h5>
					)}
					{materialBlocked ? (
						<Alert variant="destructive">
							<Icons.AlertTriangle />
							<AlertTitle>Materials unavailable</AlertTitle>
							<AlertDescription>
								This item cannot be submitted until its required materials are
								available.
							</AlertDescription>
						</Alert>
					) : !workerMode && materialReviewExpected ? (
						<Alert variant="warning">
							<Icons.AlertTriangle />
							<AlertTitle>Material verification is still pending</AlertTitle>
							<AlertDescription>
								You can submit this completed work now. It will be saved and sent
								to an admin for approval while the material or inbound record is
								verified.
							</AlertDescription>
						</Alert>
					) : null}
					<FieldGroup className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
						{formData.pending?.lh || formData.pending?.rh ? (
							<>
								<QtyInput name="lh" />
								<QtyInput name="rh" />
							</>
						) : (
							<QtyInput name="qty" />
						)}
						<Field className="sm:col-span-2">
							<Collapsible>
								<CollapsibleTrigger asChild>
									<Button
										className="w-full"
										size="xs"
										variant="secondary"
										type="button"
									>
										Note
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<div className="mt-2">
										<FormInput
											type="textarea"
											control={
												form.control as unknown as Control<ProductionSubmissionFormValues>
											}
											name="note"
										/>
									</div>
								</CollapsibleContent>
							</Collapsible>
						</Field>
						<Field className={cn(workerMode && "sm:col-span-2")}>
							<SubmitButton
								isSubmitting={createSubmit.isExecuting}
								disabled={
									createSubmit.isExecuting ||
									!form.formState.isValid ||
									materialBlocked
								}
							>
								Submit
							</SubmitButton>
						</Field>
						{workerMode ? null : (
							<Field>
								<Button
									type="button"
									variant="outline"
									onClick={() => ctx.setOpenSubmitForm(false)}
								>
									Cancel
								</Button>
							</Field>
						)}
					</FieldGroup>
				</div>
			</form>
		</Form>
	);
}

function QtyInput({ name }: { name: "lh" | "rh" | "qty" }) {
	const { control, getValues, setValue } =
		useFormContext<ProductionSubmissionFormValues>();
	const fieldName = `qty.${name}` as const;
	const pendingQty = Number(getValues(`pending.${name}`) || 0);
	const {
		field: { value },
	} = useController({
		name: fieldName,
		control,
	});
	const label = name === "qty" ? "Quantity" : `${name.toUpperCase()} quantity`;
	return (
		<Field>
			<FieldLabel className="flex justify-between uppercase">
				<span>{label}</span>
				<span className="text-muted-foreground">{pendingQty || 0} pending</span>
			</FieldLabel>
			<SalesFormQuantityStepper
				label={label}
				value={value}
				min={0}
				max={pendingQty}
				disabled={!pendingQty}
				className="w-32"
				onChange={(nextValue) => {
					setValue(fieldName, nextValue, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}}
			/>
		</Field>
	);
}
