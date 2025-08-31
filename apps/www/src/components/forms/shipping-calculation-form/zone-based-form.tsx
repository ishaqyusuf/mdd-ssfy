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

interface ZoneBasedFormProps {
    form: UseFormReturn<ShippingCalculationFormData>;
}

export function ZoneBasedForm({ form }: ZoneBasedFormProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "zoneBased.zones",
    });

    const mutation = useMutation(
        trpc.inventories.shipping.saveZoneBased.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey:
                        trpc.inventories.shipping.getShippingConfig.queryKey(),
                });
            },
        }),
    );

    const onSubmit = (data: ShippingCalculationFormData) => {
        mutation.mutate(data.zoneBased);
    };

    return (
        <AccordionItem value="zone-based">
            <AccordionTrigger>Zone/Location-Based Shipping</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="zoneBased.enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                        Enable Zone-Based
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
                        <FormLabel>Shipping Zones</FormLabel>
                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="space-y-2 p-4 border rounded-md relative"
                            >
                                <FormField
                                    control={form.control}
                                    name={`zoneBased.zones.${index}.name`}
                                    render={({ field }) => (
                                        <Input
                                            placeholder="Zone Name"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`zoneBased.zones.${index}.countries`}
                                    render={({ field }) => (
                                        <Input
                                            placeholder="Countries (comma-separated)"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`zoneBased.zones.${index}.states`}
                                    render={({ field }) => (
                                        <Input
                                            placeholder="States (comma-separated)"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`zoneBased.zones.${index}.zipCodes`}
                                    render={({ field }) => (
                                        <Input
                                            placeholder="ZIP Codes (comma-separated)"
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`zoneBased.zones.${index}.rate`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            placeholder="Rate"
                                            {...field}
                                        />
                                    )}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
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
                            onClick={() => append({ name: "", rate: 0 })}
                        >
                            Add Zone
                        </Button>
                    </div>

                    <SubmitButton
                        onClick={form.handleSubmit(onSubmit)}
                        isSubmitting={mutation.isPending}
                    >
                        Save Zone-Based Settings
                    </SubmitButton>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

