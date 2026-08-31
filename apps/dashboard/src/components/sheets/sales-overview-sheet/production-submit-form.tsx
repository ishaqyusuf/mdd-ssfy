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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Form } from "@gnd/ui/form";

import { useAssignmentRow } from "./production-assignment-row";
import { useProductionItem } from "./production-item-context";

type ProductionSubmissionFormValues = z.infer<typeof createSubmissionSchema>;

export function ProductionSubmitForm({
	afterSuccess,
	presentation = "card",
}: {
	afterSuccess?: () => void;
	presentation?: "card" | "inline";
} = {}) {
	const ctx = useAssignmentRow();
	const pending = ctx.assignment.pending;
	const { item, queryCtx } = useProductionItem();
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
		onSuccess() {
			toast.success("Submitted");
			toast.clearToastId();
			ctx.setOpenSubmitForm(false);
			ctx.refreshAssignments();
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
	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit((values) => {
					toast.display({
						title: "Submitting work",
						duration: Number.POSITIVE_INFINITY,
					});
					createSubmit.execute(createSubmissionSchema.parse(values));
				})}
			>
				<div
					className={cn(
						"flex flex-col gap-4 duration-300 animate-in fade-in-50 slide-in-from-top-5",
						workerMode
							? "mt-2"
							: presentation === "inline"
								? "pt-4"
								: "mt-4 border border-border p-3",
					)}
				>
					{workerMode ? null : (
						<h5 className="text-sm font-medium">Submit Assignment</h5>
					)}
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
								disabled={createSubmit.isExecuting || !form.formState.isValid}
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
