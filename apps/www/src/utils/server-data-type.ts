import { AsyncFnType } from "@/types";

export function toFnType<T extends (...args: any) => any>(fn: T, data) {
    return data as AsyncFnType<T>;
}
