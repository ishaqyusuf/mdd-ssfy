import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Field, Select } from "../composite";

interface Props<T> {
  label?: string;
  placeholder?: string;
  description?;
  options?: { label?: string; value?: string }[];
  Item: ({ value, item, selected }) => any;
  fieldProps: {
    orientation: "horizontal" | "vertical" | "responsive";
  };
}
export function SelectField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>(props: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
  return (
    <Controller
      name={props.name}
      control={props.control}
      render={({ field, fieldState }) => (
        <Field
          orientation={props.fieldProps?.orientation || "vertical"}
          data-invalid={fieldState.invalid}
        >
          {!props.label || (
            <Field.Label htmlFor={props.name}>{props.label}</Field.Label>
          )}
          {/* {props.suffix || props.prefix ? ( */}
          <Select
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
          >
            <Select.Trigger
              id={props.name}
              aria-invalid={fieldState.invalid}
              className="min-w-[120px]"
            >
              <Select.Value placeholder={props.placeholder} />
            </Select.Trigger>
            <Select.Content position="item-aligned">
              {/* <Select.Item value="auto">Auto</Select.Item> */}
              {/* <Select.Separator /> */}
              {props.options.map((option) =>
                props.Item ? (
                  <props.Item
                    selected={option.value === field.value}
                    item={option}
                    value={field.value}
                  />
                ) : (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                )
              )}
            </Select.Content>
          </Select>
          {!props.description || (
            <Field.Description>{props.description}</Field.Description>
          )}
          {fieldState.invalid && <Field.Error errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
