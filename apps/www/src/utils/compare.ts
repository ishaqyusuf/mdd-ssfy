import { dotObject } from "@/app/(clean-code)/_common/utils/utils";
import { FieldPath } from "react-hook-form";

export function dotCompare<T extends object>(
    obj1: T,
    obj2: T,
    ...paths: FieldPath<T>[]
): boolean {
    return paths.every(
        (path) => dotObject.pick(path, obj1) === dotObject.pick(path, obj2),
    );
}
