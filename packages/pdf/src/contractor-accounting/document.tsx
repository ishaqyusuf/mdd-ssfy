import {
	type ContractorPeriodReport,
	formatMoneyCents,
	getContractorAccountingEntryLabel,
	getContractorAdjustmentCents,
} from "@gnd/contractor-accounting";
/** @jsxImportSource react */
import {
	Document,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";

function currency(cents: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(formatMoneyCents(cents)));
}

function businessDate(value: string, timezone: string) {
	return new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontSize: 8,
		color: "#172033",
		backgroundColor: "#ffffff",
	},
	watermark: {
		position: "absolute",
		top: "32%",
		left: "18%",
		width: "64%",
		opacity: 0.045,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 18,
	},
	logo: { width: 90, height: 38, objectFit: "contain" },
	title: { fontSize: 19, fontWeight: 700, color: "#0f172a" },
	subtitle: { marginTop: 4, color: "#64748b", fontSize: 8 },
	metricGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 7,
		marginBottom: 18,
	},
	metric: {
		width: "23.5%",
		padding: 9,
		border: "1 solid #e2e8f0",
		borderRadius: 5,
	},
	metricLabel: {
		color: "#64748b",
		fontSize: 7,
		textTransform: "uppercase",
	},
	metricValue: { marginTop: 4, fontSize: 12, fontWeight: 700 },
	sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 7 },
	table: { border: "1 solid #e2e8f0", borderRadius: 4 },
	row: {
		flexDirection: "row",
		borderBottom: "1 solid #e2e8f0",
		minHeight: 24,
		alignItems: "center",
	},
	headerRow: { backgroundColor: "#f1f5f9", fontWeight: 700 },
	cell: { paddingHorizontal: 5, paddingVertical: 5 },
	contractor: { width: "28%" },
	money: { width: "14.4%", textAlign: "right" },
	date: { width: "13%" },
	type: { width: "15%" },
	description: { width: "30%" },
	detailContractor: { width: "20%" },
	detailMoney: { width: "12%", textAlign: "right" },
	job: { width: "10%" },
	footer: {
		position: "absolute",
		left: 30,
		right: 30,
		bottom: 18,
		flexDirection: "row",
		justifyContent: "space-between",
		color: "#64748b",
		fontSize: 7,
	},
	note: {
		marginTop: 14,
		padding: 10,
		backgroundColor: "#f8fafc",
		borderRadius: 5,
		color: "#475569",
		lineHeight: 1.45,
	},
});

function ReportHeader({
	report,
	baseUrl,
}: {
	report: ContractorPeriodReport;
	baseUrl?: string;
}) {
	const inclusiveEnd = new Date(
		new Date(report.period.toExclusive).getTime() - 1,
	).toISOString();

	return (
		<View style={styles.header}>
			<View>
				<Text style={styles.title}>Contractor Accounting Report</Text>
				<Text style={styles.subtitle}>
					{businessDate(report.period.from, report.period.timezone)} –{" "}
					{businessDate(inclusiveEnd, report.period.timezone)}
				</Text>
				<Text style={styles.subtitle}>
					Business timezone: {report.period.timezone}
				</Text>
			</View>
			{baseUrl ? (
				<Image src={`${baseUrl}/logo.png`} style={styles.logo} />
			) : null}
		</View>
	);
}

function PageFooter() {
	return (
		<View style={styles.footer} fixed>
			<Text>GND Contractor Accounting</Text>
			<Text
				render={({ pageNumber, totalPages }) =>
					`Page ${pageNumber} of ${totalPages}`
				}
			/>
		</View>
	);
}

export function ContractorAccountingPdfDocument({
	report,
	baseUrl,
}: {
	report: ContractorPeriodReport;
	baseUrl?: string;
}) {
	const summary = report.summary;

	return (
		<Document title="Contractor Accounting Report">
			<Page size="LETTER" style={styles.page}>
				{baseUrl ? (
					<Image src={`${baseUrl}/logo.png`} style={styles.watermark} fixed />
				) : null}
				<ReportHeader report={report} baseUrl={baseUrl} />
				<View style={styles.metricGrid}>
					{[
						["Opening balance", summary.openingBalanceCents],
						["Earned", summary.earnedCents],
						["Paid", summary.payoutCents],
						["Closing balance", summary.closingBalanceCents],
						["Bonuses", summary.bonusCents],
						["Expenses", summary.expenseCents],
						["Deductions", summary.deductionCents],
						["Reversals", summary.reversalCents],
					].map(([label, value]) => (
						<View key={String(label)} style={styles.metric}>
							<Text style={styles.metricLabel}>{label}</Text>
							<Text style={styles.metricValue}>{currency(Number(value))}</Text>
						</View>
					))}
				</View>

				<Text style={styles.sectionTitle}>Contractor balances</Text>
				<View style={styles.table}>
					<View style={[styles.row, styles.headerRow]} fixed>
						<Text style={[styles.cell, styles.contractor]}>Contractor</Text>
						<Text style={[styles.cell, styles.money]}>Opening</Text>
						<Text style={[styles.cell, styles.money]}>Earned</Text>
						<Text style={[styles.cell, styles.money]}>Adjustments</Text>
						<Text style={[styles.cell, styles.money]}>Paid</Text>
						<Text style={[styles.cell, styles.money]}>Closing</Text>
					</View>
					{report.contractors.map((contractor) => {
						const adjustments = getContractorAdjustmentCents(contractor);
						return (
							<View
								key={contractor.contractorId}
								style={styles.row}
								wrap={false}
							>
								<Text style={[styles.cell, styles.contractor]}>
									{contractor.contractorName}
								</Text>
								<Text style={[styles.cell, styles.money]}>
									{currency(contractor.openingBalanceCents)}
								</Text>
								<Text style={[styles.cell, styles.money]}>
									{currency(contractor.earnedCents)}
								</Text>
								<Text style={[styles.cell, styles.money]}>
									{currency(adjustments)}
								</Text>
								<Text style={[styles.cell, styles.money]}>
									{currency(contractor.payoutCents)}
								</Text>
								<Text style={[styles.cell, styles.money]}>
									{currency(contractor.closingBalanceCents)}
								</Text>
							</View>
						);
					})}
				</View>
				<Text style={styles.note}>
					Reconciliation: opening balance plus earned work, bonuses, expenses,
					deductions, payouts, and reversals equals closing contractor
					liability. All report surfaces use the same reviewed dataset.
				</Text>
				<PageFooter />
			</Page>

			<Page size="LETTER" style={styles.page} wrap>
				<ReportHeader report={report} baseUrl={baseUrl} />
				<Text style={styles.sectionTitle}>Transaction detail</Text>
				<View style={styles.table}>
					<View style={[styles.row, styles.headerRow]} fixed>
						<Text style={[styles.cell, styles.date]}>Date</Text>
						<Text style={[styles.cell, styles.detailContractor]}>
							Contractor
						</Text>
						<Text style={[styles.cell, styles.type]}>Type</Text>
						<Text style={[styles.cell, styles.description]}>Description</Text>
						<Text style={[styles.cell, styles.job]}>Reference</Text>
						<Text style={[styles.cell, styles.detailMoney]}>Amount</Text>
					</View>
					{report.entries.map((entry) => (
						<View key={entry.id} style={styles.row} wrap={false}>
							<Text style={[styles.cell, styles.date]}>
								{businessDate(entry.effectiveAt, report.period.timezone)}
							</Text>
							<Text style={[styles.cell, styles.detailContractor]}>
								{entry.contractorName}
							</Text>
							<Text style={[styles.cell, styles.type]}>
								{getContractorAccountingEntryLabel(entry.type)}
							</Text>
							<Text style={[styles.cell, styles.description]}>
								{entry.description || entry.projectTitle || "—"}
							</Text>
							<Text style={[styles.cell, styles.job]}>
								{entry.jobId
									? `Job ${entry.jobId}`
									: entry.paymentId
										? `Payout ${entry.paymentId}`
										: "—"}
							</Text>
							<Text style={[styles.cell, styles.detailMoney]}>
								{currency(entry.signedAmountCents)}
							</Text>
						</View>
					))}
				</View>
				<PageFooter />
			</Page>
		</Document>
	);
}
