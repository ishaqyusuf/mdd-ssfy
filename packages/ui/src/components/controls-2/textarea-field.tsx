import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Field, InputGroup } from "../composite";
import { Input } from "../input";

interface Props<T> {
  label?: string;
  placeholder?: string;
  prefix?;
  description?;
  suffix?;
  inputGroupProps?: React.ComponentProps<"div">;
  fieldProps?: {
    orientation?: "horizontal" | "vertical" | "responsive";
  };
}
export function TextAreaField<
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
          <InputGroup {...(props?.inputGroupProps || {})}>
            <InputGroup.TextArea
              className="min-h-[120px]"
              {...field}
              id={props.name}
              placeholder={props.placeholder}
              aria-invalid={fieldState.invalid}
            />
            {!props.prefix || (
              <InputGroup.Addon align="block-start">
                {props.prefix}
              </InputGroup.Addon>
            )}
            {!props.suffix || (
              <InputGroup.Addon align="block-end">
                {props.suffix}
              </InputGroup.Addon>
            )}
          </InputGroup>
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
