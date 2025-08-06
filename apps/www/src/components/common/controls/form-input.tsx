import { InputHTMLAttributes } from "react";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn } from "@/lib/utils";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import { Textarea } from "@gnd/ui/textarea";
import { NumericFormat, NumericFormatProps } from "react-number-format";

interface Props<T> {
    label?: string;
    placeholder?: string;
    className?: string;
    suffix?: string;
    type?: string;
    list?: boolean;
    size?: "sm" | "default" | "xs";
    prefix?: string;
    tabIndex?;
    uppercase?: boolean;
    inputProps?: InputHTMLAttributes<HTMLInputElement>;
    numericProps?: NumericFormatProps;
    // defaultValue?:boolean
}
export default function FormInput<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TOptionType = any,
>({
    label,
    placeholder,
    className,
    suffix,
    type,
    list,
    prefix,
    uppercase,
    tabIndex,
    size = "default",
    inputProps,
    numericProps,
    ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
    const load = useDataSkeleton();
    return (
        <FormField
            {...(props as any)}
            render={({ field, fieldState }) => (
                <FormItem
                    className={cn(
                        className,
                        props.disabled && "text-muted-foreground",
                        "mx-1",
                    )}
                >
                    {label && (
                        <FormLabel
                            className={cn(fieldState.error && "border-red-400")}
                        >
                            {label}
                        </FormLabel>
                    )}
                    <FormControl {...inputProps}>
                        {load?.loading ? (
                            <Skeleton className="h-8 w-full" />
                        ) : numericProps ? (
                            <div className="relative font-mono">
                                <NumericFormat
                                    customInput={Input}
                                    value={field.value}
                                    {...numericProps}
                                    onValueChange={(e) => {
                                        field.onChange(e.floatValue);
                                    }}
                                />
                            </div>
                        ) : (
                            <div
                                className={cn(
                                    (suffix || prefix) &&
                                        "flex items-center space-x-1",
                                    "",
                                )}
                            >
                                {prefix && (
                                    <div
                                        className={cn(
                                            size == "sm" && "",
                                            "sbg-muted-foreground/50 h-full px-1 text-sm",
                                        )}
                                    >
                                        {prefix}
                                    </div>
                                )}
                                {type == "textarea" ? (
                                    <Textarea
                                        tabIndex={tabIndex}
                                        placeholder={placeholder}
                                        className={cn(
                                            fieldState.error &&
                                                "border-red-400",
                                        )}
                                        {...(list
                                            ? {
                                                  defaultValue: field.value,
                                                  onChange: field.onChange,
                                              }
                                            : field)}
                                        // value={""}
                                    />
                                ) : (
                                    <Input
                                        tabIndex={tabIndex}
                                        type={type}
                                        placeholder={placeholder}
                                        // {...field}
                                        // value={""}
                                        {...inputProps}
                                        className={cn(
                                            uppercase && "uppercase",
                                            fieldState.error &&
                                                "border-red-400",
                                            size == "sm" && "h-8",
                                        )}
                                        {...(list
                                            ? {
                                                  defaultValue: field.value,
                                                  //   onChange: field.onChange,
                                              }
                                            : field)}
                                        // onChange={field.onChange}
                                        // defaultValue={field.value}
                                        onChange={(e) => {
                                            if (type == "number")
                                                e.target.value
                                                    ? field.onChange(
                                                          e.target.value
                                                              ? Number(
                                                                    e.target
                                                                        .value,
                                                                )
                                                              : "",
                                                      )
                                                    : field.onChange(null);
                                            else field.onChange(e);
                                        }}
                                    />
                                )}
                                {suffix && (
                                    <Button
                                        type="button"
                                        size={size as any}
                                        variant={"outline"}
                                        className={size == "sm" && "h-8"}
                                    >
                                        {suffix}
                                    </Button>
                                )}
                            </div>
                        )}
                    </FormControl>
                </FormItem>
            )}
        />
    );
}
