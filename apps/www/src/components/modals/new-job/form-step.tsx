import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { StepTitle } from "./step-title";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Building2, CheckCircle2, Home, User } from "lucide-react";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useZodForm } from "@/hooks/use-zod-form";
import { JobFormSchema, jobFormShema } from "@community/schema";
import { Controller, useFieldArray } from "react-hook-form";
import { handleNumberInput, percentageValue, sum } from "@gnd/utils";
import { Card, Field, InputGroup, Item } from "@gnd/ui/namespace";
import { Checkbox } from "@gnd/ui/checkbox";
import Portal from "@gnd/ui/custom/portal";
import { useJobFormContext } from "@/contexts/job-form-context";
import { cn } from "@/lib/utils";
import { AdminJobFormContent } from "./admin-job-form-content";
import { InstallTasksList } from "./install-tasks-list";
import { JobSubmitButton } from "./job-submit-button";

export function FormStep({}) {
    const { setParams, ...params } = useJobFormParams();
    const { defaultValues, markAsComplete, setMarkAsComplete } =
        useJobFormContext();
    if (!defaultValues) return null;
    return (
        <>
            <StepTitle title="Configure Job Details" />
            <FormContent />
        </>
    );
}
function FormContent() {
    const { defaultValues, markAsComplete, setMarkAsComplete } =
        useJobFormContext();
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
    const addonPercentage = defaultValues.job?.meta?.addonPercent || 0;
    const addonValue = percentageValue(
        defaultValues.unit?.projectAddon,
        addonPercentage,
    );

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
                    {params.taskId === -1 ? null : (
                        <div className="space-y-2">
                            <Controller
                                control={form.control}
                                name="job.isCustom"
                                render={({ field }) => (
                                    <Field orientation="horizontal">
                                        <Checkbox
                                            disabled={params.taskId === -1}
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
                    )}
                    {isCustomTask || params.taskId == -1 ? (
                        /* Custom Task Form */
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Controller
                                    control={form.control}
                                    name="job.description"
                                    render={({ field, fieldState }) => (
                                        <Field>
                                            <Field.Label>
                                                Job Description
                                            </Field.Label>
                                            <InputGroup
                                                className={cn(
                                                    fieldState.error &&
                                                        "border-destructive",
                                                )}
                                            >
                                                <InputGroup.TextArea
                                                    {...field}
                                                    className={cn(
                                                        "min-h-[100px] resize-none",
                                                    )}
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
                                    render={({ field, fieldState }) => (
                                        <Field>
                                            <Field.Label>
                                                Total Cost
                                            </Field.Label>
                                            <InputGroup
                                                className={cn(
                                                    fieldState.error &&
                                                        "border-destructive",
                                                )}
                                            >
                                                <InputGroup.Addon>
                                                    <span className="text-muted-foreground">
                                                        $
                                                    </span>
                                                </InputGroup.Addon>
                                                <InputGroup.Input
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            handleNumberInput(
                                                                e.target.value,
                                                            ),
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

                            <InstallTasksList form={form} />

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
                    <Item variant="outline">
                        <Item.Content>
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="finder-pref-9k2-sync-folders-nep"
                                    checked={markAsComplete}
                                    onCheckedChange={(e) =>
                                        setMarkAsComplete(!!e)
                                    }
                                />
                                <Field.Content>
                                    <Field.Label htmlFor="finder-pref-9k2-sync-folders-nep">
                                        Mark job as completed.
                                    </Field.Label>
                                    <Field.Description>
                                        This will set the job status to
                                        completed
                                    </Field.Description>
                                </Field.Content>
                            </Field>
                        </Item.Content>
                    </Item>
                </div>
            </div>
            <Portal nodeId={"jobActionButton"}>
                {/* @ts-ignore */}
                <JobSubmitButton form={form} />
            </Portal>
        </>
    );
}

