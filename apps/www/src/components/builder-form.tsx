import { useBuilderParams } from "@/hooks/use-builder-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { builderFormSchema } from "@community/schema";
import { Button } from "@gnd/ui/button";
import { InputField } from "@gnd/ui/controls-2/input-field";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useFieldArray } from "react-hook-form";
import FormInput from "./common/controls/form-input";
import { DataTable as BuilderFormTasksTable } from "./tables-2/builder-form-tasks/data-table";

interface BuilderFormProps {
    defaultValues?: RouterOutputs["community"]["getBuilderForm"];
    children?;
}
export function BuilderForm(props: BuilderFormProps) {
    const form = useZodForm(builderFormSchema, {
        defaultValues: {
            name: "",
            address: "",
            tasks: [],
        },
    });
    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: "tasks",
        keyName: "_id",
    });

    useEffect(() => {
        if (props.defaultValues) {
            form.reset(props.defaultValues);
        }
    }, [form, props.defaultValues]);
    const taskRows = useMemo(
        () =>
            fields.map((field, index) => ({
                fieldId: field._id,
                index,
                taskId: field.id ?? null,
            })),
        [fields],
    );
    if (props.defaultValues?.isLegacy) return <UpgradeRequiredNotice />;
    return (
        <Form {...form}>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-3">
                    <InputField
                        control={form.control}
                        name="name"
                        label="Builder Name"
                    />
                    <FormInput
                        control={form.control}
                        name="address"
                        label="Address"
                        type="textarea"
                    />
                </div>
                <Separator />
                <div className="space-y-3">
                    <BuilderFormTasksTable
                        control={form.control}
                        data={taskRows}
                        onRemoveTask={remove}
                    />
                    <Button
                        type="button"
                        onClick={() => {
                            append({
                                taskName: "",
                                addonPercentage: null,
                                billable: false,
                                installable: false,
                                productionable: false,
                            });
                        }}
                        className="w-full"
                    >
                        <Icons.add className="mr-2 size-4" />
                        Add
                    </Button>
                </div>
                {props.children}
            </div>
        </Form>
    );
}

function UpgradeRequiredNotice() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { openBuilderId: builderId } = useBuilderParams();
    const onClose = () => {};

    const { mutate: handleLegacyUpdate, isPending: isUpgrading } = useMutation(
        trpc.community.upgradeBuilderToV2.mutationOptions({
            onSuccess() {
                if (!builderId) return;

                // Optionally, you can add a success message or refresh the data here
                queryClient.invalidateQueries({
                    queryKey: trpc.community.getBuilderForm.queryKey({
                        builderId,
                    }),
                });
            },
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-card">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-6">
                <Icons.AlertTriangle size={40} strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2">
                Legacy Configuration Detected
            </h3>
            <p className="text-muted-foreground max-w-md mb-8">
                This builder is currently using the old task configuration
                system (v1). To edit details and enable new features like
                granular pricing and automated invoicing, you must upgrade to
                the new system (v2).
            </p>

            <div className="flex flex-col gap-3 w-full max-w-sm">
                <SubmitButton
                    type="button"
                    isSubmitting={isUpgrading}
                    onClick={(e) => {
                        if (!builderId) return;

                        handleLegacyUpdate({ builderId });
                    }}
                    size="lg"
                    className=""
                    // className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                    <div className="flex gap-4">
                        <Icons.RefreshCw size={20} />
                        <span> Auto-Update to New System</span>
                    </div>
                </SubmitButton>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 text-muted-foreground hover:text-foreground font-semibold text-sm hover:bg-muted rounded-lg transition-colors"
                >
                    Cancel and Go Back
                </button>
            </div>
        </div>
    );
}
