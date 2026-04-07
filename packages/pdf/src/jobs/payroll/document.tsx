import { Document, Text, View } from "@react-pdf/renderer";
import { WatermarkPage } from "../../sales-v2/shared/watermark-page";
import {
	FooterTotal,
	MetricCard,
	ReportHeader,
	SectionCard,
} from "../shared/components";
import { ensureJobsPdfFonts } from "../shared/fonts";
import {
	formatCurrency,
	formatPrintDate,
	formatShortDate,
} from "../shared/formatters";
import {
	emptyTextStyle,
	metricRowStyle,
	pageStyle,
	statusRowStyle,
	tableCellTextStyle,
	tablePrimaryTextStyle,
	tableRowStyle,
	tableSecondaryTextStyle,
} from "../shared/styles";
import type { JobsPrintData, PayrollContractor } from "../shared/types";

export function JobsPayrollPdfDocument({
	data,
	baseUrl,
	title,
}: {
	data: JobsPrintData;
	baseUrl?: string;
	title?: string;
}) {
	ensureJobsPdfFonts();

	return (
		<Document title={title || data.title}>
			<PayrollSummaryPage data={data} baseUrl={baseUrl} />
			{(data.payroll?.contractors || []).map((contractor, index) => (
				<PayrollContractorPage
					key={String(contractor.contractorId || contractor.contractorName)}
					contractor={contractor}
					index={index}
					baseUrl={baseUrl}
					printedAt={data.printedAt}
				/>
			))}
		</Document>
	);
}

function PayrollSummaryPage({
	data,
	baseUrl,
}: {
	data: JobsPrintData;
	baseUrl?: string;
}) {
	const statusSummary = data.summary.statusSummary || [];

	return (
		<WatermarkPage wrap baseUrl={baseUrl} size="LETTER" style={pageStyle}>
			<ReportHeader
				baseUrl={baseUrl}
				title={data.title}
				subtitle="Overall unpaid jobs summary"
				metaLines={[
					{ label: "Context", value: "Payroll Report" },
					{ label: "Printed", value: formatPrintDate(data.printedAt) },
					{
						label: "Contractors",
						value: String(data.summary.contractorCount || 0),
					},
					{ label: "Unpaid Jobs", value: String(data.summary.jobCount) },
				]}
			/>

			<View style={metricRowStyle}>
				<MetricCard
					label="Contractors"
					value={String(data.summary.contractorCount || 0)}
				/>
				<MetricCard label="Unpaid Jobs" value={String(data.summary.jobCount)} />
				<MetricCard
					label="Unpaid Total"
					value={formatCurrency(data.summary.totalAmount)}
				/>
				<MetricCard
					label="Total Payable"
					value={formatCurrency(data.summary.totalPayable || 0)}
				/>
			</View>

			<SectionCard title="Contractor Summary">
				{(data.payroll?.contractors || []).map((contractor) => (
					<View
						key={String(contractor.contractorId || contractor.contractorName)}
						style={tableRowStyle}
					>
						<View style={{ width: "37%" }}>
							<Text style={tablePrimaryTextStyle}>
								{contractor.contractorName}
							</Text>
							<Text style={tableSecondaryTextStyle}>
								{contractor.contractorEmail || "No email on file"}
							</Text>
						</View>
						<View style={{ width: "15%" }}>
							<Text style={tableCellTextStyle}>{contractor.jobCount} jobs</Text>
						</View>
						<View style={{ width: "22%" }}>
							<Text style={tableCellTextStyle}>
								{formatCurrency(contractor.pendingBill)}
							</Text>
						</View>
						<View style={{ width: "26%" }}>
							<Text style={tableCellTextStyle}>
								{formatCurrency(contractor.totalPayable)}
							</Text>
						</View>
					</View>
				))}
			</SectionCard>

			<SectionCard title="Overall Status Totals">
				{statusSummary.length ? (
					statusSummary.map((item) => (
						<View key={item.status} style={statusRowStyle}>
							<Text style={tablePrimaryTextStyle}>{item.status}</Text>
							<Text style={tableCellTextStyle}>{item.jobCount} jobs</Text>
							<Text style={tableCellTextStyle}>
								{formatCurrency(item.totalAmount)}
							</Text>
						</View>
					))
				) : (
					<Text style={emptyTextStyle}>No unpaid jobs found.</Text>
				)}
			</SectionCard>

			<FooterTotal
				label="Total Payable"
				value={formatCurrency(data.summary.totalPayable || 0)}
				countLabel={`${data.summary.jobCount} unpaid jobs`}
				trailingLabel={`${data.summary.contractorCount || 0} contractors`}
			/>
		</WatermarkPage>
	);
}

function PayrollContractorPage({
	contractor,
	index,
	baseUrl,
	printedAt,
}: {
	contractor: PayrollContractor;
	index: number;
	baseUrl?: string;
	printedAt: Date | string;
}) {
	return (
		<WatermarkPage wrap baseUrl={baseUrl} size="LETTER" style={pageStyle}>
			<ReportHeader
				baseUrl={baseUrl}
				title={contractor.contractorName}
				subtitle={`Contractor breakdown ${index + 1}`}
				metaLines={[
					{ label: "Context", value: "Payroll Breakdown" },
					{ label: "Printed", value: formatPrintDate(printedAt) },
					{
						label: "Email",
						value: contractor.contractorEmail || "No email on file",
					},
					{
						label: "Charge",
						value: `${Number(contractor.chargePercentage || 0).toFixed(2)}%`,
					},
				]}
			/>

			<View style={metricRowStyle}>
				<MetricCard label="Unpaid Jobs" value={String(contractor.jobCount)} />
				<MetricCard
					label="Unpaid Total"
					value={formatCurrency(contractor.pendingBill)}
				/>
				<MetricCard
					label="Ready To Pay"
					value={formatCurrency(contractor.readyToPayAmount)}
				/>
				<MetricCard
					label="Total Payable"
					value={formatCurrency(contractor.totalPayable)}
				/>
			</View>

			<SectionCard title="Status Summary">
				{contractor.statusSummary.map((item) => (
					<View key={item.status} style={statusRowStyle}>
						<Text style={tablePrimaryTextStyle}>{item.status}</Text>
						<Text style={tableCellTextStyle}>{item.jobCount} jobs</Text>
						<Text style={tableCellTextStyle}>
							{formatCurrency(item.totalAmount)}
						</Text>
					</View>
				))}
			</SectionCard>

			<SectionCard title="Unpaid Jobs">
				{contractor.jobs.map((job) => (
					<View key={job.id} style={tableRowStyle}>
						<View style={{ width: "42%" }}>
							<Text style={tablePrimaryTextStyle}>
								#{job.id} {job.title}
								{job.subtitle ? ` - ${job.subtitle}` : ""}
							</Text>
							<Text style={tableSecondaryTextStyle}>
								{job.projectTitle}
								{[job.lotBlock, job.modelName].some(Boolean)
									? ` • ${[job.lotBlock, job.modelName].filter(Boolean).join(" • ")}`
									: ""}
							</Text>
						</View>
						<View style={{ width: "18%" }}>
							<Text style={tableCellTextStyle}>{job.status || "Unknown"}</Text>
						</View>
						<View style={{ width: "18%" }}>
							<Text style={tableCellTextStyle}>
								{formatCurrency(job.amount)}
							</Text>
						</View>
						<View style={{ width: "22%" }}>
							<Text style={tableCellTextStyle}>
								{formatShortDate(job.createdAt)}
							</Text>
						</View>
					</View>
				))}
			</SectionCard>

			<FooterTotal
				label="Total Payable"
				value={formatCurrency(contractor.totalPayable)}
				countLabel={`${contractor.jobCount} unpaid jobs`}
				trailingLabel={formatCurrency(contractor.pendingBill)}
			/>
		</WatermarkPage>
	);
}
