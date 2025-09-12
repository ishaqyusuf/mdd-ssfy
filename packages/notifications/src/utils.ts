import { Prisma } from "@gnd/db";

export type TagFilters = ReturnType<typeof noteTagFilter>;
// export function filterNotesByTags(notes: GetNotes, tagFilters: TagFilters[]) {
//   const filteredNotes = notes.filter((note) => {
//     return tagFilters.every((tf) => {
//       const matchedTag = note.tags.find((t) => t.tagName == tf.tagName);
//       return matchedTag?.tagValue == tf?.tagValue;
//     });
//   });
//   return filteredNotes;
// }
// type TagValueMap = {
//   activity: ActivityType;
//   status: NoteTagStatus;
//   // other: string;
// } & {
//   [K in Exclude<NoteTagNames, "type" | "status">]: string;
// };

type TagValueMap = {
  activity: ActivityType;
  status: NoteTagStatus;
} & Record<Exclude<NoteTagNames, "activity" | "status">, string>;
export function noteTagFilter<K extends NoteTagNames>(
  tagName: K,
  tagValue: TagValueMap[K]
) {
  // export function noteTagFilter(tagName: NoteTagNames, tagValue: string) {
  return { tagName, tagValue: String(tagValue) };
}
export function composeNoteTags(tagFilters: TagFilters[]) {
  return {};
}
export function composeNoteTagToken(tags: TagFilters[]) {
  return tags
    .sort((a, b) => a.tagName.localeCompare(b.tagName))
    .map((tag) => `${tag.tagName}_is_${tag.tagValue}`)
    .join("_and_");
}
export function noteTokenToObject(tok: any): TagFilters[] {
  return tok?.split("_and_").map((tok) => {
    const [tagName, value] = tok.split("_is_");
    return { tagName, value };
  });
}
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

export const noteTagNames = [
  "itemControlUID",
  "deliveryId",
  "dispatchRecipient",
  "salesId",
  "salesNo",
  "salesItemId",
  "salesAssignment",
  "inboundStatus",
  "status",
  "type",
  "attachment",
  "signature",
  "activity",
] as const;
export type NoteTagNames = (typeof noteTagNames)[number];
export const noteTypes = [
  "email",
  "general",
  "payment",
  "production",
  "dispatch",
  "inbound",
  "activity",
] as const;
export type NoteTagTypes = (typeof noteTypes)[number];
export const noteStatus = ["public", "private"] as const;
export type NoteTagStatus = (typeof noteStatus)[number];
const activityTypes = [
  "sales_copied",
  "sales_moved",
  "quote_copied",
  "quote_moved",

  "sales_invoice_updated",
  "quote_invoice_updated",
] as const;

export type ActivityType = (typeof activityTypes)[number];
