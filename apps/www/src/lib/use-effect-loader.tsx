"use client";

import { useEffect, useState } from "react";
import { ServerPromiseType } from "@/types";

import { generateRandomString } from "./utils";

interface Props {
    onSuccess?;
    onError?;
    transform?;
    deps?;
    wait?;
}
export default function useEffectLoader<T extends (...args: any) => any>(
    fn: T,
    props: Props = {},
) {
    type DataType = Awaited<NonNullable<ReturnType<T>>>;
    const [data, setData] = useState<DataType>();
    const [ready, setReady] = useState(false);
    const [refreshToken, setRefreshToken] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            load();
        }, props.wait || 0);
    }, props.deps || []);
    async function load(r = false) {
        if (!fn) {
            return;
        }
        (fn as any)()?.then((res) => {
            setData(res);
            setReady(true);
            if (r) setRefreshToken(generateRandomString());
            props.onSuccess?.(res);
        });
    }
    return {
        data,
        ready,
        refresh: async () => await load(true),
        refreshToken,
    };
}
