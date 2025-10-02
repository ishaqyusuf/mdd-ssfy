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
                <h3 className="leading-none font-medium">Input Config</h3>
                <p className="text-muted-foreground text-sm">
                    update how you interface with {`${input.inv?.name}`}
                </p>
            </div>
            <Form {...form}>
                <form
                    className="grid gap-2"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Width</Label>
                        <div className="col-span-2 border">
                            {[...Array(4)].map((a, i) => (
                                <Button
                                    type="button"
                                    key={i}
                                    onClick={(e) => {
                                        form.setValue("columnSize", i + 1);
                                    }}
                                    variant={
                                        w?.columnSize >= i + 1
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    size="sm"
                                    className=""
                                >
                                    <span>{inputSizes[i]}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
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
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Input name</Label>
                        <div className="col-span-2">
                            <FormInput
                                name="title"
                                placeholder={`change default title`}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Type</Label>
                        <div className="col-span-2 flex gap-2">
                            <FormCombobox
                                control={form.control}
                                name="inputType"
                                className="flex-1"
                                comboProps={{
                                    items: [
                                        { id: "", label: "Text", data: {} },
                                        {
                                            id: "number",
                                            label: "Number",
                                            data: {},
                                        },
                                    ],
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        {props.children}
                        <SubmitButton isSubmitting={isPending}>
                            Save
                        </SubmitButton>
                    </div>
                </form>
            </Form>
        </div>
    );
}

