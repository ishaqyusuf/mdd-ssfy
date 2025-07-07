import * as React from "react";

export function useDebounce<T>(value: T, delay?: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay ?? 500);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
export function useDebounceInput<T>(
    initialValue: T,
    delay?: number,
    fn?: (val: T) => void
) {
    const [value, setValue] = React.useState(initialValue);
    const db = useDebounce(value, delay);
    React.useEffect(() => {
        fn && fn(db);
    }, [db]);

    return {
        db,
        setValue,
        value,
    };
}
