declare module "cloudinary";
import { SearchParamsKeys } from "@/components/(clean-code)/data-table/search-params";
import { IconKeys } from "@/components/_v1/icons";
import { Primitive } from "@radix-ui/react-primitive";
import { ColumnDef as TanColumnDef } from "@tanstack/react-table";
import React from "react";
export type Any<T> = Partial<T> & any;

export type OmitMeta<T> = Omit<T, "meta">;

export interface IDataPage<T> {
    id;
    data: T;
}
export type MakeArray<T> = {
    [P in keyof T]: T[P][];
};

export type PrimitiveDivProps = React.ComponentPropsWithoutRef<
    typeof Primitive.div
>;
export type PageDataMeta = {
    count?;
    page?;
    next?: {
        size?;
        start?;
    };
};
export type PageItemData<T extends (...args: any) => any> = Awaited<
    ReturnType<T>
>["data"][number];
export type PageFilterData = {
    value?: SearchParamsKeys;
    icon?: IconKeys;
    type: "checkbox" | "input" | "date" | "date-range";
    label?: string;
    options?: {
        label: string;
        value: string;
    }[];
};
export type ColumnMeta = {
    preventDefault?: boolean;
    className?: string;
};
export type ColumnDef<T, Meta = {}> = TanColumnDef<T> & {
    meta?: Meta & ColumnMeta;
};
