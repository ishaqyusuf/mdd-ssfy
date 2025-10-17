// import { useEffect, useMemo } from "react";
// import AutoComplete, {
//     AutoCompleteProps,
// } from "@/components/_v1/common/auto-complete";
// import { cn } from "@/lib/utils";
// import { CheckIcon, ChevronsUpDown } from "lucide-react";
// import {
//     ControllerProps,
//     FieldPath,
//     FieldValues,
//     useFormContext,
// } from "react-hook-form";

// import { Button } from "@gnd/ui/button";
// import {
//     Command,
//     CommandEmpty,
//     CommandGroup,
//     CommandInput,
//     CommandItem,
// } from "@gnd/ui/command";
// import {
//     Form,
//     FormControl,
//     FormDescription,
//     FormField,
//     FormItem,
//     FormLabel,
//     FormMessage,
// } from "@gnd/ui/form";
// import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

// interface Props<T> {
//     className?: string;
//     suffix?: string;
//     label?;
//     placeholder?;
//     options?: T[];
//     SelectItem?({ option }: { option: T });
//     Item?({ option }: { option: T });
//     valueKey?: keyof T;
//     titleKey?: keyof T;
//     onSelect?(selection: T);
// }
// export default function FormAutoCompleteInput<
//     TFieldValues extends FieldValues = FieldValues,
//     TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
//     TOptionType = any,
// >({
//     label,
//     placeholder,
//     className,
//     onSelect,
//     suffix,
//     options,
//     ...props
// }: Partial<ControllerProps<TFieldValues, TName>> &
//     Props<TOptionType> &
//     AutoCompleteProps) {
//     return (
//         <FormField
//             {...(props as any)}
//             render={({ field }) => (
//                 <FormItem className={cn(className)}>
//                     {label && <FormLabel>{label}</FormLabel>}
//                     <AutoComplete
//                         {...props}
//                         value={field.value}
//                         onChange={(value) => field.onChange(value)}
//                         options={options}
//                         Item={props.Item}
//                     />
//                 </FormItem>
//             )}
//         />
//     );
// }
