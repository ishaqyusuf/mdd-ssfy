import { NoteTagNames } from "./constants";

export const noteTag = (tagName: NoteTagNames, tagValue) => ({
  tagName,
  tagValue: String(tagValue),
});
