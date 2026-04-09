import { actionTicketEvents, actionTicketTypes } from "@/utils/constants";

export type AsyncFnType<T extends (...args: any) => any> = Awaited<
    ReturnType<T>
>;

interface PageTab {
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
interface LabelValue {
    label;
    value;
}

interface SelectOption {
    label?: string;
    value?: any;
    data?: any;
}

type ActionTicketType = (typeof actionTicketTypes)[number];
type ActionTicketEvents = (typeof actionTicketEvents)[number];

interface ActionTicketMeta {
    id?: string | number;
    authorName?: string;
    authorId?: number;
    description?: string;
}
