"use client";

import { useLayoutEffect, useMemo } from "react";
import { SalesFormClient } from "@/components/forms/sales-form/sales-form";

import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";

export function FormClient({ data }) {
    const init = useFormDataStore((state) => state.init);
    const initialState = useMemo(() => zhInitializeState(data), [data]);

    useLayoutEffect(() => {
        init(initialState);
    }, [initialState, init]);

    return <SalesFormClient data={data} />;
}
