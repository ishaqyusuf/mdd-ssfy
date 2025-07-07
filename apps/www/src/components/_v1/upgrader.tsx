"use client";

// import fs from "fs";
// import dbUpgrade from "@/app/actions/upgrade/upgrade";
import { useCallback, useTransition } from "react";
import { insertJobs } from "@/app/(v1)/_actions/hrm-jobs/restore-jobs";
import {
    _debugUnitsWithNoProjects,
    linkHomeTemplateCosts,
    upgradeCommunity,
    upgradeCostCharts,
    upgradeHomeTemplateDesign,
    upgradeHomeTemplates,
    upgradeInstallCostToKeyValue,
    upgradeJobCostData,
} from "@/app/(v1)/_actions/upgrade/community";
import { salesSuppliers } from "@/app/(v1)/_actions/upgrade/fix-sales";
import {
    _updateJobHomeIdFromUnitId,
    removeRedundantPayments,
    resetJobUpgrade,
    upgradeCustomJobRemoveAddon,
    upgradeJobPaidStatus,
} from "@/app/(v1)/_actions/upgrade/jobs-upgrade";
import {
    dateUpdate,
    upgradeWorkOrder,
} from "@/app/(v1)/_actions/upgrade/work-order";
import { BringToFront } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { Icons } from "./icons";

export default function Upgrader() {
    const [isPending, startTransaction] = useTransition();
    const actions: { label; action?; children?: { label?; action? }[] }[] = [
        {
            label: "Sales Order",
            children: [{ label: "Suppliers", action: salesSuppliers }],
        },
        {
            label: "Work Orders",
            children: [
                { label: "Date Update", action: dateUpdate },
                { label: "Upgrade Tech", action: upgradeWorkOrder },
                { label: "Upgrade Request Date", action: upgradeWorkOrder },
            ],
        },
        {
            label: "Community",
            children: [
                {
                    label: "Units with no project",
                    action: _debugUnitsWithNoProjects,
                },
                { label: "Community", action: upgradeCommunity },
                { label: "Home Template", action: upgradeHomeTemplates },
                {
                    label: "Home Template Design",
                    action: upgradeHomeTemplateDesign,
                },
                // { label: "Install Price Chart", action: upgradeInstallPriceChart },
                { label: "Cost Chart", action: upgradeCostCharts },
                {
                    label: "Link Home Total Cost",
                    action: linkHomeTemplateCosts,
                },
                {
                    label: "Install Cost to Key Value",
                    action: upgradeInstallCostToKeyValue,
                },
            ],
        },
        {
            label: "Jobs",
            children: [
                { label: "upgrade job 2.0", action: insertJobs },
                {
                    label: "update job home id",
                    action: _updateJobHomeIdFromUnitId,
                },
                {
                    label: "Remove Addon on Custom Jobs ",
                    action: upgradeCustomJobRemoveAddon,
                },
                { label: "Reset Payment ", action: resetJobUpgrade },
                {
                    label: "Update Job Paid Status",
                    action: upgradeJobPaidStatus,
                },

                {
                    label: "Remove Redundancy Payments",
                    action: removeRedundantPayments,
                },
                {
                    label: "Jobs Cost Data",
                    action: upgradeJobCostData,
                },
            ],
        },
    ];
    const upgrade = useCallback(async () => {
        startTransaction(async () => {
            // await dbUpgradeAction();
            // await fixSales();
            // await changeIzriEmail();
            // console.log(await fixUsersMeta());
            toast.success("completed");
        });
    }, []);
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="destructive"
                        disabled={isPending}
                        size="icon"
                        className="flex h-8  data-[state=open]:bg-muted"
                    >
                        {isPending && (
                            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {/* <span className="">Upgrade</span> */}
                        <BringToFront className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[185px]">
                    {actions.map((a, id) => {
                        if (a.children)
                            return (
                                <DropdownMenuSub key={id}>
                                    <DropdownMenuSubTrigger>
                                        {a.label}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {a.children.map((ac, sid) => (
                                            <DropdownMenuItem
                                                key={`sub-${sid}`}
                                                onClick={() => {
                                                    startTransaction(
                                                        async () => {
                                                            console.log(
                                                                await ac.action(),
                                                            );
                                                        },
                                                    );
                                                }}
                                            >
                                                {ac.label}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            );
                        return (
                            <DropdownMenuItem
                                key={id}
                                onClick={() => {
                                    startTransaction(async () => {
                                        if (a.action)
                                            console.log(await a.action());
                                    });
                                }}
                            >
                                Install Price Chart
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            {/* <Btn isLoading={isPending} onClick={() => upgrade()}>
        Upgrade
      </Btn> */}
        </>
    );
}
function convertKeysToCamelCase(obj) {
    const camelCaseKey = (key) =>
        key.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
    //.replace(/\.([a-zA-Z])/g, (_, c) => c.toUpperCase());

    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const keys = key.split(".");
        let currentObj = newObj;

        for (const [index, camelKey] of keys.map(camelCaseKey).entries()) {
            if (index === keys.length - 1) {
                currentObj[camelKey] = value;
            } else {
                currentObj[camelKey] = currentObj[camelKey] || {};
                currentObj = currentObj[camelKey];
            }
        }
    }
    return newObj;
}
// function convertKeysToCamelCase(obj) {
//   const camelCaseKey = (key) =>
//     key.replace(/\.([a-zA-Z])/g, (_, c) => c.toUpperCase());

//   const newObj = {};
//   for (const [key, value] of Object.entries(obj)) {
//     const keys = key.split(".");
//     let currentObj = newObj;

//     for (const [index, camelKey] of keys.map(camelCaseKey).entries()) {
//       if (index === keys.length - 1) {
//         currentObj[camelKey] = value;
//       } else {
//         currentObj[camelKey] = currentObj[camelKey] || {};
//         currentObj = currentObj[camelKey];
//       }
//     }
//   }
//   return newObj;
// }
// function convertKeysToCamelCase(obj) {
//   const camelCaseKey = (key) =>
//     key.replace(/\.([a-zA-Z])/g, (_, c) => c.toUpperCase());

//   const newObj = {};
//   for (const [key, value] of Object.entries(obj)) {
//     const camelKey = camelCaseKey(key);
//     if (value !== null && typeof value === "object" && !Array.isArray(value)) {
//       newObj[camelKey] = convertKeysToCamelCase(value);
//     } else {
//       newObj[camelKey] = value;
//     }
//   }
//   return newObj;
// }
const design = {
    entry: {
        orientation: "LH",
        six_eight: "2 - 3-0",
        bore: "Two",
        material: "Fiber",
    },
    garage_door: { material: "Wood", bore: "TWO" },
    interior_door: {
        style: "PREHUNG COLONIST",
        casing_style: "WM366 COLONIAL 2-1/4",
        height_1: "6/8",
        two_six_1_lh: "4",
        two_eight_1_lh: "1",
        two_six_1_rh: "1",
    },
    double_door: [],
    bifold_door: {
        five: "2",
        two: "3",
        three_ll: "1 + 1 - 3/0 LL METAL",
        casing: "4 \u00bc",
        qty: "25/16",
    },
    lock_hardware: [],
    deco_shutters: [],
};
