import dayjs from "dayjs";

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
