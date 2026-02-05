import { useBuilderParams } from "@/hooks/use-builder-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { builderFormSchema } from "@community/schema";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { _qc, _trpc } from "./static-trpc";
import { InputField } from "@gnd/ui/controls-2/input-field";
import { CheckboxField } from "@gnd/ui/controls-2/checkbox-field";
import { Separator } from "@gnd/ui/separator";
import { Table } from "@gnd/ui/composite";
import { useFieldArray } from "react-hook-form";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { useEffect } from "react";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Form } from "@gnd/ui/form";

interface BuilderFormProps {
    defaultValues?: RouterOutputs["community"]["getBuilderForm"];
    children?;
}
export function BuilderForm(props: BuilderFormProps) {
    const form = useZodForm(builderFormSchema, {
        defaultValues: {
            name: "",
            adddress: "",
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
            console.log("Resetting form with:", props.defaultValues);
            form.reset(props.defaultValues);
        }
    }, [props.defaultValues]);
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
                    <InputField
                        control={form.control}
                        name="address"
                        label="Address"
                        textarea
                    />
                </div>
                <Separator />
                <Table>
                    <Table.Header>
                        <Table.Row className="bg-muted hover:bg-default">
                            {/* <Table.Head className="w-[50px]" /> */}
                            <Table.Head>Task Name</Table.Head>
                            <Table.Head>Addon %</Table.Head>
                            <Table.Head align="center">
                                <TextWithTooltip
                                    className="max-w-12"
                                    text="Billable"
                                />
                            </Table.Head>
                            <Table.Head align="center">
                                <TextWithTooltip
                                    className="max-w-12"
                                    text="Job"
                                />
                            </Table.Head>
                            <Table.Head align="center">
                                <TextWithTooltip
                                    className="max-w-12"
                                    text="Productionable"
                                />
                            </Table.Head>
                            <Table.Head></Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {fields.map((field, index) => (
                            <Table.Row key={field.id}>
                                <Table.Cell>
                                    <InputField
                                        control={form.control}
                                        name={`tasks.${index}.taskName`}
                                    />
                                </Table.Cell>
                                <Table.Cell align="center">
                                    <InputField
                                        // className="max-w-[60px]"
                                        className="w-20"
                                        control={form.control}
                                        name={`tasks.${index}.addonPercentage`}
                                        type="number"
                                        suffix="%"
                                    />
                                </Table.Cell>
                                <Table.Cell align="center">
                                    <CheckboxField
                                        control={form.control}
                                        name={`tasks.${index}.billable`}
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <CheckboxField
                                        control={form.control}
                                        name={`tasks.${index}.installable`}
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <CheckboxField
                                        control={form.control}
                                        name={`tasks.${index}.productionable`}
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <ConfirmBtn onClick={(e) => {}} trash />
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
                {props.children}
            </div>
        </Form>
    );
}

function UpgradeRequiredNotice() {
    const { openBuilderId: builderId } = useBuilderParams();
    const onClose = () => {};

    const { mutate: handleLegacyUpdate, isPending: isUpgrading } = useMutation(
        useTRPC().community.upgradeBuilderToV2.mutationOptions({
            onSuccess() {
                // Optionally, you can add a success message or refresh the data here
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getBuilderForm.queryKey({
                        builderId: builderId!,
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
                <AlertTriangle size={40} strokeWidth={2} />
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
                        handleLegacyUpdate({ builderId });
                    }}
                    size="lg"
                    className=""
                    // className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                    <div className="flex gap-4">
                        <RefreshCw size={20} />
                        <span> Auto-Update to New System</span>
                    </div>
                </SubmitButton>
                <button
                    onClick={onClose}
                    className="w-full py-3 text-muted-foreground hover:text-foreground font-semibold text-sm hover:bg-muted rounded-lg transition-colors"
                >
                    Cancel and Go Back
                </button>
            </div>
        </div>
    );
}

