import { actionTicketEvents, actionTicketTypes } from "@/utils/constants";

export type AsyncFnType<T extends (...args: any) => any> = Awaited<
    ReturnType<T>
>;

export interface PageTab {
    count?;
    params?: { [k in string]: string };
    title: string;
    url?: string;
}

export interface PageBaseQuery {
    page?;
    perPage?;
    sortOrder?;
    sort?;
    _q?: string;
    _dateType?;
    from?;
    to?;
    trashedOnly?: boolean;
    withTrashed?: boolean;
}
export interface LabelValue {
    label;
    value;
}

export interface SelectOption {
    label?: string;
    value?: any;
    data?: any;
}

export type ActionTicketType = (typeof actionTicketTypes)[number];
export type ActionTicketEvents = (typeof actionTicketEvents)[number];

export interface ActionTicketMeta {
    id?: string | number;
    authorName?: string;
    authorId?: number;
    description?: string;
}
