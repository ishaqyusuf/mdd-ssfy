"use client";

import { Icons } from "@gnd/ui/icons";

import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useState } from "react";
import type { EmployeeOverview } from "../types";
import { ContractorAnalytics } from "./analytics/contractor-analytics";
import { ProductionAnalytics } from "./analytics/production-analytics";
import { SalesAnalytics } from "./analytics/sales-analytics";
import { EmployeeRecordsTab } from "./records/employee-records-tab";
import { RecordUploadForm } from "./records/record-upload-form";
import { EmployeeInfoHeader } from "./shared/employee-info-header";
import { OverviewStatCard } from "./shared/overview-stat-card";

interface Props {
	data: EmployeeOverview;
}

export function EmployeeOverviewPage({ data }: Props) {
	const auth = useAuth();
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const hasAnalytics =
		data.analytics.sales ||
		data.analytics.contractor ||
		data.analytics.production;
	const canUploadEmployeeDocuments = Boolean(auth?.can?.editEmployeeDocument);

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
					icon={Icons.Users}
				/>
				<OverviewStatCard
					label="Records"
					value={data.records.length}
					icon={Icons.Briefcase}
				/>
				<OverviewStatCard
					label="Insurance"
					value={data.insuranceStatus.replace("_", " ")}
					icon={Icons.Package}
				/>
				<OverviewStatCard
					label="Member Since"
					value={new Date(data.user.createdAt).toLocaleDateString()}
					icon={Icons.CalendarDays}
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
						<ContractorAnalytics data={data.analytics.contractor} />
					)}
					{data.analytics.production && (
						<ProductionAnalytics data={data.analytics.production} />
					)}
				</TabsContent>

				<TabsContent value="records" className="mt-4">
					<EmployeeRecordsTab
						records={data.records}
						onUpload={
							canUploadEmployeeDocuments
								? () => setIsUploadOpen(true)
								: undefined
						}
					/>
				</TabsContent>
			</Tabs>

			{canUploadEmployeeDocuments ? (
				<RecordUploadForm
					open={isUploadOpen}
					employeeId={data.user.id}
					onClose={() => setIsUploadOpen(false)}
				/>
			) : null}
		</div>
	);
}
