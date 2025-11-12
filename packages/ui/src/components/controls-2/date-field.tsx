import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Field, InputGroup, Popover } from "../composite";
import { Calendar } from "../calendar";
import { useState } from "react";
import { Button } from "../button";
import { cn } from "../../utils";
import { CalendarIcon } from "lucide-react";
import { formatDate } from "date-fns";

interface Props<T> {
  label?: string;
  placeholder?: string;
  prefix?;
  description?;
  suffix?;
  calendarProps?: React.ComponentProps<typeof Calendar>;
  fieldProps?: {
    orientation?: "horizontal" | "vertical" | "responsive";
  };
  dateFormat?: DateFormats;
}
export type DateFormats =
  | "DD/MM/YY"
  | "MM/DD/YY"
  | "YYYY-MM-DD"
  | "MMM DD, YYYY"
  | "YYYY-MM-DD HH:mm:ss"
  | "YYYY-MM-DD HH:mm"
  | any;
export function DateField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>(
  props: Pick<
    Partial<ControllerProps<TFieldValues, TName>>,
    "control" | "name" | "defaultValue" | "disabled"
  > &
    Props<TOptionType>
) {
  let { control, name, fieldProps, disabled, defaultValue } = props;
  if (!fieldProps) fieldProps = {};
  if (!fieldProps.orientation) fieldProps.orientation = "vertical";

  const [open, setOpen] = useState(false);
  const controlProps = { control, name, disabled };
  const Label = !props.label || (
    <Field.Label htmlFor={props.name}>{props.label}</Field.Label>
  );
  const Description = !props.description || (
    <Field.Description>{props.description}</Field.Description>
  );
  const Error = ({ fieldState }) =>
    fieldState.invalid && <Field.Error errors={[fieldState.error]} />;

  return (
    <Controller
      {...controlProps}
      render={({ field, fieldState }) => (
        <Field
          defaultValue={defaultValue}
          {...fieldProps}
          data-invalid={fieldState.invalid}
        >
          {fieldProps?.orientation === "vertical" ? (
            <>{Label}</>
          ) : (
            <Field.Content>
              {Label}
              {Description}
              <Error fieldState={fieldState} />
            </Field.Content>
          )}

          {/* {props.suffix || props.prefix ? ( */}
          <Popover open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "pl-3 text-left font-normal",
                  !field.value && "text-muted-foreground"
                  // size == "sm" && "h-8"
                )}
              >
                {field.value ? (
                  // format(field.value, props.dateFormat)
                  formatDate(field.value, props.dateFormat)
                ) : (
                  <span>{props.placeholder || "Pick a date"}</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </Popover.Trigger>
            <Popover.Content className="w-auto p-0" align="start">
              <Calendar
                {...(props?.calendarProps || {})}
                selected={field.value}
                disabled={(date) => date < new Date("1900-01-01")}
                initialFocus
                mode="single"
                onSelect={(e) => {
                  field.onChange(e);
                  setOpen(false);
                }}
              />
            </Popover.Content>
          </Popover>
          {/* ) : (
            <Input
              {...field}
              id={props.name}
              aria-invalid={fieldState.invalid}
              placeholder={props.placeholder}
              //   autoComplete="off"
            />
          )} */}

          {fieldProps?.orientation === "vertical" ? (
            <>
              {Description} <Error fieldState={fieldState} />
            </>
          ) : undefined}
        </Field>
      )}
    />
  );
}
