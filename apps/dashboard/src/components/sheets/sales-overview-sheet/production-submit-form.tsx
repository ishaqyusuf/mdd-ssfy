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
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";

import { useProduction } from "./context";
import { useAssignmentRow } from "./production-assignment-row";
import { useProductionItem } from "./production-tab";
import { isWorkerProductionItemSubmissionBlocked } from "./production-worker-policy";

type ProductionSubmissionFormValues = z.infer<typeof createSubmissionSchema>;

export function ProductionSubmitForm() {
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
						"space-y-4 duration-300 animate-in fade-in-50 slide-in-from-top-5",
						workerMode ? "mt-2" : "mt-4 border border-border p-3",
					)}
				>
					{workerMode ? null : (
						<h5 className="text-sm font-medium">Submit Assignment</h5>
					)}
					{materialBlocked ? (
						<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-950">
							<Icons.AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" />
							<div>
								<p className="text-sm font-medium">Materials unavailable</p>
								<p className="mt-1 text-xs leading-5 text-red-900">
									This item cannot be submitted until its required materials are
									available.
								</p>
							</div>
						</div>
					) : !workerMode && materialReviewExpected ? (
						<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
							<Icons.AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
							<div>
								<p className="text-sm font-medium">
									Material verification is still pending
								</p>
								<p className="mt-1 text-xs leading-5 text-amber-900">
									You can submit this completed work now. It will be saved and
									sent to an admin for approval while the material or inbound
									record is verified.
								</p>
							</div>
						</div>
					) : null}
					<div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
						{formData.pending?.lh || formData.pending?.rh ? (
							<>
								<QtyInput name="lh" />
								<QtyInput name="rh" />
							</>
						) : (
							<QtyInput name="qty" />
						)}
						<div className="sm:col-span-2">
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
						</div>
						<SubmitButton
							isSubmitting={createSubmit.isExecuting}
							className={cn(workerMode && "sm:col-span-2")}
							disabled={
								createSubmit.isExecuting ||
								!form.formState.isValid ||
								materialBlocked
							}
						>
							Submit
						</SubmitButton>
						{workerMode ? null : (
							<Button
								type="button"
								variant="outline"
								onClick={() => ctx.setOpenSubmitForm(false)}
							>
								Cancel
							</Button>
						)}
					</div>
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
		<div className="grid gap-2">
			<Label className="flex justify-between uppercase">
				<span>{label}</span>
				<span className="text-muted-foreground">{pendingQty || 0} pending</span>
			</Label>
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
		</div>
	);
}
