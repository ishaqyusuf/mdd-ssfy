"use client";

import { ISalesOrder, ISalesOrderForm } from "@/types/sales";
import { DatePicker } from "../date-range-picker";
import { toast } from "sonner";
import { _updateSalesDate } from "@/app/(v1)/(loggedIn)/sales/update-sales-date";
import { useEffect, useState } from "react";
import { Label } from "@gnd/ui/label";

interface Props {
    form: ISalesOrderForm;
}

export default function UpdateSalesDate({ form }: Props) {
    const date = form.watch("createdAt");
    return (
        <div className="inline-flex items-center space-x-2">
            <Label>Date Created:</Label>
            <DatePicker
                setValue={(e) => form.setValue("createdAt", e)}
                className="w-auto h-8"
                value={date}
            />
        </div>
    );
}
