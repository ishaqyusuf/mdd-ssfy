export function getJobSaveAction({
	isSubmitMode,
	markAsComplete,
	jobId,
}: { isSubmitMode: boolean; markAsComplete: boolean; jobId?: number | null }):
	| "submit"
	| "update"
	| "re-assign" {
	if (isSubmitMode || markAsComplete) return "submit";
	return jobId ? "update" : "re-assign";
}
