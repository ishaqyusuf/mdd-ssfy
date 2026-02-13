import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { StepTitle } from "./step-title";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Building2, CheckCircle2, Home, User } from "lucide-react";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useZodForm } from "@/hooks/use-zod-form";
import { jobFormShema } from "@community/schema";
import { Controller, useFieldArray } from "react-hook-form";
import { handleNumberInput, percentageValue, sum } from "@gnd/utils";
import { Field, InputGroup } from "@gnd/ui/composite";
import { useEffect, useMemo } from "react";
import { Checkbox } from "@gnd/ui/checkbox";
import NumberFlow from "@number-flow/react";
import Portal from "@gnd/ui/custom/portal";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useJobFormContext } from "@/contexts/job-form-context";
import { useJobRole } from "@/hooks/use-job-role";
import { cn } from "@/lib/utils";
import { AdminJobFormContent } from "./admin-job-form-content";

export function FormStep({}) {
    const { setParams, ...params } = useJobFormParams();

    return (
        <>
            <StepTitle title="Configure Job Details" />
            <FormContent />
        </>
    );
}
function FormContent() {
    const { defaultValues } = useJobFormContext();
    const { ...params } = useJobFormParams();
    const form = useZodForm(jobFormShema, {
        defaultValues: {
            ...((defaultValues as any) || {}),
            unit: {
                id: params.unitId,
            },
            user: {
                id: params.userId,
            },
        },
    });
    if (!defaultValues) return null;

    //
    const maxPotentialValue =
        defaultValues.job.tasks?.reduce(
            (sum, task) => sum + (task.rate || 0) * (task.maxQty || 0),
            0,
        ) || 0;
    const builderTaskQuantities =
        defaultValues.job.tasks?.reduce(
            (acc, task) => {
                acc[task.id] = task.qty || 0;
                return acc;
            },
            {} as Record<number, number>,
        ) || 0;
    const addonPercentage = defaultValues.unit?.addonPercentage || 0;
    const addonValue = percentageValue(
        defaultValues.unit?.projectAddon,
        addonPercentage,
    );
    const jobRole = useJobRole();
    const isCustomTask = form.watch("job.isCustom");
    const jobTasks = form.watch("job.tasks");
    // const { fields: jobTasks } = useFieldArray({
    //     control: form.control,
    //     name: "job.tasks",
    // });
    const [additionalCost, isCustom] = form.watch([
        "job.meta.additional_cost",
        "job.isCustom",
    ]);
    const tasksSubTotal = sum(
        jobTasks?.map((task) => (task.rate || 0) * (task.qty || 0)),
    );
    const total = sum([
        tasksSubTotal,
        addonValue,
        isCustom ? additionalCost || 0 : 0,
    ]);
    // const estimates = useMemo(() => {
    //     // console.log({ tasksSubTotal, addonPercentage, addonValue });
    //     // const addonValue = percentageValue(tasksSubTotal, addonPercentage);
    //     return {
    //         tasksSubTotal,
    //         addonValue,
    //         total: sum([
    //             tasksSubTotal,
    //             addonValue,
    //             isCustom ? additionalCost || 0 : 0,
    //         ]),
    //     };
    // }, [jobTasks, addonValue, additionalCost, isCustom]);
    return (
        <>
            <div className="space-y-6 h-full flex flex-col">
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
                        <User className="size-3" />{" "}
                        {defaultValues?.user?.name || "Unknown User"}
                    </span>
                    <span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
                        <Building2 className="size-3" />{" "}
                        {defaultValues?.unit?.projectTitle || "Unknown Project"}
                    </span>
                    <span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
                        <Home className="size-3" />
                        {`${defaultValues?.unit?.modelName} ${defaultValues?.unit?.lotBlock}`}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    <div className="space-y-2">
                        <Controller
                            control={form.control}
                            name="job.isCustom"
                            render={({ field }) => (
                                <Field orientation="horizontal">
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="isCustomTask"
                                    />
                                    <Field.Content>
                                        <Field.Label htmlFor="isCustomTask">
                                            Is this a custom task?
                                        </Field.Label>
                                        <Field.Description>
                                            Custom tasks are not based on
                                            builder templates and require a
                                            manual cost input.
                                        </Field.Description>
                                    </Field.Content>
                                </Field>
                            )}
                        />
                    </div>
                    {isCustomTask ? (
                        /* Custom Task Form */
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Controller
                                    control={form.control}
                                    name="job.description"
                                    render={({ field }) => (
                                        <Field>
                                            <Field.Label>
                                                Job Description
                                            </Field.Label>
                                            <InputGroup>
                                                <InputGroup.TextArea
                                                    {...field}
                                                    className="min-h-[100px] resize-none"
                                                    placeholder="Additional instructions for the custom task..."
                                                />
                                            </InputGroup>
                                        </Field>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Controller
                                    control={form.control}
                                    name="job.meta.additional_cost"
                                    render={({ field }) => (
                                        <Field>
                                            <Field.Label>
                                                Total Cost
                                            </Field.Label>
                                            <InputGroup>
                                                <InputGroup.Addon>
                                                    <span className="text-muted-foreground">
                                                        $
                                                    </span>
                                                </InputGroup.Addon>
                                                <InputGroup.Input
                                                    {...field}
                                                    onChange={(e) =>
                                                        handleNumberInput(
                                                            e.target.value,
                                                        )
                                                    }
                                                    type="number"
                                                />
                                            </InputGroup>
                                        </Field>
                                    )}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Builder Task Form */
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Total Estimate Block */}
                            <AdminJobFormContent>
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">
                                            Total Install Estimate
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Calculated based on max quantities
                                        </span>
                                    </div>
                                    <div className="text-2xl font-black text-primary">
                                        ${maxPotentialValue.toFixed(2)}
                                    </div>
                                </div>
                            </AdminJobFormContent>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-foreground">
                                    Install Costs
                                </h3>
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Item
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Rate
                                                </th>
                                                <th className="px-4 py-3 w-28 text-center">
                                                    Qty
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {defaultValues?.job?.tasks?.map(
                                                (cost, index) => {
                                                    const maxQty =
                                                        cost.maxQty || 0;

                                                    return (
                                                        <Controller
                                                            control={
                                                                form.control
                                                            }
                                                            name={`job.tasks.${index}.qty`}
                                                            key={index}
                                                            render={({
                                                                field: {
                                                                    onChange,
                                                                    value,
                                                                },
                                                            }) => (
                                                                <tr className="bg-card">
                                                                    <td className="px-4 py-3 font-medium text-foreground uppercase">
                                                                        {
                                                                            cost
                                                                                .installCostModel
                                                                                .title
                                                                        }
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-muted-foreground">
                                                                        $
                                                                        {cost.rate.toFixed(
                                                                            2,
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        <InputGroup>
                                                                            <InputGroup.Input
                                                                                type="number"
                                                                                className="w-full bg-transparent text-center font-bold text-foreground outline-none p-0 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                                                                value={
                                                                                    value ||
                                                                                    ""
                                                                                }
                                                                                min={
                                                                                    0
                                                                                }
                                                                                max={
                                                                                    jobRole.isAdmin
                                                                                        ? maxQty
                                                                                        : undefined
                                                                                }
                                                                                disabled={
                                                                                    maxQty ===
                                                                                    0
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) => {
                                                                                    onChange(
                                                                                        Number(
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        ),
                                                                                    );
                                                                                }}
                                                                                placeholder="0"
                                                                            />
                                                                            <AdminJobFormContent>
                                                                                <InputGroup.Addon align="inline-end">
                                                                                    <span className="text-muted-foreground">
                                                                                        {` / ${maxQty} `}
                                                                                    </span>
                                                                                </InputGroup.Addon>
                                                                            </AdminJobFormContent>
                                                                        </InputGroup>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold">
                                                                        <NumberFlow
                                                                            prefix="$"
                                                                            value={
                                                                                +(
                                                                                    (cost.rate ||
                                                                                        0) *
                                                                                        +value ||
                                                                                    0
                                                                                ).toFixed(
                                                                                    2,
                                                                                )
                                                                            }
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        />
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">
                                    Job Description
                                </label>
                                <textarea
                                    className="w-full p-4 bg-background border border-border rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-primary outline-none resize-none"
                                    placeholder="Additional instructions for the builder task..."
                                    value={jobDescription}
                                    onChange={(e) =>
                                        setJobDescription(e.target.value)
                                    }
                                />
                            </div> */}

                            {/* Totals Section */}
                            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Subtotal
                                    </span>
                                    <span className="font-bold text-foreground">
                                        ${tasksSubTotal}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Add-on ({addonPercentage}%){" "}
                                        <span className="text-[10px] bg-muted px-1 rounded border border-border">
                                            Read Only
                                        </span>
                                    </span>
                                    <span className="font-bold text-foreground">
                                        ${addonValue}
                                    </span>
                                </div>
                                <div className="h-px bg-border my-1" />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-foreground uppercase text-xs">
                                        Grand Total
                                    </span>
                                    <span className="font-black text-xl text-primary">
                                        ${total}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Portal nodeId={"jobActionButton"}>
                <form
                    {...form}
                    onSubmit={form.handleSubmit(
                        (values) => {
                            console.log("Form Submitted with values:", values);
                            console.log("default values", defaultValues);
                            // Here you would typically call a mutation to save the job details
                            // For example: trpc.community.updateJob.mutate(values)
                            // setParams({
                            //     step: 3, // Move to the next step, e.g., review/confirm
                            // });
                        },
                        (e) => {
                            console.log("Form Errors:", e);
                            console.log("default values", defaultValues.unit);
                        },
                    )}
                >
                    <SubmitButton className="">
                        <div className="flex gap-2 items-center">
                            <CheckCircle2 className="size-4" />
                            <span>Submit</span>
                        </div>
                    </SubmitButton>
                </form>
            </Portal>
        </>
    );
}

