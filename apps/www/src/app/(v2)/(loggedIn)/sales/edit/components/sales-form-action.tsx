import { useContext, useState } from "react";

import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { Switch } from "@gnd/ui/switch";

import { SalesFormContext } from "../ctx";
import useSaveSalesHook from "../hooks/use-save-sales";
import { ISalesForm } from "../type";

export default function SalesFormAction() {
    const ctx = useContext(SalesFormContext);
    const form = useFormContext<ISalesForm>();
    const date = form.watch("createdAt");
    const saveHook = useSaveSalesHook();
    const overviewQuery = useSalesOverviewQuery();

    const [value, setValue] = useState("");
    return (
        <div className="flex items-center justify-between">
            <div className="">
                <h2 className="text-2xl font-bold tracking-tight">
                    {ctx.data?.form?.orderId &&
                    ctx?.data?.form?.id &&
                    ctx?.data?.form?.type == "order"
                        ? "Sales"
                        : "Quote"}{" "}
                    {ctx.data?.form?.orderId && `| ${ctx.data?.form?.orderId}`}
                </h2>
            </div>

            <div className="flex-1 px-4"></div>
            <div className="flex space-x-2">
                {(ctx.mockupPercentage || 0) > 0 && (
                    <div className="inline-flex items-center space-x-2">
                        <Label>Mockup Mode</Label>
                        <Switch
                            checked={ctx.toggleMockup as any}
                            onCheckedChange={(e) => {
                                ctx.setToggleMockup(e);
                            }}
                        />
                    </div>
                )}
                <div className="inline-flex items-center space-x-2">
                    <Label>Date Created:</Label>
                    <DatePicker
                        setValue={(e) => form.setValue("createdAt", e)}
                        className="h-8 w-auto"
                        value={date}
                    />
                </div>
                {ctx.data.form?.id && (
                    <Button
                        onClick={() => {
                            overviewQuery.open2(
                                ctx.data?.form?.orderId,
                                ctx.data?.form?.type == "order"
                                    ? "sales"
                                    : "quote",
                            );
                        }}
                        size="xs"
                    >
                        Overview
                    </Button>
                )}
                <Menu
                    variant={"secondary"}
                    disabled={ctx.toggleMockup}
                    label="Save"
                    Icon={null}
                >
                    <MenuItem Icon={Icons.save} onClick={() => saveHook.save()}>
                        Save
                    </MenuItem>
                    <MenuItem
                        Icon={Icons.saveAndClose}
                        onClick={() => saveHook.save("close")}
                    >
                        Save & Close
                    </MenuItem>
                    <MenuItem
                        Icon={Icons.add}
                        onClick={() => saveHook.save("new")}
                    >
                        Save & New
                    </MenuItem>
                </Menu>
            </div>
        </div>
    );
}
