import { useForm } from "react-hook-form";
import { SchemaBlockInputProps } from "./schema-block";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { inputSizes } from "@community/utils";

export function TemplateInputConfig(props: SchemaBlockInputProps) {
    const { input } = props;
    const form = useForm({
        defaultValues: {
            ...input,
        },
    });
    const w = form.watch();
    const onSubmit = () => {
        mutate({
            id: w.id,
            columnSize: w.columnSize,
        });
    };
    const { isPending, mutate } = useMutation(
        _trpc.community.updateCommunityBlockInput.mutationOptions({
            onSuccess(data, variables, context) {
                props.onInputUpdated(form.getValues());
            },
        }),
    );
    return (
        <div className="grid gap-4">
            <div className="space-y-2">
                <h4 className="leading-none font-medium">Input Config</h4>
                <p className="text-muted-foreground text-sm">
                    update how you interface with {`${input.title}`}
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
                    <div className="flex justify-end">
                        <SubmitButton isSubmitting={isPending}>
                            Save
                        </SubmitButton>
                    </div>
                </form>
            </Form>
        </div>
    );
}

