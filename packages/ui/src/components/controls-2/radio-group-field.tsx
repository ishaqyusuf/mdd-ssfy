import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Field } from "../composite";
import { FieldSet } from "../field";
import { RadioGroup, RadioGroupItem } from "../radio-group";
import { cn } from "../../utils";

interface Props<T> {
  label?: string;
  description?;
  className?;
  options?: { title?: string; id?: string; description?: string }[];
  Item: ({ value, item, selected }) => any;
}
export function RadioGroupField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>(props: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
  const Label = !props.label || <Field.Legend>{props.label}</Field.Legend>;
  const Description = !props.description || (
    <Field.Description>{props.description}</Field.Description>
  );
  return (
    <Controller
      name={props.name}
      control={props.control}
      render={({ field, fieldState }) => (
        <FieldSet
          //   orientation={props.fieldProps?.orientation || "vertical"}
          data-invalid={fieldState.invalid}
        >
          {Label}
          {Description}
          {/* {props.suffix || props.prefix ? ( */}
          <RadioGroup
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            aria-invalid={fieldState.invalid}
            className={cn(props?.className)}
          >
            {/* <Select.Item value="auto">Auto</Select.Item> */}
            {/* <Select.Separator /> */}
            {props.options.map((option) =>
              props.Item ? (
                <props.Item
                  selected={option.id === field.value}
                  item={option}
                  value={field.value}
                />
              ) : (
                <Field.Label
                  htmlFor={`form-rhf-radiogroup-${option.id}`}
                  key={option.id}
                >
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <Field.Content>
                      <Field.Title>{option.title}</Field.Title>
                      <Field.Description>
                        {option.description}
                      </Field.Description>
                    </Field.Content>
                    <RadioGroupItem
                      value={option.id}
                      id={`form-rhf-radiogroup-${option.id}`}
                      aria-invalid={fieldState.invalid}
                    />
                  </Field>
                </Field.Label>
              )
            )}
          </RadioGroup>
          {fieldState.invalid && <Field.Error errors={[fieldState.error]} />}
        </FieldSet>
      )}
    />
  );
}
