"use client";

import { useEffect } from "react";
import { SalesFormClient } from "@/components/forms/sales-form/sales-form";

import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";

export function FormClient({ data }) {
    const zus = useFormDataStore();
    useEffect(() => {
        zus.init(zhInitializeState(data));
    }, []);
    return <SalesFormClient data={data} />;
}
