export function readSalesFormObjectMetadata(
	value: unknown,
): Record<string, any> | null {
	if (!value) return null;
	if (typeof value === "string") {
		try {
			return readSalesFormObjectMetadata(JSON.parse(value));
		} catch {
			return null;
		}
	}
	return typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, any>)
		: null;
}
