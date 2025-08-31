import { UseFormReturn, useFieldArray } from "react-hook-form";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Switch } from "@gnd/ui/switch";
import { Button } from "@gnd/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShippingCalculationFormData } from "@sales/shipping";
import { TrashIcon } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

interface WeightBasedFormProps {
    form: UseFormReturn<ShippingCalculationFormData>;
}

export function WeightBasedForm({ form }: WeightBasedFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "weightBased.rates",
    });

    const mutation = useMutation(
        trpc.inventories.shipping.saveWeightBased.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey:
                        trpc.inventories.shipping.getShippingConfig.queryKey(),
                });
            },
        }),
    );

    const onSubmit = (data: ShippingCalculationFormData) => {
        mutation.mutate(data.weightBased);
    };

    return (
        <AccordionItem value="weight-based">
            <AccordionTrigger>Weight-Based Shipping</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="weightBased.enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                        Enable Weight-Based
                                    </FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="weightBased.baseFee"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Base Fee</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-2">
                        <FormLabel>Weight Rates</FormLabel>
                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="flex items-center gap-2 p-2 border rounded-md"
                            >
                                <FormField
                                    control={form.control}
                                    name={`weightBased.rates.${index}.fromWeight`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            placeholder="From Weight"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`weightBased.rates.${index}.toWeight`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            placeholder="To Weight"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`weightBased.rates.${index}.ratePerUnit`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            placeholder="Rate per Unit"
                                            {...field}
                                        />
                                    )}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                append({
                                    fromWeight: 0,
                                    toWeight: 0,
                                    ratePerUnit: 0,
                                })
                            }
                        >
                            Add Rate
                        </Button>
                    </div>

                    <SubmitButton
                        onClick={form.handleSubmit(onSubmit)}
                        isSubmitting={mutation.isPending}
                    >
                        Save Weight-Based Settings
                    </SubmitButton>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

