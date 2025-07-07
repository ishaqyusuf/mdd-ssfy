"use client";
import { useAppSelector } from "@/store";
import { IWorkOrder } from "@/types/customer-service";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useEffect } from "react";
import { Info } from "../info";
import { DateCellContent } from "../columns/base-columns";
import { useDataPage } from "@/lib/data-page-context";

export default function WorkOrderOverviewSection({}) {
    const { data: workOrder } = useDataPage<IWorkOrder>();
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="inline-flex items-center space-x-2">
                        <span>
                            {workOrder.projectName} {workOrder.lot}
                            {"/"}
                            {workOrder.block}
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="divide-y space-y-4 flex flex-col">
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <Info label="Appointment">
                        <DateCellContent>
                            {workOrder.scheduleDate}
                        </DateCellContent>{" "}
                        <span>{workOrder.scheduleTime}</span>
                    </Info>

                    <Info label="Request Date">
                        {
                            <DateCellContent>
                                {workOrder.requestDate}
                            </DateCellContent>
                        }
                    </Info>
                    <Info
                        className="col-span-2 sm:col-span-3"
                        label="Job Description"
                    >
                        {workOrder.description}
                    </Info>
                    <Info
                        className="col-span-2 sm:col-span-3"
                        label="Contact Information"
                    >
                        <p>{workOrder.homeOwner}</p>
                        <p>{workOrder.homePhone}</p>
                        <p>{workOrder.homeAddress}</p>
                    </Info>
                    <Info label="">{}</Info>
                    <Info label="">{}</Info>
                </div>
            </CardContent>
        </Card>
    );
}
