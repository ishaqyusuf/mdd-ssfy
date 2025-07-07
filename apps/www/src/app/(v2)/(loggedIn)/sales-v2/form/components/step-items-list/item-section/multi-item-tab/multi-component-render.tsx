"use client";

import { useContext, useEffect, useState } from "react";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import {
    DykeItemFormContext,
    useDykeForm,
} from "../../../../_hooks/form-context";
import useMultiDykeForm from "../../../../_hooks/use-multi-generator";

export default function MultiComponentRender({ Render, line = false }) {
    const form = useDykeForm();
    const mdf = useMultiDykeForm();
    const item = useContext(DykeItemFormContext);
    useEffect(() => {
        mdf.initialize();
    }, []);
    const total = form.watch(`itemArray.${item.rowIndex}.sectionPrice`);
    if (mdf.ready)
        return (
            <div className="max-w-[100vw] overflow-auto">
                <div className="sw-[200vw] flex flex-col  md:w-auto">
                    {line ? (
                        <div className="-mx-8 max-h-[300px] overflow-auto px-8">
                            <Table id="housePackageTable">
                                <TableHeader>
                                    <TableHead className="">Sn.</TableHead>
                                    <TableHead>
                                        {item.isType.moulding
                                            ? "Moulding"
                                            : "Description"}
                                    </TableHead>
                                    {item.isType.service && (
                                        <>
                                            <TableHead>Tax</TableHead>
                                            <TableHead>Production</TableHead>
                                        </>
                                    )}
                                    <TableHead>Qty</TableHead>
                                    {item.isType.moulding ? (
                                        <>
                                            {item.calculatedPriceMode ? (
                                                <>
                                                    <TableHead>
                                                        Estimate
                                                    </TableHead>
                                                    <TableHead>
                                                        Addon/Qty
                                                    </TableHead>
                                                </>
                                            ) : (
                                                <>
                                                    <TableHead>Price</TableHead>
                                                </>
                                            )}
                                            <TableHead>Line Total</TableHead>
                                        </>
                                    ) : (
                                        <>
                                            <TableHead>Unit Price</TableHead>
                                            <TableHead>Line Total</TableHead>
                                        </>
                                    )}
                                    <TableHead></TableHead>
                                </TableHeader>
                                <TableBody>
                                    {mdf.tabs?.map((tab, index) => (
                                        <TableRow
                                            className={cn(
                                                tab.deleted && "hidden",
                                                "border-none",
                                            )}
                                            key={index}
                                        >
                                            <TableCell>
                                                {mdf.tabs
                                                    .filter((t, i) => i < index)
                                                    .filter((t) => !t.deleted)
                                                    .length + 1}
                                            </TableCell>
                                            <Render
                                                mdf={mdf}
                                                componentTitle={tab.title}
                                            />
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        {item.isType.service && (
                                            <>
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                            </>
                                        )}
                                        {item.isType.moulding && (
                                            <>
                                                <TableCell></TableCell>
                                            </>
                                        )}
                                        <TableCell></TableCell>
                                        <TableCell>
                                            <Money value={total} />
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                            {item.isType.service && (
                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => {
                                            mdf.addServiceLine();
                                        }}
                                        size={"sm"}
                                    >
                                        <Icons.add className="mr-2 size-4" />
                                        <span>Add</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Tabs
                            defaultValue={mdf.currentTab}
                            onValueChange={mdf.setCurrentTab}
                            className={cn(line && "flex space-x-4")}
                        >
                            <TabsList
                                defaultValue={mdf.tabs?.[0]?.title}
                                className={cn(
                                    line && "flex w-1/3 flex-col",
                                    "h-auto",
                                )}
                            >
                                {mdf.tabs?.map((tab, index) => (
                                    <TabsTrigger
                                        value={tab.title}
                                        key={index}
                                        className="whitespace-normal"
                                    >
                                        {tab.title}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {mdf.tabs?.map((tab, index) => (
                                <TabsContent value={tab.title} key={index}>
                                    <div className="-mx-8 h-[300px] overflow-auto px-8">
                                        <Render componentTitle={tab.title} />
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </div>
            </div>
        );
}
