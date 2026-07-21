import { cn } from "@/lib/utils";
import {
    ControllerProps,
    FieldPath,
    FieldValues,
    useFormContext,
} from "react-hook-form";

import { Checkbox } from "@gnd/ui/checkbox";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "@gnd/ui/form";
import { Switch } from "@gnd/ui/switch";
import { Label } from "@gnd/ui/label";

interface Props<T> {
    label?: string;
    description?: {
        active?: string;
        inactive?: string;
    };
    defaultDescription?: string;
    defaultSwitchLabel?: string;
    switchLabel?: {
        active?: string;
        inactive?: string;
    };
}
export default function FormSwitch<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TOptionType = any,
>({
    label,
    description,
    switchLabel,
    defaultSwitchLabel,
    defaultDescription,
    ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
    return (
        <FormField
            {...(props as any)}
            render={({ field }) => {
                const valueProps = { checked: field.value };
                const checked = !!field.value;
                return (
                    <FormItem
                        className={cn("items-starts flex-col gap-3 rounded-md")}
                    >
                        {label && <FormLabel>{label}</FormLabel>}
                        <FormControl className="">
                            <div className="flex items-center gap-3">
                                <Switch
                                    color="green"
                                    {...valueProps}
                                    onCheckedChange={field.onChange}
                                />
                                {defaultSwitchLabel || switchLabel ? (
                                    <Label className="">
                                        {checked
                                            ? switchLabel?.active ||
                                              defaultDescription
                                            : switchLabel?.inactive ||
                                              defaultSwitchLabel}
                                    </Label>
                                ) : undefined}
                            </div>
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            {description || defaultDescription ? (
                                <FormDescription>
                                    {checked
                                        ? description?.active ||
                                          defaultDescription
                                        : description?.inactive ||
                                          defaultDescription}
                                </FormDescription>
                            ) : undefined}
                        </div>
                    </FormItem>
                );
            }}
        />
    );
}
