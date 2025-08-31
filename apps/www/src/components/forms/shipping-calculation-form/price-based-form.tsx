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

interface PriceBasedFormProps {
    form: UseFormReturn<ShippingCalculationFormData>;
}

export function PriceBasedForm({ form }: PriceBasedFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "priceBased.rates",
    });

    const mutation = useMutation(
        trpc.inventories.shipping.savePriceBased.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey:
                        trpc.inventories.shipping.getShippingConfig.queryKey(),
                });
            },
        }),
    );

    const onSubmit = (data: ShippingCalculationFormData) => {
        mutation.mutate(data.priceBased);
    };

    return (
        <AccordionItem value="price-based">
            <AccordionTrigger>Price-Based Shipping</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="priceBased.enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                        Enable Price-Based
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

                    <div className="space-y-2">
                        <FormLabel>Price Tiers</FormLabel>
                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="flex items-center gap-2 p-2 border rounded-md"
                            >
                                <FormField
                                    control={form.control}
                                    name={`priceBased.rates.${index}.fromPrice`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            placeholder="From Price"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`priceBased.rates.${index}.toPrice`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            placeholder="To Price"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`priceBased.rates.${index}.shippingFee`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            placeholder="Shipping Fee"
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
                                    fromPrice: 0,
                                    toPrice: 0,
                                    shippingFee: 0,
                                })
                            }
                        >
                            Add Tier
                        </Button>
                    </div>

                    <SubmitButton
                        onClick={form.handleSubmit(onSubmit)}
                        isSubmitting={mutation.isPending}
                    >
                        Save Price-Based Settings
                    </SubmitButton>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

