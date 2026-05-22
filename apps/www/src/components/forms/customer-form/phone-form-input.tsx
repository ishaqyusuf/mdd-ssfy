"use client";

import { cn } from "@gnd/ui/cn";
import { FormControl, FormField, FormItem, FormLabel } from "@gnd/ui/form";
import { InputGroup } from "@gnd/ui/namespace";
import { US_PHONE_FORMAT_PATTERN } from "@gnd/utils/format";
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { PatternFormat } from "react-number-format";

interface PhoneFormInputProps {
	label?: string;
	className?: string;
	size?: "sm" | "default";
	placeholder?: string;
}

export function PhoneFormInput<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	label,
	className,
	size = "default",
	placeholder = "XXX-XXX-XXXX",
	...props
}: Partial<ControllerProps<TFieldValues, TName>> & PhoneFormInputProps) {
	return (
		<FormField
			{...(props as ControllerProps<TFieldValues, TName>)}
			render={({ field, fieldState }) => (
				<FormItem
					className={cn(
						className,
						props.disabled && "text-muted-foreground",
						"mx-1",
					)}
				>
					{label ? (
						<FormLabel className={cn(fieldState.error && "border-red-400")}>
							{label}
						</FormLabel>
					) : null}
					<FormControl>
						<InputGroup className={cn(size === "sm" && "h-8")}>
							<InputGroup.Addon>
								<InputGroup.Text>+1</InputGroup.Text>
							</InputGroup.Addon>
							<PatternFormat
								customInput={InputGroup.Input}
								format="###-###-####"
								mask="_"
								type="tel"
								inputMode="numeric"
								autoComplete="tel-national"
								placeholder={placeholder}
								value={field.value || ""}
								getInputRef={field.ref}
								name={field.name}
								disabled={props.disabled}
								aria-invalid={fieldState.invalid}
								className={cn(fieldState.error && "border-red-400")}
								onBlur={field.onBlur}
								onValueChange={({ formattedValue, value }) => {
									if (!value) {
										field.onChange(undefined);
										return;
									}

									if (US_PHONE_FORMAT_PATTERN.test(formattedValue)) {
										field.onChange(formattedValue);
										return;
									}

									field.onChange(formattedValue.replaceAll("_", ""));
								}}
							/>
						</InputGroup>
					</FormControl>
				</FormItem>
			)}
		/>
	);
}
