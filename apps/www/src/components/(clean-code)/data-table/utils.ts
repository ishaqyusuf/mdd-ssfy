// TODO: check if we can move to /data-table-filter-command/utils.ts
import type { ColumnFiltersState } from "@tanstack/react-table";
import { z } from "zod";
import {
    ARRAY_DELIMITER,
    RANGE_DELIMITER,
    SLIDER_DELIMITER,
} from "@/lib/delimiters";
import { DataTableFilterField } from "./type";
import { SEPARATOR } from "@/app/(clean-code)/(sales)/_common/utils/contants";
import {
    __filterKeyInSearch,
    __findFilterField,
} from "./filter-command/filters";

export function deserialize<T extends z.AnyZodObject>(schema: T) {
    const castToSchema = z.preprocess((val) => {
        // console.log({ val });
        if (typeof val !== "string") return val;
        return val
            .trim()
            .split(" &")
            .reduce((prev, curr) => {
                const [name, value] = curr.split(":");
                if (!value || !name) return prev;
                prev[name?.split("_")?.join(".")] = value;
                return prev;
            }, {} as Record<string, unknown>);
    }, schema);
    return (value: string) => castToSchema.safeParse(value);
}

// export function serialize<T extends z.AnyZodObject>(schema: T) {
//   return (value: z.infer<T>) =>
//     schema
//       .transform((val) => {
//         Object.keys(val).reduce((prev, curr) => {
//           if (Array.isArray(val[curr])) {
//             return `${prev}${curr}:${val[curr].join(",")} `;
//           }
//           return `${prev}${curr}:${val[curr]} `;
//         }, "");
//       })
//       .safeParse(value);
// }

export function serializeColumFilters<TData>(
    columnFilters: ColumnFiltersState,
    filterFields?: DataTableFilterField<TData>[]
) {
    // columnFilters = columnFilters?.map((f) => {
    //     // console.log("|||||", f.value);
    //     // f.value = f.value);
    //     // f.id = f.id?.split("_")?.join(".");
    //     return f;
    // });
    const res = columnFilters.reduce((prev, curr) => {
        const { type, commandDisabled } = filterFields?.find(
            (field) => __findFilterField(field, curr) //curr.id === field.value
        ) || { commandDisabled: true }; // if column filter is not found, disable the command by default
        // const id = curr.id?.split("_")?.join(".");
        // if (commandDisabled) {
        //     console.log("ERRR", curr);
        //     return prev;
        // }
        // console.log({ curr });
        const currId = curr.id?.split("_")?.join(".");
        if (Array.isArray(curr.value)) {
            if (type === "slider") {
                return `${prev}${currId}:${curr.value.join(
                    SLIDER_DELIMITER
                )}${SEPARATOR}`;
            }
            if (type === "checkbox") {
                return `${prev}${currId}:${curr.value.join(
                    ARRAY_DELIMITER
                )}${SEPARATOR}`;
            }
            if (type === "timerange") {
                return `${prev}${currId}:${curr.value.join(
                    RANGE_DELIMITER
                )}${SEPARATOR}`;
            }
        }

        return `${prev}${currId}:${curr.value}${SEPARATOR}`;
    }, "");
    // console.log({ res });
    return Array.from(new Set(res?.split(SEPARATOR))).join(SEPARATOR);
}
