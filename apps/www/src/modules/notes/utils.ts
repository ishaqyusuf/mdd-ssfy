import type { NoteTagNames } from "@gnd/utils/constants";

export type TagFilters = ReturnType<typeof noteTagFilter>;

export function noteTagFilter(tagName: NoteTagNames, tagValue) {
	return { tagName, tagValue: String(tagValue) };
}
