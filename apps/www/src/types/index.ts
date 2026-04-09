import { Icons } from "@/components/_v1/icons";
import { Column } from "@tanstack/react-table";

interface PageProps<T = {}> {
    params: T;
    searchParams: SearchParams;
}
interface NavItem {
    title: string;
    href?: string;
    disabled?: boolean;
    external?: boolean;
    icon?: keyof typeof Icons;
    label?: string;
    description?: string;
}

interface NavItemWithChildren extends NavItem {
    items: NavItemWithChildren[];
}

interface NavItemWithOptionalChildren extends NavItem {
    items?: NavItemWithChildren[];
}

interface FooterItem {
    title: string;
    items: {
        title: string;
        href: string;
        external?: boolean;
    }[];
}

type MainNavItem = NavItemWithOptionalChildren;
export interface SearchParams {
    [key: string]: string | string[] | undefined;
}

interface DataTableSearchableColumn<TData> {
    id: keyof TData;
    title: string;
}
interface Option {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
}
interface DataTableFilterableColumn<TData, TValue>
    extends DataTableSearchableColumn<TData> {
    column?: Column<TData, TValue>;
    options: Option[];
    single?: Boolean;
    defaultValue?: string;
}
// type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
type DataTableType<T extends (...args: any) => any> = Awaited<
    ReturnType<T>
> extends { data: infer U }
    ? U extends Record<number, any>
        ? U[0]
        : never
    : never;
export type PromiseDataTable<T extends (...args: any) => any> = Promise<
    NonNullable<Awaited<ReturnType<T>>>
>;
export interface ServerPromiseType<T extends (...args: any) => any> {
    Promise: PromiseDataTable<T>;
    Response: Awaited<PromiseDataTable<T>>;
    Item: Awaited<PromiseDataTable<T>>["data"][0];
}
export type AsyncFnType<T extends (...args: any) => any> = Awaited<
    ReturnType<T>
>;
