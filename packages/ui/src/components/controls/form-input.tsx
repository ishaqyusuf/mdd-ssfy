import { Fragment, InputHTMLAttributes, useState } from "react";

import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Skeleton } from "@gnd/ui/skeleton";
import { Textarea } from "@gnd/ui/textarea";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { QuantityInput, type QtyInputProps } from "@gnd/ui/quantity-input";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn } from "../../utils";
import { Eye, EyeOff } from "lucide-react";
interface Props<T> {
  label?: string;
  placeholder?: string;
  className?: string;
  suffix?: string;
  type?: string;
  list?: boolean;
  size?: "sm" | "default" | "xs";
  prefix?: string;
  tabIndex?: any;
  uppercase?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  numericProps?: NumericFormatProps;
  qtyInputProps?: QtyInputProps;
  mask?: boolean;
  PrefixIcon?: any;
}
export function FormInput<
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
  qtyInputProps,
  mask,
  PrefixIcon,
  ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
  const load = useDataSkeleton();

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type == "password";

  return (
    <FormField
      {...(props as any)}
      render={({ field, fieldState }) => {
        return (
          <FormItem
            className={cn(
              className,
              props.disabled && "text-muted-foreground",
              "mx-1"
            )}
          >
            {label && (
              <FormLabel className={cn(fieldState.error && "border-red-400")}>
                {label}
              </FormLabel>
            )}
            <FormControl
              {...inputProps}
              className={cn("relative", inputProps?.className)}
            >
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
              ) : qtyInputProps ? (
                <>
                  {/* <QuantityInput
                    onChange={field.onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      setIsFocused(false);
                      field.onBlur();
                    }}
                    value={field.value}
                    className={cn()}
                    {...qtyInputProps}
                  /> */}
                  {mask && !field.value && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={cn(
                    "relative",
                    (suffix || prefix) && "flex items-center space-x-1",
                    ""
                  )}
                >
                  {!PrefixIcon || (
                    <PrefixIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  )}
                  {prefix && (
                    <div
                      className={cn(
                        size == "sm" && "",
                        "sbg-muted-foreground/50 h-full px-1 text-sm"
                      )}
                    >
                      {prefix}
                    </div>
                  )}
                  {type == "textarea" ? (
                    <Textarea
                      tabIndex={tabIndex}
                      placeholder={placeholder}
                      className={cn(fieldState.error && "border-red-400")}
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
                      type={
                        !isPassword ? type : showPassword ? "text" : "password"
                      }
                      placeholder={placeholder}
                      // {...field}
                      // value={""}
                      {...inputProps}
                      className={cn(
                        uppercase && "uppercase",
                        fieldState.error && "border-red-400",
                        size == "sm" && "h-8",
                        !PrefixIcon || "pl-10"
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
                                e.target.value ? Number(e.target.value) : ""
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
                      className={cn(size == "sm" && "h-8")}
                    >
                      {suffix}
                    </Button>
                  )}
                  {!isPassword || (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </FormControl>
          </FormItem>
        );
      }}
    />
  );
}
