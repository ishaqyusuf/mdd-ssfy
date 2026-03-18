"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { EmployeeOverview } from "../types";
import { EmployeeInfoHeader } from "./shared/employee-info-header";
import { OverviewStatCard } from "./shared/overview-stat-card";
import { SalesAnalytics } from "./analytics/sales-analytics";
import { ContractorAnalytics } from "./analytics/contractor-analytics";
import { ProductionAnalytics } from "./analytics/production-analytics";
import { EmployeeRecordsTab } from "./records/employee-records-tab";
import { Users, Briefcase, Package, CalendarDays } from "lucide-react";

interface Props {
    data: EmployeeOverview;
}

export function EmployeeOverviewPage({ data }: Props) {
    const hasAnalytics =
        data.analytics.sales ||
        data.analytics.contractor ||
        data.analytics.production;

    return (
        <div className="flex flex-col gap-6">
            <EmployeeInfoHeader
                name={data.user.name}
                email={data.user.email}
                phone={data.user.phone}
                roles={data.user.roles}
                insuranceStatus={data.insuranceStatus}
                profile={data.user.profile}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <OverviewStatCard
                    label="Roles"
                    value={data.user.roles.length}
                    icon={Users}
                />
                <OverviewStatCard
                    label="Records"
                    value={data.records.length}
                    icon={Briefcase}
                />
                <OverviewStatCard
                    label="Insurance"
                    value={data.insuranceStatus}
                    icon={Package}
                />
                <OverviewStatCard
                    label="Member Since"
                    value={new Date(data.user.createdAt).toLocaleDateString()}
                    icon={CalendarDays}
                />
            </div>

            <Tabs defaultValue="analytics">
                <TabsList>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="records">Records</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="mt-4">
                    {!hasAnalytics && (
                        <p className="text-sm text-muted-foreground">
                            No analytics available for this employee.
                        </p>
                    )}
                    {data.analytics.sales && (
                        <SalesAnalytics data={data.analytics.sales} />
                    )}
                    {data.analytics.contractor && (
                        <ContractorAnalytics
                            data={data.analytics.contractor}
                        />
                    )}
                    {data.analytics.production && (
                        <ProductionAnalytics
                            data={data.analytics.production}
                        />
                    )}
                </TabsContent>

                <TabsContent value="records" className="mt-4">
                    <EmployeeRecordsTab records={data.records} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
