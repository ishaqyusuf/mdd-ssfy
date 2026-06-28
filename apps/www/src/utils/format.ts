import {
    differenceInDays,
    differenceInMonths,
    format,
    isSameYear,
    startOfDay,
} from "date-fns";

export function formatDate(date: string, dateFormat?: string) {
    if (isSameYear(new Date(), new Date(date))) {
        return format(new Date(date), "MMM d");
    }

    return format(new Date(date), dateFormat ?? "P");
}

export function getDueDateStatus(dueDate: string): string {
    const now = new Date();
    const due = new Date(dueDate);

    // Set both dates to the start of their respective days
    const nowDay = startOfDay(now);
    const dueDay = startOfDay(due);

    const diffDays = differenceInDays(dueDay, nowDay);
    const diffMonths = differenceInMonths(dueDay, nowDay);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";

    if (diffDays > 0) {
        if (diffMonths < 1) return `in ${diffDays} days`;
        return `in ${diffMonths} month${diffMonths === 1 ? "" : "s"}`;
    }

    if (diffMonths < 1)
        return `${Math.abs(diffDays)} day${
            Math.abs(diffDays) === 1 ? "" : "s"
        } ago`;
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

export function skeletonListData<T>(
    data: T[],
    count = 5,
    placeholder: Partial<T> | null = null,
) {
    if (!data)
        return Array(count)
            .fill(null)
            .map((a) => placeholder) as any as T[];
    return data;
}
