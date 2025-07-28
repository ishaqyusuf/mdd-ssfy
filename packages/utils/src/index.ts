import { colorsObject } from "./colors";
import dayjs from "./dayjs";

export function stripSpecialCharacters(inputString: string) {
  // Remove special characters and spaces, keep alphanumeric, hyphens/underscores, and dots
  return inputString
    .replace(/[^a-zA-Z0-9-_\s.]/g, "") // Remove special chars except hyphen/underscore/dot
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .toLowerCase(); // Convert to lowercase for consistency
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

  return randomString;
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
