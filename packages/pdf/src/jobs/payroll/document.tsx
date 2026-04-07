import { Document, Text, View } from "@react-pdf/renderer";
import { WatermarkPage } from "../../sales-v2/shared/watermark-page";
import {
	DetailCard,
	FooterTotal,
	MetricCard,
	Pill,
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
	amountCardStyle,
	amountLabelStyle,
	amountValueStyle,
	detailRowStyle,
	emptyTextStyle,
	jobCardHeaderStyle,
	jobCardStyle,
	jobDescriptionStyle,
	jobSecondaryStyle,
	jobTitleStyle,
	metricRowStyle,
	pageStyle,
	pillRowStyle,
	tableCellTextStyle,
	tablePrimaryTextStyle,
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
			{chunk(data.summary.statusSummary || [], 2).map(
				(statusChunk, chunkIndex) => (
					<PayrollOverallStatusPage
						key={`overall-status-${statusChunk.map((item) => item.status).join("-") || chunkIndex}`}
						data={data}
						statusItems={statusChunk}
						chunkIndex={chunkIndex}
						baseUrl={baseUrl}
					/>
				),
			)}
			{(data.payroll?.contractors || []).flatMap((contractor, index) => {
				const pages = [
					<PayrollContractorSummaryPage
						key={`summary-${String(contractor.contractorId || contractor.contractorName)}`}
						contractor={contractor}
						index={index}
						baseUrl={baseUrl}
						printedAt={data.printedAt}
					/>,
				];

				for (const [chunkIndex, statusChunk] of chunk(
					contractor.statusSummary,
					2,
				).entries()) {
					pages.push(
						<PayrollContractorStatusPage
							key={`status-${String(contractor.contractorId || contractor.contractorName)}-${chunkIndex}`}
							contractor={contractor}
							statusItems={statusChunk}
							index={index}
							chunkIndex={chunkIndex}
							baseUrl={baseUrl}
							printedAt={data.printedAt}
						/>,
					);
				}

				for (const [chunkIndex, jobsChunk] of chunk(
					contractor.jobs,
					1,
				).entries()) {
					pages.push(
						<PayrollContractorJobsPage
							key={`jobs-${String(contractor.contractorId || contractor.contractorName)}-${chunkIndex}`}
							contractor={contractor}
							jobs={jobsChunk}
							index={index}
							chunkIndex={chunkIndex}
							baseUrl={baseUrl}
							printedAt={data.printedAt}
						/>,
					);
				}

				return pages;
			})}
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
	return (
		<WatermarkPage
			baseUrl={baseUrl}
			watermarkText="Payroll Report"
			size="LETTER"
			style={pageStyle}
		>
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

			<FooterTotal
				label="Total Payable"
				value={formatCurrency(data.summary.totalPayable || 0)}
				countLabel={`${data.summary.jobCount} unpaid jobs`}
				trailingLabel={`${data.summary.contractorCount || 0} contractors`}
			/>
		</WatermarkPage>
	);
}

function PayrollOverallStatusPage({
	data,
	statusItems,
	chunkIndex,
	baseUrl,
}: {
	data: JobsPrintData;
	statusItems: NonNullable<JobsPrintData["summary"]["statusSummary"]>;
	chunkIndex: number;
	baseUrl?: string;
}) {
	return (
		<WatermarkPage
			baseUrl={baseUrl}
			watermarkText="Payroll Report"
			size="LETTER"
			style={pageStyle}
		>
			<ReportHeader
				baseUrl={baseUrl}
				title={data.title}
				subtitle={`Overall status totals ${chunkIndex + 1}`}
				metaLines={[
					{ label: "Context", value: "Payroll Report" },
					{ label: "Printed", value: formatPrintDate(data.printedAt) },
					{ label: "Statuses", value: String(statusItems.length) },
					{ label: "Unpaid Jobs", value: String(data.summary.jobCount) },
				]}
			/>

			<SectionCard title="Overall Status Totals">
				{statusItems.length ? (
					statusItems.map((item) => (
						<View key={item.status} style={jobCardStyle}>
							<View style={jobCardHeaderStyle}>
								<View style={{ width: "76%" }}>
									<View style={pillRowStyle}>
										<Pill value="STATUS" dark />
										<Pill value={`${item.jobCount} JOBS`} />
									</View>
									<Text style={jobTitleStyle}>{item.status}</Text>
								</View>

								<View style={amountCardStyle}>
									<Text style={amountLabelStyle}>Amount</Text>
									<Text style={amountValueStyle}>
										{formatCurrency(item.totalAmount)}
									</Text>
								</View>
							</View>
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

function PayrollContractorSummaryPage({
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
		<WatermarkPage
			baseUrl={baseUrl}
			watermarkText="Payroll Report"
			size="LETTER"
			style={pageStyle}
		>
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

			<FooterTotal
				label="Total Payable"
				value={formatCurrency(contractor.totalPayable)}
				countLabel="Status summary page"
				trailingLabel={formatCurrency(contractor.pendingBill)}
			/>
		</WatermarkPage>
	);
}

function PayrollContractorStatusPage({
	contractor,
	statusItems,
	index,
	chunkIndex,
	baseUrl,
	printedAt,
}: {
	contractor: PayrollContractor;
	statusItems: PayrollContractor["statusSummary"];
	index: number;
	chunkIndex: number;
	baseUrl?: string;
	printedAt: Date | string;
}) {
	return (
		<WatermarkPage
			baseUrl={baseUrl}
			watermarkText="Payroll Report"
			size="LETTER"
			style={pageStyle}
		>
			<ReportHeader
				baseUrl={baseUrl}
				title={contractor.contractorName}
				subtitle={`Status summary ${index + 1}.${chunkIndex + 1}`}
				metaLines={[
					{ label: "Context", value: "Payroll Breakdown" },
					{ label: "Printed", value: formatPrintDate(printedAt) },
					{
						label: "Email",
						value: contractor.contractorEmail || "No email on file",
					},
					{ label: "Statuses", value: String(statusItems.length) },
				]}
			/>

			<SectionCard title="Status Summary">
				{statusItems.map((item) => (
					<View key={item.status} style={jobCardStyle}>
						<View style={jobCardHeaderStyle}>
							<View style={{ width: "76%" }}>
								<View style={pillRowStyle}>
									<Pill value="STATUS" dark />
									<Pill value={`${item.jobCount} JOBS`} />
								</View>
								<Text style={jobTitleStyle}>{item.status}</Text>
							</View>

							<View style={amountCardStyle}>
								<Text style={amountLabelStyle}>Amount</Text>
								<Text style={amountValueStyle}>
									{formatCurrency(item.totalAmount)}
								</Text>
							</View>
						</View>
					</View>
				))}
			</SectionCard>

			<FooterTotal
				label="Total Payable"
				value={formatCurrency(contractor.totalPayable)}
				countLabel="Status summary page"
				trailingLabel={formatCurrency(contractor.pendingBill)}
			/>
		</WatermarkPage>
	);
}

function PayrollContractorJobsPage({
	contractor,
	jobs,
	index,
	chunkIndex,
	baseUrl,
	printedAt,
}: {
	contractor: PayrollContractor;
	jobs: PayrollContractor["jobs"];
	index: number;
	chunkIndex: number;
	baseUrl?: string;
	printedAt: Date | string;
}) {
	return (
		<WatermarkPage
			baseUrl={baseUrl}
			watermarkText="Payroll Report"
			size="LETTER"
			style={pageStyle}
		>
			<ReportHeader
				baseUrl={baseUrl}
				title={contractor.contractorName}
				subtitle={`Contractor jobs ${index + 1}.${chunkIndex + 1}`}
				metaLines={[
					{ label: "Context", value: "Payroll Breakdown" },
					{ label: "Printed", value: formatPrintDate(printedAt) },
					{
						label: "Email",
						value: contractor.contractorEmail || "No email on file",
					},
					{
						label: "Page Jobs",
						value: String(jobs.length),
					},
				]}
			/>

			<SectionCard title="Unpaid Jobs">
				{jobs.map((job) => (
					<View key={job.id} style={jobCardStyle}>
						<View style={jobCardHeaderStyle}>
							<View style={{ width: "76%" }}>
								<View style={pillRowStyle}>
									<Pill value="JOB" dark />
									<Pill value={job.status || "Unknown"} subtle />
								</View>
								<Text style={jobTitleStyle}>
									#{job.id} {job.title}
									{job.subtitle ? ` - ${job.subtitle}` : ""}
								</Text>
								<Text style={jobSecondaryStyle}>{job.projectTitle}</Text>
								<Text style={jobDescriptionStyle}>
									Date: {formatShortDate(job.createdAt)}
								</Text>
							</View>

							<View style={amountCardStyle}>
								<Text style={amountLabelStyle}>Amount</Text>
								<Text style={amountValueStyle}>
									{formatCurrency(job.amount)}
								</Text>
							</View>
						</View>

						<View style={detailRowStyle}>
							<DetailCard label="Status" value={job.status || "Unknown"} />
							<DetailCard label="Project" value={job.projectTitle} />
							<DetailCard
								label="Unit"
								value={
									[job.lotBlock, job.modelName].filter(Boolean).join(" • ") ||
									"No unit details"
								}
							/>
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

function chunk<T>(items: T[], size: number) {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}
