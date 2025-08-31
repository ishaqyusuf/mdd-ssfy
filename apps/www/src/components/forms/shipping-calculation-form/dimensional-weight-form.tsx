import { UseFormReturn } from "react-hook-form";
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
import { SubmitButton } from "@/components/submit-button";

interface DimensionalWeightFormProps {
    form: UseFormReturn<ShippingCalculationFormData>;
}

export function DimensionalWeightForm({ form }: DimensionalWeightFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const mutation = useMutation(
        trpc.inventories.shipping.saveDimensionalWeight.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey:
                        trpc.inventories.shipping.getShippingConfig.queryKey(),
                });
            },
        }),
    );

    const onSubmit = (data: ShippingCalculationFormData) => {
        mutation.mutate(data.dimensionalWeight);
    };

    return (
        <AccordionItem value="dimensional-weight">
            <AccordionTrigger>
                Dimensional Weight (DIM) Shipping
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="dimensionalWeight.enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                        Enable Dimensional Weight
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
                        name="dimensionalWeight.divisor"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Divisor</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dimensionalWeight.baseFee"
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
                    <SubmitButton
                        onClick={form.handleSubmit(onSubmit)}
                        isSubmitting={mutation.isPending}
                    >
                        Save Dimensional Weight Settings
                    </SubmitButton>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

