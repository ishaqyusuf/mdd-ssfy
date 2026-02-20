import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Field, InputGroup } from "../namespace";
import { Input } from "../input";
import { cn } from "../../utils";

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
  className?: string;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
}
export function InputField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>(
  props: Pick<
    Partial<ControllerProps<TFieldValues, TName>>,
    "control" | "name" | "defaultValue" | "disabled"
  > &
    Props<TOptionType>,
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
          className={cn(props.className)}
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
            <InputGroup.Input
              // className="min-h-[120px]"
              {...field}
              onChange={(e) => {
                if (props.type !== "number") return field.onChange(e);
                const input = e.target.value;
                // console.log({ input });
                // setRawValue(input);

                // Check if input can be parsed as a valid number
                const num = Number.parseFloat(input);

                if (
                  !Number.isNaN(num)
                  // && min <= num && num <= max
                ) {
                  field.onChange?.(num);
                }
                if (input === "") field.onChange?.(null as any);
              }}
              className={cn(
                "",
                props.type === "number" &&
                  "&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]",
              )}
              id={props.name}
              name={props.name}
              type={props.type}
              placeholder={props.placeholder}
              aria-invalid={fieldState.invalid}
            />
            {!props.prefix || (
              <InputGroup.Addon align="inline-start">
                {props.prefix}
              </InputGroup.Addon>
            )}
            {!props.suffix || (
              <InputGroup.Addon align="inline-end">
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
