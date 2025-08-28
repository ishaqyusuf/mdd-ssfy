import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Checkbox } from "../checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "../form";
import { Switch } from "../switch";
import { cn } from "../../utils";

interface Props<T> {
  label?: string | any;
  description?: string;
  className?: string;
  placeholder?: string;
  switchInput?: boolean;
  list?: boolean;
}
export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>({
  label,
  description,
  className,
  placeholder,
  switchInput,
  list,
  ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
  return (
    <FormField
      {...(props as any)}
      render={({ field }) => {
        const valueProps = list
          ? { defaultChecked: field.value }
          : { checked: field.value };
        return (
          <FormItem
            className={cn(
              "items-starts flex flex-row items-center space-x-3 space-y-0 rounded-md",
              className
            )}
          >
            <FormControl className="mt-0.5">
              {switchInput ? (
                <Switch
                  color="green"
                  {...valueProps}
                  onCheckedChange={field.onChange}
                />
              ) : (
                <Checkbox {...valueProps} onCheckedChange={field.onChange} />
              )}
            </FormControl>
            <div className="space-y-1 leading-none">
              {label && <FormLabel>{label}</FormLabel>}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          </FormItem>
        );
      }}
    />
  );
}
