"use client";

import { ISlicer } from "@/store/slicers";
import React, { useEffect, useState } from "react";
import { DataTableFacetedFilter2 } from "./data-table-faceted-filter-2";
import { timeout } from "@/lib/timeout";
import { randomNumber, randomNumber2 } from "@/lib/utils";

interface Props {
    table;
    listKey: keyof ISlicer;
    labelKey?;
    valueKey?;
    single?: Boolean;
    title;
    loader?;
    columnId: string;
}
export function DynamicFilter({
    table,
    columnId,
    loader,
    listKey,
    ...props
}: Props) {
    // if(!listKey) listKey = generateRandomString
    // const list = useAppSelector((state) => state.slicers?.[listKey as any]);
    const [items, setItems] = useState([]);
    // const items: any = React.use(loader);
    useEffect(() => {
        (async () => {
            // console.log([columnId]);
            const w = randomNumber2(500, 1500);
            // console.log(w);
            await timeout(w as any);
            const resp = await loader();
            // console.log([columnId, resp]);
            setItems(resp);
        })();
    }, []);
    // useEffect(() => {
    //     // init();

    //     loadStaticList(listKey, list, loader);
    // }, [list, listKey, loader]);
    if (!items?.length) return <></>;
    return (
        <div>
            <DataTableFacetedFilter2
                column={table.getColumn(columnId)}
                {...props}
                options={(items as any)?.map((l) => {
                    return typeof l === "object" ? l : { label: l, value: l };
                })}
            />
        </div>
    );
}
