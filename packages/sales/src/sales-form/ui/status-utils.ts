import type { SalesFormSaveStatus } from "./types";

export function salesFormStatusLabel(
	saveStatus: SalesFormSaveStatus | undefined,
	dirty: boolean | undefined,
) {
	if (saveStatus === "saving") return "Saving...";
	if (saveStatus === "saved" && !dirty) return "All changes saved";
	if (saveStatus === "stale") return "Out of date";
	if (saveStatus === "error") return "Save failed";
	if (dirty) return "Unsaved changes";
	return "Idle";
}

export function salesFormStatusClass(
	saveStatus: SalesFormSaveStatus | undefined,
	dirty: boolean | undefined,
) {
	if (saveStatus === "saving")
		return "bg-amber-50 text-amber-700 border-amber-200";
	if (saveStatus === "saved" && !dirty)
		return "bg-emerald-50 text-emerald-700 border-emerald-200";
	if (saveStatus === "stale") return "bg-red-50 text-red-700 border-red-200";
	if (saveStatus === "error") return "bg-red-50 text-red-700 border-red-200";
	if (dirty) return "bg-orange-50 text-orange-700 border-orange-200";
	return "bg-muted text-muted-foreground border-border";
}
