import { useTransition as useBaseTransition } from "react";

type AsyncFn = () => Promise<void> | void;

export function useTransition(): [boolean, (fn: AsyncFn) => void] {
    const [isPending, startTransition] = useBaseTransition();

    const safeStartTransition = (asyncFn: AsyncFn) => {
        startTransition(() => {
            void asyncFn();
        });
    };

    return [isPending, safeStartTransition];
}

