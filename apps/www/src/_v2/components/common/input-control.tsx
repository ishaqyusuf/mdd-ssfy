import { cn } from "@/lib/utils";
import { FieldPath, useFormContext } from "react-hook-form";

import { Checkbox } from "@gnd/ui/checkbox";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "@gnd/ui/form";
import { Input, InputProps } from "@gnd/ui/input";
import { Switch } from "@gnd/ui/switch";

interface Props<T> extends InputProps {
    // @ts-ignore
    name: FieldPath<T>;
    placeholder?;
    label?;
    check?: boolean;
    switchInput?: boolean;
    inline?: boolean;
    description?: boolean;
}
export default function InputControl<T>({
    name,
    placeholder,
    className,
    switchInput,
    label,
    description,
    check,
    inline,
    ...props
}: Props<T>) {
    const form = useFormContext();

    return (
        <FormField
            name={name}
            control={form.control}
            render={({ field }) => (
                <FormItem
                    className={cn(
                        (inline || check) &&
                            "flex items-start space-x-3 space-y-0",
                    )}
                >
                    {label && !check && <FormLabel>{label}</FormLabel>}
                    <FormControl>
                        {switchInput ? (
                            <Switch
                                checked={field.value as any}
                                onCheckedChange={field.onChange}
                            />
                        ) : check ? (
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        ) : (
                            <Input
                                {...props}
                                className={cn(className)}
                                {...field}
                            />
                        )}
                    </FormControl>
                    {check && label && (
                        <div className="space-y-1 leading-none ">
                            <FormLabel>{label}</FormLabel>
                            {description && (
                                <FormDescription>{description}</FormDescription>
                            )}
                        </div>
                    )}
                </FormItem>
            )}
        />
    );
}
