import updateLocale from "dayjs/plugin/updateLocale";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "./dayjs";

export type DateFormats =
    | "DD/MM/YY"
    | "MM/DD/YY"
    | "YYYY-MM-DD"
    | "MMM DD, YYYY"
    | "YYYY-MM-DD HH:mm:ss"
    | "YYYY-MM-DD HH:mm"
    | any;
export function formatDate(date, format: DateFormats = "MM/DD/YY") {
    if (!date) return date;
    return dayjs(date).format(format);
}
export function timeAgo(date, format: DateFormats = "MM/DD/YY") {
    const d = dayjs(date);
    const tAgo = d.fromNow();
    const daysDiff = dayjs().diff(d, "days");

    // if (tAgo == "a day ago") return "yesterday";
    if (daysDiff > 1) return formatDate(date, format);
    return tAgo;
}
