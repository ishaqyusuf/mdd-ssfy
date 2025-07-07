"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSettingAction } from "@/app/(v1)/_actions/settings";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { IJobPayment, IJobs } from "@/types/hrm";
import { InstallCostLine, InstallCostSettings } from "@/types/settings";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import {
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import { Info } from "../info";
import Money from "../money";
import BaseSheet from "./base-sheet";

export default function PaymentOverviewSheet() {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    useEffect(() => {
        getSettingAction<InstallCostSettings>("install-price-chart").then(
            (res) => {
                setCostSetting(res);
            },
        );
    }, []);
    const [costSetting, setCostSetting] = useState<InstallCostSettings>(
        {} as any,
    );
    async function init(data) {}
    return (
        <BaseSheet<IJobPayment>
            className="w-full sm:max-w-[550px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName="paymentOverview"
            Title={({ data }) => (
                <div>
                    <div className="">{data?.user.name}</div>
                </div>
            )}
            Description={({ data }) => (
                <div className="flex justify-between">
                    {/* <div>{data?.jobs?.length} Jobs</div> */}
                    {/* <div></div> */}
                    <div className="inline-flex space-x-4">
                        <Info label="Total Jobs">
                            <div className="font-bold">
                                <Money value={data?.jobs?.length} />
                            </div>
                        </Info>
                        <Info label="Discount">
                            <div className="font-bold">
                                <Money value={data?.charges} />
                            </div>
                        </Info>
                        <Info label="Paid">
                            <div className="font-bold">
                                <Money value={data?.amount} />
                            </div>
                        </Info>
                    </div>
                </div>
            )}
            Content={({ data }) => (
                <div>
                    <ScrollArea className="h-screen ">
                        <div className="mb-28   mt-6   grid items-start text-sm">
                            {data?.jobs.map((job, index) => (
                                <Content
                                    key={index}
                                    costSetting={costSetting}
                                    index={index}
                                    data={{
                                        ...job,
                                        payment: data,
                                    }}
                                />
                            ))}
                            {/* <Content data={data as any} /> */}
                        </div>
                    </ScrollArea>
                </div>
            )}
            //   Footer={({ data }) => (
            //     <Btn
            //       isLoading={isSaving}
            //       onClick={() => submit()}
            //       size="sm"
            //       type="submit"
            //     >
            //       Save
            //     </Btn>
            //   )}
        />
    );
}
// function CollapsibleJob({data}:{data:Ijob})
function Content({
    data,
    index,
    costSetting,
}: {
    index;
    costSetting;
    data: IJobs;
}) {
    const [job, setJob] = useState<IJobs>(data);

    const [isOpen, setIsOpen] = useState<any>(false);
    const [divider, setDivider] = useState(data?.coWorkerId ? 2 : 1);
    const [showAll, setShowAll] = useState(false);
    return (
        <Collapsible
            key={job.id}
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border-b"
        >
            <CollapsibleTrigger
                className={cn(
                    "flex w-full items-center space-x-4 border-b p-2",
                    isOpen && "bg-accent",
                )}
            >
                <div className="inline-flex">
                    <div className="w-6 text-start">{index + 1}.</div>
                    <div className="text-start">
                        <h4 className="text-sm font-semibold uppercase">
                            {job.title || "No Title"}
                        </h4>
                        <p className="">{job.subtitle || "No Description"}</p>
                    </div>
                </div>
                <div className="flex-1"></div>
                <Money value={job.amount} />
                <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronsUpDown className="h-4 w-4" />
                    <span className="sr-only">Toggle</span>
                </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="m-4">
                <>
                    <section
                        id="info"
                        className="col-span-2 grid grid-cols-2 items-start gap-4"
                    >
                        {/* <Info label="Done By">
          <p>{data?.user?.name}</p>
          <DateCellContent>{data?.user?.createdAt}</DateCellContent>
        </Info> */}
                        <Info label="Job Type">
                            <p className="uppercase">{data?.type}</p>
                        </Info>
                        <Info label="Additional Cost">
                            <Money
                                value={data?.meta.additional_cost / divider}
                            />
                            <div>{data?.description || "No Comment"}</div>
                        </Info>
                        <Info label="Addon Cost">
                            <Money value={job?.meta.addon / divider} />
                        </Info>
                        <Info label="Total Cost">
                            <Money value={job?.amount} />
                        </Info>
                        <Info label="Payment">
                            {job?.payment ? (
                                <>
                                    <p>{job?.payment.checkNo}</p>
                                    <DateCellContent>
                                        {job?.payment.createdAt}
                                    </DateCellContent>
                                </>
                            ) : (
                                <>No payment</>
                            )}
                        </Info>
                        <Info className="" label="Job Comment">
                            <div>{data?.note || "No Comment"}</div>
                        </Info>
                    </section>
                    {job.meta?.costData && (
                        <div className="col-span-2">
                            <Table className="">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-1">
                                            Task
                                        </TableHead>
                                        <TableHead className="px-1">
                                            Qty
                                        </TableHead>
                                        <TableHead className="px-1">
                                            Total
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costSetting?.meta?.list
                                        ?.filter(
                                            (l) =>
                                                (job.meta.costData[l.uid]
                                                    ?.qty || 0) > 0,
                                        )
                                        .map((cd, i) => (
                                            <TaskRow
                                                key={i}
                                                job={job}
                                                index={i}
                                                setJob={setJob}
                                                row={cd}
                                            />
                                        ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </>
            </CollapsibleContent>
        </Collapsible>
    );
}
interface TaskRowProps {
    row: InstallCostLine;
    job: IJobs;
    index;
    setJob;
}
function TaskRow({ row, index, job, setJob }: TaskRowProps) {
    const { cost, qty: __qty } = job.meta.costData[row.uid] as any;
    const [qty, setQty] = useState(__qty);
    const [dVal, setDVal] = useState(false);
    const [divider, setDivider] = useState(job?.coWorkerId ? 2 : 1);
    useEffect(() => {
        if (qty != job.meta.costData[row.uid]?.qty) setDVal(qty);
    }, [qty, job]);
    const deb = useDebounce(dVal, 800);
    useEffect(() => {
        // console.log(deb);
    }, [deb]);
    function blurred(e) {
        // console.log("BLURRED VALUE", qty);
    }
    return (
        <TableRow>
            <TableCell className="px-1">
                <PrimaryCellContent>{row.title}</PrimaryCellContent>
                <SecondaryCellContent>
                    <Money value={cost || row.cost} />
                </SecondaryCellContent>
            </TableCell>
            <TableCell className="px-1">
                <Input
                    onBlur={blurred}
                    disabled
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    type="number"
                    className="h-8 w-16"
                />
            </TableCell>
            <TableCell className="px-1">
                <SecondaryCellContent>
                    <Money value={qty * (cost || row.cost)} />
                </SecondaryCellContent>
            </TableCell>
        </TableRow>
    );
}
