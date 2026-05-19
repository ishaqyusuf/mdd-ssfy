export function isSalesPdfSnapshotArtifactsDisabled() {
	return process.env.NODE_ENV === "production";
}
