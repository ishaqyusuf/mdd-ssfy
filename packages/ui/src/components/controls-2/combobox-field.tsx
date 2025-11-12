import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Field, Select } from "../composite";
import React from "react";
import { PopoverContent } from "../popover";

interface Props<T> {
  label?: string;
  placeholder?: string;
  description?;
  // options?: { label?: string; value?: string }[];
  Item: ({ value, item, selected }) => any;
  fieldProps: {
    orientation: "horizontal" | "vertical" | "responsive";
  };
  searchPlaceholder?: string;
  items: T[];
  onSelect: (item: T) => void;
  selectedItem?: T;
  renderSelectedItem?: (selectedItem: T) => React.ReactNode;
  renderOnCreate?: (value: string) => React.ReactNode;
  renderListItem?: (listItem: {
    isChecked: boolean;
    item: T;
  }) => React.ReactNode;
  emptyResults?: React.ReactNode;
  popoverProps?: React.ComponentProps<typeof PopoverContent>;
  disabled?: boolean;
  onCreate?: (value: string) => void;
  headless?: boolean;
  noSearch?: boolean;
  className?: string;
  listClassName?: string;
  pageSize?: number;
  valueKey?: string;
  openChanged?;
  onSearch?: (value: string) => void;
}
export function ComboboxField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>({
  selectedItem: incomingSelectedItem,
  ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
  const [open, setOpen] = React.useState(false);
  const [internalSelectedItem, setInternalSelectedItem] = React.useState<any>();

  const selectedItem = incomingSelectedItem ?? internalSelectedItem;
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
              {/* {props.options.map((option) =>
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
              )} */}
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
