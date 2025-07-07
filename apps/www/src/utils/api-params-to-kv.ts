export function apiParamsTokV(searchParams) {
    const _search: Map<string, string> = new Map();
    searchParams.forEach((value, key) => _search.set(key, value));
    const _ = {
        ...Object.fromEntries(_search),
    };
    return _;
}
