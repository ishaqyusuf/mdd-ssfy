import { colorsObject } from "./colors";
import dayjs from "./dayjs";
import { hash } from "bcrypt-ts";
import util from "util";
import _ from "lodash";

import dotObject from "dot-object";
export { dotObject };
export function insertAt<T>(array: T[], index: number, item: T) {
  return _.concat(_.slice(array, 0, index), [item], _.slice(array, index));
}
export const devMode = process.env.NODE_ENV != "production";
export function dbConnect(id) {
  if (!id) return undefined as any;
  return {
    connect: { id },
  };
}
export async function hashPassword(pwrd) {
  return await hash(pwrd, 10);
}
export function stripSpecialCharacters(inputString: string) {
  // Remove special characters and spaces, keep alphanumeric, hyphens/underscores, and dots
  return inputString
    .replace(/[^a-zA-Z0-9-_\s.]/g, "") // Remove special chars except hyphen/underscore/dot
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .toLowerCase(); // Convert to lowercase for consistency
}
export function camel(str?: string) {
  if (!str) return str;
  return str.replace(
    /^([A-Z])|\s(\w)/g,
    function (match: any, p1: any, p2: any, offset: any) {
      if (p2) return p2.toUpperCase();
      return p1.toLowerCase();
    }
  );
}

export function shuffle(array: any) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-") // Replace spaces and non-word chars with -
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
export async function slugModel(value, model, c = 0, id = null) {
  const valueString = Array.isArray(value) ? value?.join(" ") : value;
  let slug = slugify([valueString, c > 0 ? c : null].filter(Boolean).join(" "));

  let count = await model.count({
    where: {
      slug,
      id: id
        ? {
            not: id,
          }
        : undefined,
    },
  });
  if (count > 0) return await slugModel(value, model, c + 1, id);

  return slug;
}

export enum FileType {
  Pdf = "application/pdf",
  Heic = "image/heic",
}

export const isSupportedFilePreview = (type: FileType) => {
  if (!type) {
    return false;
  }

  if (type === FileType.Heic) {
    return false;
  }

  if (type?.startsWith("image")) {
    return true;
  }

  switch (type) {
    case FileType.Pdf:
      return true;
    default:
      return false;
  }
};
export function sum<T>(array?: T[], key: keyof T | undefined = undefined) {
  if (!array) return 0;
  return (
    array
      .map((v) => (!key ? v : v?.[key]))
      .map((v) => (v ? Number(v) : null))
      .filter((v) => (v! > 0 || v! < 0) && !isNaN(v as any))
      .reduce((sum, val) => (sum || 0) + (val as number), 0) || 0
  );
}
export function sortList<T>(
  list: T[],
  sortBy: keyof T | undefined = undefined,
  dir: "asc" | "desc" = "asc"
) {
  if (!list) return [];
  return list.sort((a, b) => {
    const va = a![sortBy!];
    const vb = b![sortBy!];
    if (dir == "desc") return String(vb).localeCompare(String(va));
    return String(va).localeCompare(String(vb));
  });
}
export function reorderList({ newFields, oldFields, swap, fieldId = "_id" }) {
  const firstDiffIndex = oldFields.findIndex(
    (field, index) => field[fieldId] !== newFields[index]?.[fieldId]
  );

  if (firstDiffIndex !== -1) {
    const newIndex = newFields.findIndex(
      (field) => field[fieldId] === oldFields[firstDiffIndex]?.[fieldId]
    );
    if (newIndex !== -1) {
      swap(firstDiffIndex, newIndex);
    }
  }
}
export function uniqueList<T>(
  list: T[],
  uniqueBy: keyof T | undefined = undefined
) {
  if (!list) return [];
  const kValue = (b) => (!uniqueBy || typeof b === "string" ? b : b[uniqueBy]);
  return list.filter(
    (a, i) => i === list.findIndex((b) => kValue(b) == kValue(a))
  );
}
export function addPercentage(value: any, percentage: any) {
  return value + (value || 0) * ((percentage || 100) / 100);
}
export function toFixed(value: any) {
  const number = typeof value == "string" ? parseFloat(value) : value;
  if (isNaN(value) || !value) return value;
  return number.toFixed(2);
}
export function formatMoney(value: any) {
  const v = toFixed(value);
  if (!v) return 0;
  return +v;
}
export function percentageValue(value: any, percent: any) {
  if (!percent || !value) return 0;
  return formatMoney(((value || 0) * percent) / 100);
}
export function percent(score: any, total: any, def = 0) {
  if (!score || !total) return def;
  return Math.round((Number(score) / Number(total)) * 100);
}
export function generateRandomNumber(length = 15) {
  const charset = "0123456789";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return +randomString;
}
export function generateRandomString(length = 15) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return randomString;
}
export function addSpacesToCamelCase(input: string): string {
  return input.replace(/([a-z])([A-Z])/g, "$1 $2");
}
export function toNumber(s: any) {
  s = Number(s);
  return isNaN(s) ? 0 : s;
}
export function getNameInitials(name?: string) {
  return name
    ?.toLocaleUpperCase()
    ?.split(" ")
    ?.map((a) => a?.[0])
    ?.filter(Boolean)
    ?.join("");
}

export function sumArrayKeys<T>(
  array?: T[],
  keys: (keyof T | undefined)[] = undefined!,
  subtract = false
) {
  if (!array?.length) return array;
  let [first, ...others] = array;
  let ret: T = {} as any;
  keys?.map((k) => {
    (ret as any)[k] = sum(array, k) as any;
  });
  return ret;
}
export function formatCurrency(value: any) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
  }).format(value);
}
interface ScheduleStatusProps {
  duePrefix?: string;
  dueFn?: (dayDiff: number) => any;
  futurePrefix?: string;
  futureFn?: (dayDiff: number) => any;
}
export function getScheduleStatusInfo(date: any, props?: ScheduleStatusProps) {
  const daysdiff = dayjs().diff(date, "day");
  if (daysdiff == 0)
    return {
      status: "Today",
      color: colorsObject.orange,
    };
  if (daysdiff == 1)
    return {
      status: "Tommorrow",
      color: colorsObject.yellow,
    };
  if (daysdiff > 0)
    return {
      status: [props?.futurePrefix, `in ${daysdiff} days`]
        .filter(Boolean)
        .join(" "),
    };
  if (daysdiff < 0)
    return {
      status: [props?.duePrefix, `by ${Math.abs(daysdiff)} days`]
        .filter(Boolean)
        .join(" "),
      color: colorsObject.red,
    };
  return {};
}
export type RenturnTypeAsync<T extends (...args: any) => any> = Awaited<
  ReturnType<T>
>;
export async function nextId(model: any, where?: any) {
  return (await lastId(model, where)) + 1;
}
export async function lastId(model: any, _default = 0, where?: any) {
  return ((
    await model.findFirst({
      where: {
        deletedAt: undefined,
        ...(where || {}),
      },
      orderBy: {
        id: "desc",
      },
    })
  )?.id || _default) as number;
}
export function dateRangeQuery(dateRange) {
  if (!dateRange || !dateRange?.length) return undefined;
  const [from, to] = dateRange.map((a) => {
    if (a == "-") return null;
    return a;
  });
  return dateQuery({
    from,
    to,
  })?.createdAt;
}
export function dateQuery({
  date,
  from,
  to,
  _dateType = "createdAt",
}: {
  date?;
  from?;
  to?;
  _dateType?;
}) {
  const where: any = {};

  if (date) {
    const _whereDate = {
      gte: fixDbTime(dayjs(date)).toISOString(),
      lte: fixDbTime(dayjs(date), 23, 59, 59).toISOString(),
    };
    where[_dateType] = _whereDate;
  }
  if (from || to) {
    where[_dateType] = {
      gte: !from ? undefined : fixDbTime(dayjs(from)).toISOString(),
      lte: !to ? undefined : fixDbTime(dayjs(to), 23, 59, 59).toISOString(),
    };
  }
  return where;
}
export function fixDbTime(date: dayjs.Dayjs, h = 0, m = 0, s = 0) {
  return date.set("hours", h).set("minutes", m).set("seconds", s);
}
export function dateEquals(date) {
  return {
    gte: dayjs(date).startOf("day").toDate(),
    lte: dayjs(date).endOf("day").toDate(),
  };
  // return {
  //     gte: fixDbTime(dayjs(date)).toISOString(),
  //     lte: fixDbTime(dayjs(date), 23, 59, 59).toISOString(),
  // };
}
export function anyDateQuery() {
  return {
    lte: fixDbTime(dayjs()).toISOString(),
  };
}
export function filterIsDefault(query) {
  const defaultFilterKeys = ["cursor", "start", "sort", "size"];
  return Object.entries(query || {})
    .filter(([a, b]) => !defaultFilterKeys?.includes(a))
    ?.every(([a, b]) => !b);
}

export function matchValue<T>(item: T) {
  return {
    in: (...ins: T[]) => ins.includes(item),
    notIn: (...outs: T[]) => !outs.includes(item),
    is: (value: T) => item === value,
    not: (value: T) => item !== value,
  };
}

export function labelValueOptions<T>(
  data: T[],
  labelKey?: keyof T,
  valueKey?: keyof T
) {
  if (!data) return [];
  return data
    ?.map((d) => ({
      label: typeof d == "string" ? d?.replaceAll('"', "") : d?.[labelKey!],
      value:
        typeof d == "string" ? d?.replaceAll('"', "") : String(d?.[valueKey!]),
    }))
    .filter((a) => a.label && a.value);
}
export function selectOptions<T>(
  data: T[],
  labelKey: keyof T,
  valueKey: keyof T
) {
  return data?.map((d) => ({
    data: d,
    label: d?.[labelKey],
    id: String(d?.[valueKey]),
  }));
}

export const generateSKU = (length = 6) => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  // Use crypto if available (browser/node)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) out += chars[bytes[i]! % chars.length];
  } else {
    for (let i = 0; i < length; i++)
      out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};
export function getStatusFromPercentage(percent: number) {
  if (percent <= 0) return "empty"; // 0%
  if (percent < 40) return "low"; // 1%–39%
  if (percent < 70) return "medium"; // 40%–69%
  if (percent < 100) return "high"; // 70%–99%
  return "full"; // 100%
}

export function imageUrl(data: { path; bucket; provider }) {
  if (!data) return null;
  const { path, bucket, provider } = data;
  if (provider == "cloudinary")
    return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${bucket}/${path}`;
}
export async function timeout(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rndTimeout() {
  return await timeout(generateRandomNumber(2));
}
export function timeLog(...data) {
  console.log("");
  console.log(`${new Date().toISOString()}`);
  console.log(util.inspect(data, { colors: true, depth: null }));
  // console.log(data);
  console.log("---");
}
export function consoleLog(title = "Log", ...data) {
  const now = new Date().toISOString();
  const divider = "═".repeat(40);

  console.log("");
  console.log(`\x1b[36m${divider}\x1b[0m`); // cyan divider
  console.log(`\x1b[33m📅 Time:\x1b[0m ${now}`);
  console.log(`\x1b[35m📌 Section:\x1b[0m ${title}`);
  console.log(`\x1b[36m${"-".repeat(40)}\x1b[0m`);
  console.log(util.inspect(data, { colors: true, depth: null }));
  console.log(`\x1b[36m${divider}\x1b[0m`);
  console.log("");
}

export function transformFilterDateToQuery(dateParts) {
  if (!dateParts) return undefined;
  let [fromStr, toStr] = dateParts;
  const today = dayjs();
  const lower = fromStr!.toLowerCase().trim();
  if (toStr == "-") toStr = null as any;
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
  if (lower === "last 2 month") {
    return {
      gte: today.subtract(2, "month").startOf("month").toISOString(),
      lte: today.subtract(1, "month").endOf("month").toISOString(),
    };
  }
  if (lower === "last 6 month") {
    return {
      gte: today.subtract(6, "month").startOf("month").toISOString(),
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

  if (dateParts.length === 1 && fromStr) {
    return { gte: dayjs(fromStr).toISOString() };
  }
  if (fromStr && toStr) {
    return {
      gte: dayjs(fromStr).toISOString(),
      lte: dayjs(toStr).toISOString(),
    };
  }

  if (fromStr && (toStr === "null" || toStr == "-" || !toStr)) {
    return {
      gte: dayjs(fromStr).toISOString(),
    };
  }
  return null;
}
export function isArrayParser(parser) {
  try {
    const result = parser.parse("test"); // dummy input
    return Array.isArray(result);
  } catch {
    return false;
  }
}
