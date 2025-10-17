import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import utc from "dayjs/plugin/utc";

// Import any additional plugins or locales if needed
import "dayjs/locale/en";

// Initialize dayjs with relativeTime plugin
dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.extend(updateLocale);
dayjs.extend(utc);

dayjs.updateLocale("en", {
  relativeTime: {
    // past: "%s ago",
    future: "in %s",
    past: "%s",
    s: "Now",
    m: "1m",
    mm: "%dm",
    h: "1h",
    hh: "%dh",
    d: "yesterday",
    dd: "%dd ago",
    w: "1w",
    ww: "%dw",
    M: "1m", // month
    MM: "%dm",
    y: "1y",
    yy: "%dy",
  },
});
// Set the default locale
dayjs.locale("en");
export default dayjs;

export type DateFormats =
  | "DD/MM/YY"
  | "MM/DD/YY"
  | "YYYY-MM-DD"
  | "MMM DD, YYYY"
  | "YYYY-MM-DD HH:mm:ss"
  | "YYYY-MM-DD HH:mm"
  | any;
export function formatDate(date: any, format: DateFormats = "MM/DD/YY") {
  if (!date) return date;
  return dayjs(date).format(format);
}
export function timeAgo(date: any, format: DateFormats = "MM/DD/YY") {
  const d = dayjs(date);
  const tAgo = d.fromNow();
  const daysDiff = dayjs().diff(d, "days");

  // if (tAgo == "a day ago") return "yesterday";
  if (daysDiff > 1) return formatDate(date, format);
  return tAgo;
}
