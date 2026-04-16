import { Prisma } from "@gnd/db";
import { UserData } from "./base";
import { ChannelName } from "./channels";
import { mergeTagRows } from "./tag-values";

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
  tagValue: TagValueMap[K],
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
): // ...tags: T
{ [K in NoteTagNames]?: TagValueMap[K] } {
  return mergeTagRows(tags as Array<{ tagName: string; tagValue: unknown }>) as {
    [K in NoteTagNames]?: TagValueMap[K];
  };
}

export const noteTagNames = [
  "channel",
  "itemControlUID",
  "dispatchId",
  "deliveryId",
  "packedBy",
  "receivedBy",
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
  "userId",
  "jobId",
  "jobControlId",
  "documentId",
  "documentIds",
  "projectId",
  "projectSlug",
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

// get email from and replyTo fields for a given sender and channel
export function generateEmailMeta(sender: UserData, channel: ChannelName) {
  return {
    from: `${sender.name} From GND Millwork<${
      sender.email?.split("@")[0]
    }@gndprodesk.com>`,
    replyTo: `${sender.email}`,
  };
}
