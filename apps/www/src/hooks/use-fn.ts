import { useEffect, useState } from "react";

type NonNullableAsyncReturnType<T extends (...args: any) => Promise<any>> =
    NonNullable<Awaited<ReturnType<T>>>;
export default function useFn<T extends (...args: any) => Promise<any>>(fn: T) {
    // useFn<T>(fn: T) {
    // make this error disspear without too much change to code, i want to make data typescript enabled,
    const [data, setData] = useState<NonNullableAsyncReturnType<T>>(
        null as any
    );
    useEffect(() => {
        // (async () => {
        //     const resp = await (fn as any)();
        //     setData(resp);
        // })();
        _action();
    }, []);
    async function _action() {
        const resp = await (fn as any)();
        setData(resp);
    }
    return {
        data,
        refresh() {
            _action();
        },
    };
}
