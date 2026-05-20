export function isArrayParser(parser: any) {
	try {
		const result = parser.parse("test");
		return Array.isArray(result);
	} catch {
		return false;
	}
}
