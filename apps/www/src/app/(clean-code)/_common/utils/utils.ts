import _dotObject from "dot-object";
import { FieldPath, FieldPathValue } from "react-hook-form";
export const dotObject = _dotObject;
export function dotSet<T>(object: T) {
    // Cast to `any` since dotObject doesn't support TS inference
    return {
        set(key: FieldPath<T>, value?: FieldPathValue<T, typeof key>) {
            dotObject.set(key, value, object as any);
        },
    };
}
