export function isArrayParser(parser) {
  try {
    const result = parser.parse("test"); // dummy input
    return Array.isArray(result);
  } catch {
    return false;
  }
}
