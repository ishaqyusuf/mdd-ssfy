import {
    DISPATCH_FILTER_OPTIONS,
    INVOICE_FILTER_OPTIONS,
    PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
    PRODUCTION_STATUS,
} from "@/app/(clean-code)/(sales)/_common/utils/contants";
import { PERMISSIONS, ROLES } from "@/data/contants/permissions";
// Note: import from 'nuqs/server' to avoid the "use client" directive
import { ARRAY_DELIMITER, SORT_DELIMITER } from "@/lib/delimiters";
import { noteParamsParser, noteSchema } from "@/modules/notes/constants";
import { SalesPriority } from "@prisma/client";
import {
    createParser,
    createSearchParamsCache,
    createSerializer,
    parseAsArrayOf,
    parseAsBoolean,
    parseAsInteger,
    parseAsIsoDateTime,
    parseAsString,
    parseAsStringLiteral,
} from "nuqs/server";
import { z } from "zod";

// import { REGIONS } from "@/constants/region";
// import { METHODS } from "@/constants/method";

// https://logs.run/i?sort=latency.desc

export const parseAsSort = createParser({
    parse(queryValue) {
        const [id, desc] = queryValue.split(SORT_DELIMITER);
        if (!id && !desc) return null;
        return { id, desc: desc === "desc" };
    },
    serialize(value) {
        return `${value.id}.${value.desc ? "desc" : "asc"}`;
    },
});
type SpecialFilters =
    | "sort"
    | "size"
    | "start"
    | "uuid"
    | "with.trashed"
    | "trashed.only"
    | "_q";
export type FilterKeys = keyof typeof searchSchema._type;
export type SearchParamsKeys = SpecialFilters | FilterKeys;
const commissionFilters = ["all", "earned", "pending"] as const;
export const searchParamsParser: {
    [k in SearchParamsKeys]: any;
} = {
    // CUSTOM FILTERS
    // success: parseAsArrayOf(parseAsBoolean, ARRAY_DELIMITER),
    // latency: parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
    // "timing.dns": parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
    // "timing.connection": parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
    // "timing.tls": parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
    // "timing.ttfb": parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
    // "timing.transfer": parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
    // status: parseAsArrayOf(parseAsInteger, SLIDER_DELIMITER),
    // //   regions: parseAsArrayOf(parseAsStringLiteral(REGIONS), ARRAY_DELIMITER),
    // //   method: parseAsArrayOf(parseAsStringLiteral(METHODS), ARRAY_DELIMITER),
    // host: parseAsString,
    // pathname: parseAsString,
    // date: parseAsArrayOf(parseAsTimestamp, RANGE_DELIMITER),
    // // REQUIRED FOR SORTING & PAGINATION
    "account.no": parseAsString,
    address: parseAsString,
    "address.id": parseAsInteger,
    "commission.filter": parseAsString,
    "date.from": parseAsString,
    "date.to": parseAsString,
    sort: parseAsSort,
    size: parseAsInteger.withDefault(30),
    start: parseAsInteger.withDefault(0),
    // // REQUIRED FOR SELECTION
    uuid: parseAsString,
    "customer.id": parseAsInteger,
    "customer.name": parseAsString,
    "customer.tx.id": parseAsString,
    "sales.tx.id": parseAsString,
    status: parseAsString,
    search: parseAsString,
    "dispatch.status": parseAsString,
    production: parseAsString,
    invoice: parseAsString,
    "sales.rep": parseAsString,
    "production.assignment": parseAsString,
    "production.assignedToId": parseAsInteger,
    "production.status": parseAsInteger,
    "production.dueDate": parseAsArrayOf(parseAsString),
    // ": parseAsString,
    "order.no": parseAsString,
    po: parseAsString,
    phone: parseAsString,
    // pk: parseAsString,
    "sales.type": parseAsString,
    "with.trashed": parseAsBoolean,
    "trashed.only": parseAsBoolean,
    "dealer.id": parseAsInteger,
    "sales.id": parseAsInteger,
    "salesRep.id": parseAsInteger,
    "sales.priority": parseAsArrayOf(
        parseAsStringLiteral(Object.keys(SalesPriority)),
        ARRAY_DELIMITER,
    ),
    _q: parseAsString,
    id: parseAsInteger,
    "user.id": parseAsInteger,
    "user.permissions": parseAsArrayOf(
        parseAsStringLiteral(PERMISSIONS),
        ARRAY_DELIMITER,
    ),
    "user.cannot": parseAsArrayOf(
        parseAsStringLiteral(PERMISSIONS),
        ARRAY_DELIMITER,
    ),
    "user.role": parseAsArrayOf(parseAsStringLiteral(ROLES), ARRAY_DELIMITER),
    ...noteParamsParser,
};
export const searchSchema = z
    .object({
        "account.no": z.string().optional(),
        address: z.string().optional(),
        "address.id": z.number().optional(),
        id: z.number().optional(),
        status: z.string().optional(),
        "commission.filter": z.enum(commissionFilters).optional(),
        "customer.id": z.number().optional(),
        "customer.tx.id": z.number().optional(),
        "customer.name": z.string().optional(),
        "date.from": z.string().optional(),
        "date.to": z.string().optional(),

        "order.no": z.string().optional(),
        po: z.string().optional(),
        phone: z.string().optional(),
        "dispatch.status": z.enum(DISPATCH_FILTER_OPTIONS).optional(),
        "production.dueDate": z.array(z.any()),
        "production.status": z.enum(PRODUCTION_STATUS).optional(),
        "production.assignment": z
            .enum(PRODUCTION_ASSIGNMENT_FILTER_OPTIONS)
            .optional(),
        "production.assignedToId": z.number().optional(),
        production: z.string().optional(),
        invoice: z.enum(INVOICE_FILTER_OPTIONS).optional(),
        "sales.id": z.number().optional(),
        "sales.rep": z.string().optional(),
        "sales.tx.id": z.number().optional(),
        "sales.type": z.enum(["order", "quote"]).optional(),
        "salesRep.id": z.number().optional(),
        "sales.priority": z.nativeEnum(SalesPriority),
        search: z.string().optional(),
        "dealer.id": z.number().optional(),
        "user.id": z.number().optional(),
        "user.permissions": z.enum(PERMISSIONS).optional(),
        "user.cannot": z.enum(PERMISSIONS).optional(),
        "user.role": z.enum(ROLES).optional(),
    })
    .merge(noteSchema);
export const searchParamsCache = createSearchParamsCache(searchParamsParser);
export const searchParamsSerializer = createSerializer(searchParamsParser);
export type SearchParamsType = Partial<
    z.infer<typeof searchSchema> & {
        [id in SpecialFilters]: any;
    }
>; //SearchParamsType; // inferParserType<typeof searchParamsParser>;
