import { useForm } from "react-hook-form";
import { SchemaBlockInputProps } from "./block-section";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { inputSizes } from "@community/utils";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import { useTemplateSchemaBlock } from "./context";
import { labelIdOptions } from "@/lib/utils";
import { FormInput } from "@gnd/ui/controls/form-input";

export function TemplateInputAnalytics(props: SchemaBlockInputProps) {
    const { input } = props;
    const block = useTemplateSchemaBlock();
    const valueOptions = block.blockInput?.inputConfigs?.filter(
        (a) => a.uid !== input?.uid,
    );
    const form = useForm({
        defaultValues: {
            ...input,
            title: input.title || "",
        },
    });
    const w = form.watch();
    const onSubmit = () => {
        mutate({
            id: w.id,
        });
    };
    const { isPending, mutate } = useMutation(
        _trpc.community.updateCommunityBlockInputAnalytics.mutationOptions({
            onSuccess(data, variables, context) {
                props.onInputUpdated(form.getValues());
            },
        }),
    );
    return (
        <div className="grid gap-4">
            <div className="space-y-2">
                <h3 className="leading-none font-medium">Analytics</h3>
                <p className="text-muted-foreground text-sm">
                    update how you interface with {`${input.inv?.name}`}
                </p>
            </div>
            <Form {...form}>
                <form
                    className="grid gap-2"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    {/* <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Value</Label>
                        <div className="col-span-2 flex gap-2">
                            <FormCombobox
                                control={form.control}
                                name="valueUid"
                                className="flex-1"
                                comboProps={{
                                    items: [
                                        { id: "", label: "None", data: {} },
                                        ...labelIdOptions(
                                            valueOptions,
                                            "inv.name",
                                            "uid",
                                        ),
                                    ],
                                }}
                            />
                        </div>
                    </div> */}
                </form>
            </Form>
        </div>
    );
}

