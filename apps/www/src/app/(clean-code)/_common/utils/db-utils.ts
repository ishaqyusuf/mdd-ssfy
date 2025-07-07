import dayjs from "dayjs";
function fixDbTime(date: dayjs.Dayjs, h = 0, m = 0, s = 0) {
    return date.set("hours", h).set("minutes", m).set("seconds", s);
}
export function anyDateQuery() {
    return {
        lte: fixDbTime(dayjs()).toISOString(),
    };
}
export function isDay(date: dayjs.Dayjs) {
    return {
        gte: fixDbTime(date).toISOString(),
        lte: fixDbTime(date, 23, 59, 59).toISOString(),
    };
}
export function isYear(date: dayjs.Dayjs) {
    return {
        gte: date.startOf("year").startOf("day").toISOString(),
        lte: date.endOf("year").endOf("day").toISOString(),
    };
}
export function isMonth(date: dayjs.Dayjs) {
    return {
        gte: date.startOf("month").startOf("day").toISOString(),
        lte: date.endOf("month").endOf("day").toISOString(),
    };
}
export const withDeleted = {
    OR: [{ deletedAt: null }, { deletedAt: { not: null } }],
};
export const whereTrashed = {
    where: {
        deletedAt: {},
    },
};
export const whereNotTrashed = {
    where: {
        deletedAt: null,
    },
};
export async function inifinitePageInfo<T>(
    query,
    where,
    model,
    data: T[] = []
) {
    const info = await getPageInfo(query, where, model);
    return {
        data,
        pageCount: info.pageCount,
        pageInfo: info,
        meta: {
            totalRowCount: info.totalItems,
        },
    };
}
export async function getPageInfo(query, where, model) {
    const { page = 1, perPage = 20 } = query;
    const skip = (page - 1) * Number(perPage);
    const count = await model.count({
        where,
    });
    const from = skip + 1;
    const pageInfo = {
        hasPreviousPage: skip > 0,
        pageCount: Math.ceil(count / perPage),
        totalItems: count,
        pageIndex: skip / perPage,
        currentPage: page,
        from,
        to: Math.min(skip + Number(perPage), count),
        perPage,
        meta: {
            totalRowCount: count,
        },
    };
    return pageInfo;
}

export function pageQueryFilter(query) {
    let { page = 1, perPage = 20 } = query;

    const keys = Object.keys(query);
    let skip = null;
    // if (!query?.perPage) perPage = query?.size;
    if (keys.includes("start")) {
        skip = query.start;
        perPage = query.size;
    } else {
        skip = (page - 1) * perPage;
    }

    let orderBy = {};
    const { sort_order = "desc", sort = "id" } = query;
    if (sort == "customer")
        orderBy = {
            customer: {
                name: sort_order,
            },
        };
    else {
        orderBy = {
            [sort || "id"]: sort_order,
        };
    }

    return {
        take: Number(perPage),
        skip: Number(skip),
        orderBy,
    };
}
