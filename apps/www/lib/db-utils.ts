import { getPageInfo, queryFilter } from "@/app/(v1)/_actions/action-utils";
import dayjs from "dayjs";

export function _searchQuery<T>(query, ...columns: (keyof T)[]) {
    if (!query._q) return {};
    const q = {
        contains: query._q || undefined,
    };
    console.log(q);

    const OR: any = [];
    columns.map((c) => {
        OR.push({
            [c]: q,
        });
    });

    return {
        OR,
    };
}
export async function queryBuilder<T>(query, table, soft = true) {
    const where = whereQuery<T>(query, soft);
    const queryFilters = await queryFilter(query);
    return {
        ...where,
        getWhere: where.get,
        queryFilters,
        _prismaArgs() {
            return {
                where: where.get(),
                ...queryFilters,
            };
        },
        pagePageInfo: async () => await getPageInfo(query, where.get(), table),
        async response(data) {
            const pageInfo = await getPageInfo(query, where.get(), table);
            return {
                pageInfo,
                data,
            };
        },
    };
}
export function whereQuery<T>(query, soft = true) {
    let where: any = {} as any;
    if (soft) where.deletedAt = null;
    const q = {
        contains: query._q || undefined,
    } as any;
    console.log(q);

    return {
        where,
        get: () => where as any,
        register(column: keyof T, value: any) {
            where[column] = value;
        },
        orWhere(column: keyof T, value: any) {
            if (value) this.register(column, value || undefined);
        },
        searchRelationQuery: <T1>(...columns: (keyof T)[]) => {
            Object.entries(_searchQuery<T>(query, ...columns)).map(
                ([k, v]) => (where[k] = v),
            );
        },
        q,
        raw(rq: T) {
            where = {
                ...where,
                ...rq,
            };
            // Object.entries(rq as any).map(([k, v]) => (where[k] = v));
        },
        search(_search: T) {
            if (q.contains) {
                if (!where.OR) where.OR = [];
                Object.entries(_search as any).map(([k, v]) => {
                    where.OR.push({
                        [k]: v,
                    });
                });
            }
        },
        searchQuery: (...columns: (keyof T)[]) => {
            Object.entries(_searchQuery<T>(query, ...columns)).map(
                ([k, v]) => (where[k] = v),
            );
        },
    };
}
// export function

export function transformDate(_dateString): {
    // from?: string;
    // to?: string;
    // date?: string;
    gte?: string;
    lte?: string;
    equals?: string;
} {
    // const parts = dateString.split(",");
    const [fromStr, toStr] = _dateString;
    const today = dayjs();
    const lower = fromStr.toLowerCase().trim();

    if (lower === "today") {
        return {
            gte: today.startOf("day").toISOString(),
            lte: today.endOf("day").toISOString(),
        };
    }

    if (lower === "tomorrow") {
        return {
            gte: today.add(1, "day").startOf("day").toISOString(),
            lte: today.add(1, "day").endOf("day").toISOString(),
        };
    }

    if (lower === "yesterday") {
        return {
            // gte: today.subtract(1, "day").toISOString(),
            gte: today.subtract(1, "day").startOf("day").toISOString(),
            lte: today.subtract(1, "day").endOf("day").toISOString(),
        };
    }

    if (lower === "this week") {
        return {
            gte: today.startOf("week").toISOString(),
            lte: today.endOf("week").toISOString(),
        };
    }

    if (lower === "last week") {
        return {
            gte: today.subtract(1, "week").startOf("week").toISOString(),
            lte: today.subtract(1, "week").endOf("week").toISOString(),
        };
    }

    if (lower === "next week") {
        return {
            gte: today.add(1, "week").startOf("week").toISOString(),
            lte: today.add(1, "week").endOf("week").toISOString(),
        };
    }

    if (lower === "this month") {
        return {
            gte: today.startOf("month").toISOString(),
            lte: today.endOf("month").toISOString(),
        };
    }

    if (lower === "last month") {
        return {
            gte: today.subtract(1, "month").startOf("month").toISOString(),
            lte: today.subtract(1, "month").endOf("month").toISOString(),
        };
    }

    if (lower === "this year") {
        return {
            gte: today.startOf("year").toISOString(),
            lte: today.endOf("year").toISOString(),
        };
    }

    if (lower === "last year") {
        return {
            gte: today.subtract(1, "year").startOf("year").toISOString(),
            lte: today.subtract(1, "year").endOf("year").toISOString(),
        };
    }

    // Handle specific date formats

    if (_dateString.length === 1 && fromStr) {
        return { gte: dayjs(fromStr).toISOString() };
    }

    if (fromStr && toStr) {
        return {
            gte: dayjs(fromStr).toISOString(),
            lte: dayjs(toStr).toISOString(),
        };
    }

    if (fromStr && toStr === "null") {
        return {
            gte: dayjs(fromStr).toISOString(),
        };
    }
    return null;
}
