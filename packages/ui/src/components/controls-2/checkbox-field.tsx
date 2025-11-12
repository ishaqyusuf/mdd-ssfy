import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Field, InputGroup } from "../composite";
import { Input } from "../input";
import { Checkbox } from "../checkbox";

interface Props<T> {
  legend?: string;
  legendDescription?;
  label?: string;
  placeholder?: string;
  prefix?;
  description?;
  suffix?;
  fieldProps?: {
    orientation?: "horizontal" | "vertical" | "responsive";
  };
}
export function CheckboxField<
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
  const controlProps = { control, name, disabled };
  const Label = !props.label || <Field.Legend>{props.legend}</Field.Legend>;
  const Description = !props.legendDescription || (
    <Field.Description>{props.legendDescription}</Field.Description>
  );
  const Error = ({ fieldState }) =>
    fieldState.invalid && <Field.Error errors={[fieldState.error]} />;

  return (
    <Controller
      {...controlProps}
      render={({ field, fieldState }) => (
        <Field.Set data-invalid={fieldState.invalid}>
          {Label}
          {Description}
          <Field.Group data-slot="checkbox-group">
            <Field orientation="horizontal">
              <Checkbox
                disabled={disabled}
                id={`form-rhf-checkbox-${field.name}`}
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              {props.description ? (
                <Field.Content>
                  <Field.Label
                    htmlFor={`form-rhf-checkbox-${field.name}`}
                    className="font-normal"
                  >
                    {props.label}
                  </Field.Label>
                  <Field.Description>{props.description}</Field.Description>
                </Field.Content>
              ) : (
                <Field.Label
                  htmlFor={`form-rhf-checkbox-${field.name}`}
                  className="font-normal"
                >
                  {props.label}
                </Field.Label>
              )}
            </Field>
          </Field.Group>
        </Field.Set>
      )}
    />
  );
}
