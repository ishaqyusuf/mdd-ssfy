import { Document, Text, View } from "@react-pdf/renderer";
import { WatermarkPage } from "../../sales-v2/shared/watermark-page";
import {
	DetailCard,
	FooterTotal,
	MetricCard,
	Pill,
	ReportHeader,
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
	jobCardHeaderStyle,
	jobCardStyle,
	jobDescriptionStyle,
	jobSecondaryStyle,
	jobTitleStyle,
	metricRowStyle,
	pageStyle,
	pillRowStyle,
} from "../shared/styles";
import type { JobsPrintData } from "../shared/types";

export function JobsSelectionPdfDocument({
	data,
	baseUrl,
	title,
}: {
	data: JobsPrintData;
	baseUrl?: string;
	title?: string;
}) {
	ensureJobsPdfFonts();

	const contractorNames = Array.from(
		new Set(data.jobs.map((job) => job.contractorName).filter(Boolean)),
	);
	const hasSingleContractor = contractorNames.length === 1;
	const contractorLabel = hasSingleContractor
		? contractorNames[0]
		: `${contractorNames.length} contractors`;
	const contextLabel =
		data.context === "payment-portal"
			? "Payment Portal Selection"
			: "Jobs List";

	return (
		<Document title={title || data.title}>
			<WatermarkPage wrap baseUrl={baseUrl} size="LETTER" style={pageStyle}>
				<ReportHeader
					baseUrl={baseUrl}
					title={data.title}
					subtitle={
						hasSingleContractor ? `Contractor: ${contractorLabel}` : undefined
					}
					metaLines={[
						{ label: "Context", value: contextLabel },
						{ label: "Printed", value: formatPrintDate(data.printedAt) },
						{ label: "Jobs", value: String(data.summary.jobCount) },
						{ label: "Total", value: formatCurrency(data.summary.totalAmount) },
					]}
				/>

				<View style={metricRowStyle}>
					<MetricCard
						label="Selected Jobs"
						value={String(data.summary.jobCount)}
					/>
					<MetricCard
						label="Total Amount"
						value={formatCurrency(data.summary.totalAmount)}
					/>
					<MetricCard
						label={hasSingleContractor ? "Contractor" : "Contractors"}
						value={contractorLabel}
					/>
				</View>

				{data.jobs.map((job, index) => (
					<View key={job.id} wrap={false} style={jobCardStyle}>
						<View style={jobCardHeaderStyle}>
							<View style={{ width: "76%" }}>
								<View style={pillRowStyle}>
									<Pill value={`JOB ${index + 1}`} dark />
									<Pill value={String(job.jobType || "v2").toUpperCase()} />
									<Pill value={job.status || "Unknown"} subtle />
								</View>
								<Text style={jobTitleStyle}>
									#{job.id} {job.title}
									{job.subtitle ? ` - ${job.subtitle}` : ""}
								</Text>
								{job.builderTaskName ? (
									<Text style={jobSecondaryStyle}>
										Builder Task: {job.builderTaskName}
									</Text>
								) : null}
								{job.description ? (
									<Text style={jobDescriptionStyle}>{job.description}</Text>
								) : null}
							</View>

							<View style={amountCardStyle}>
								<Text style={amountLabelStyle}>Amount</Text>
								<Text style={amountValueStyle}>
									{formatCurrency(job.amount)}
								</Text>
							</View>
						</View>

						<View style={detailRowStyle}>
							{!hasSingleContractor ? (
								<DetailCard label="Contractor" value={job.contractorName} />
							) : null}
							<DetailCard label="Project" value={job.projectTitle} />
							<DetailCard
								label="Unit"
								value={
									[job.lotBlock, job.modelName].filter(Boolean).join(" • ") ||
									"No unit details"
								}
							/>
							<DetailCard
								label="Created"
								value={formatShortDate(job.createdAt)}
							/>
						</View>
					</View>
				))}

				<FooterTotal
					label="Print Total"
					value={formatCurrency(data.summary.totalAmount)}
					countLabel={`${data.summary.jobCount} jobs selected`}
					trailingLabel={contractorLabel}
				/>
			</WatermarkPage>
		</Document>
	);
}
