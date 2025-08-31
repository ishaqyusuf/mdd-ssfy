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

interface FlatRateFormProps {
    form: UseFormReturn<ShippingCalculationFormData>;
}

export function FlatRateForm({ form }: FlatRateFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const mutation = useMutation(
        trpc.inventories.shipping.saveFlatRate.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey:
                        trpc.inventories.shipping.getShippingConfig.queryKey(),
                });
            },
        }),
    );

    const onSubmit = (data: ShippingCalculationFormData) => {
        mutation.mutate(data.flatRate);
    };

    return (
        <AccordionItem value="flat-rate">
            <AccordionTrigger>Flat Rate Shipping</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="flatRate.enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                        Enable Flat Rate
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
                        name="flatRate.rate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rate</FormLabel>
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
                        Save Flat Rate Settings
                    </SubmitButton>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

