// lib/useServerQuery.ts
import { useCallback, useState } from "react";

type QueryFn<TArgs, TResult> = (args: TArgs) => Promise<TResult>;

export function useServerQuery<TArgs, TResult>(
    queryFn: QueryFn<TArgs, TResult>,
    options?: {
        immediate?: boolean;
        args?: TArgs;
    },
) {
    const [data, setData] = useState<TResult | null>(null);
    const [error, setError] = useState<any>(null);
    const [loading, setLoading] = useState(options?.immediate ?? true);

    const run = useCallback(
        async (args?: TArgs) => {
            setLoading(true);
            setError(null);

            try {
                const result = await queryFn(args ?? (options?.args as TArgs));
                setData(result);
                return result;
            } catch (err) {
                setError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [queryFn, options?.args],
    );

    // Auto run on mount if `immediate` is true
    useState(() => {
        if (options?.immediate !== false && options?.args) {
            run(options.args);
        }
    });

    return { data, error, loading, refetch: run };
}
