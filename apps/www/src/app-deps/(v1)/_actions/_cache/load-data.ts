"use server";

export type CacheNames =
    | "1099-contractors"
    | "punchouts"
    | "employees"
    | "projects"
    | "job-employees"
    | "install-price-chart";
export async function _cache<T>(
    name: CacheNames | string,
    fn: () => Promise<T> | T,
    group: unknown = null,
) {
    const c = await fn();

    return c;
}
