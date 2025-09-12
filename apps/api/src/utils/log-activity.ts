import type { Db, Prisma } from "@gnd/db";
import type {
  NoteTagNames,
  NoteTagStatus,
  NoteTagTypes,
} from "@gnd/utils/constants";

const activityTypes = [
  "sales_copied",
  "sales_moved",
  "quote_copied",
  "quote_moved",

  "sales_invoice_updated",
  "quote_invoice_updated",
] as const;

export type ActivityType = (typeof activityTypes)[number];

interface LogActivityOptions {
  db: Db;
}
type TagValueMap = {
  type: NoteTagTypes;
  status: NoteTagStatus;
} & {
  [K in Exclude<NoteTagNames, "type" | "status">]: string;
};
export function transformActivityTags(
  // <T extends { tagName: string; tagValue: string }[],>
  ...tags: Array<Pick<Prisma.NoteTagsGetPayload<{}>, "tagName" | "tagValue">>
  // ...tags: T
): { [K in NoteTagNames]?: TagValueMap[K] } {
  const result = {} as { [K in NoteTagNames]?: TagValueMap[K] };
  tags.forEach((t) => {
    result[t.tagName] = t.tagValue as any;
  });
  return result;
}
