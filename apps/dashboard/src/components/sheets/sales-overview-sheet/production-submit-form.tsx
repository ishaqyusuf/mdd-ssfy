import { createSubmissionSchema } from "@/actions/schema";
import { submitSalesAssignmentAction } from "@/actions/submit-sales-assignment";
import FormInput from "@/components/common/controls/form-input";
import { NumberInput } from "@/components/currency-input";
import { SubmitButton } from "@/components/submit-button";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useZodForm } from "@/hooks/use-zod-form";

import { useAction } from "next-safe-action/hooks";
import { useController, useFormContext } from "react-hook-form";
import type { NumericFormatProps } from "react-number-format";

import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Icons } from "@gnd/ui/icons";

import { useAssignmentRow } from "./production-assignment-row";
import { useProduction } from "./context";
import { useProductionItem } from "./production-tab";

export function ProductionSubmitForm() {
    const ctx = useAssignmentRow();
    const pending = ctx?.assignment?.pending;
    const { item, queryCtx } = useProductionItem();
	const production = useProduction();
	const form = useZodForm(createSubmissionSchema, {
        defaultValues: {
            pending: {
                ...pending,
            },
            qty: {
                lh: pending.lh,
                rh: pending.rh,
                qty: pending.lh || pending.rh ? null : pending.qty,
                // ...item?.analytics?.assignment?.pending,
                // qty: !item.pending?.assignment?.noHandle
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
        onError(e) {
            toast.error("Unable to complete");
        },
    });
	const materialReviewExpected =
		production.readinessUnavailable ||
		(production.readiness && production.readiness.state !== "ready");

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit((e) => {
                    toast.display({
                        title: "Creating assignment",
                        duration: Number.POSITIVE_INFINITY,
                    });
                    createSubmit.execute(e);
                })}
            >
                <div className="mt-4 space-y-3 border border-border p-3 duration-300 animate-in fade-in-50 slide-in-from-top-5">
                    <h5 className="text-sm font-medium">Submit Assignment</h5>
					{materialReviewExpected ? (
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
                    <div className="grid grid-cols-2 items-end gap-4">
                        {formData?.pending?.lh || formData?.pending?.rh ? (
                            <>
                                <QtyInput name="lh" />
                                <QtyInput name="rh" />
                            </>
                        ) : (
                            <>
                                <QtyInput name="qty" />
								<div />
                            </>
                        )}
                        <div className="col-span-2">
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
                                            control={form.control}
                                            name="note"
                                        />
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                        <SubmitButton
                            isSubmitting={createSubmit.isExecuting}
							disabled={createSubmit.isExecuting || !form.formState.isValid}
                        >
                            Submit
                        </SubmitButton>
                        <Button
                            variant="outline"
                            onClick={(e) => {
                                ctx.setOpenSubmitForm(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
function QtyInput({
    className,
    name,
    // label,
    ...props
}: Omit<NumericFormatProps, "value" | "onChange"> & {
    name: "lh" | "rh" | "qty";
    // label: string;
}) {
    const { control, getValues } = useFormContext();
    const pendingQty = getValues(`pending.${name}`);
    const {
        field: { value, onChange, onBlur },
    } = useController({
        name: `qty.${name}`,
        control,
    });
    return (
        <div className="grid gap-2">
            <Label className="flex justify-between uppercase">
                <span>
                    {name}
					{name !== "qty" ? " qty" : ""}
                </span>
				<span className="text-muted-foreground">{pendingQty || 0} pending</span>
            </Label>
            <NumberInput
                onValueChange={(e) => {
					const value = e.floatValue || null;
                    onChange(value, { shouldValidate: true });
                }}
                value={value}
                disabled={!pendingQty}
                max={2}
                className=""
                suffix={`/${pendingQty}`}
                {...props}
            />
        </div>
    );
}
