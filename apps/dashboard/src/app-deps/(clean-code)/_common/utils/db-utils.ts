import dayjs from "dayjs";
function fixDbTime(date: dayjs.Dayjs, h = 0, m = 0, s = 0) {
    return date.set("hours", h).set("minutes", m).set("seconds", s);
}
export function anyDateQuery() {
    return {
        lte: fixDbTime(dayjs()).toISOString(),
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
export async function getPageInfo(query, where, model) {
    let { page = 1, perPage = 30 } = query;

    if (!perPage) perPage = 30;
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
    let { page = 1, perPage = 30 } = query;

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
    if (sort === "customer")
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
        take: Number(perPage || 30),
        skip: Number(skip),
        orderBy,
    };
}
