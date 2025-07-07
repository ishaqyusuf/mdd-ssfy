"use client";

import { useEffect, useMemo } from "react";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

import { ZusClass } from "./page-class";
import { useZusStore } from "./store";

export default function PageClient({}) {
    const store = useZusStore();
    const _name = store.data.name;

    useEffect(() => {
        store.setData({
            data: {
                name: "Ishaq Yusuf",
                stepSequence: {
                    formItem: ["kv"],
                    stepItem: {
                        kv: ["seq"],
                    },
                },
                kv: {
                    abc: {
                        name: "",
                    },
                },
            },
        });
    }, []);
    return (
        <div>
            VALUE: {_name}
            <div>
                <Label>LOREM</Label>
                <Input
                    defaultValue={store.data.name}
                    onChange={(e) => {
                        store.setData({
                            data: {
                                name: e.target.value,
                            },
                        });
                    }}
                />
                {store.data.stepSequence.formItem?.map((s) => (
                    <AbcClient uid={s} key={s} />
                ))}
            </div>
        </div>
    );
}

function AbcClient({ uid }) {
    const z = useZusStore();
    const formItem = z.data?.kv?.[uid];
    const sequence = useMemo(() => {
        return z.data?.stepSequence?.stepItem?.[uid];
    }, [z.data?.stepSequence?.stepItem?.[uid]]);
    const cls = useMemo(() => {
        console.log(">>>");
        return new ZusClass(uid, z);
    }, [uid]);
    useEffect(() => {
        console.log(">>>");
    }, []);
    return (
        <div>
            <Label>BLE</Label>
            {cls.name}
            <Input
                defaultValue={z.data.kv?.[uid]?.name}
                onChange={(e) => {
                    cls.storeName(e.target.value);
                }}
            />
            {sequence?.map((s) => <ExternalContent key={s} stepUid={s} />)}
        </div>
    );
}
function ExternalContent({ stepUid }) {
    useEffect(() => {
        console.log(">>>");
    }, []);
    return (
        <>
            <div>STEP</div>
            <span>{stepUid}</span>
        </>
    );
}
