import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatDate(value?: Date | string | null) {
	if (!value) return "N/A";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

const styles = StyleSheet.create({
	page: {
		padding: 28,
		fontSize: 10,
		color: "#0f172a",
	},
	header: {
		marginBottom: 18,
		borderBottomWidth: 1,
		borderBottomColor: "#cbd5e1",
		paddingBottom: 12,
	},
	title: {
		fontSize: 18,
		fontWeight: 700,
	},
	subtitle: {
		marginTop: 4,
		fontSize: 10,
		color: "#475569",
	},
	metricRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 14,
	},
	metricCard: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 10,
	},
	metricLabel: {
		fontSize: 9,
		color: "#64748b",
		textTransform: "uppercase",
	},
	metricValue: {
		marginTop: 4,
		fontSize: 15,
		fontWeight: 700,
	},
	payoutCard: {
		borderWidth: 1,
		borderColor: "#dbe3ee",
		padding: 12,
		marginBottom: 12,
	},
	rowBetween: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
	},
	payoutTitle: {
		fontSize: 13,
		fontWeight: 700,
	},
	muted: {
		fontSize: 9,
		color: "#64748b",
		marginTop: 2,
	},
	totalValue: {
		fontSize: 14,
		fontWeight: 700,
	},
	sectionLabel: {
		marginTop: 10,
		marginBottom: 6,
		fontSize: 9,
		fontWeight: 700,
		textTransform: "uppercase",
		color: "#475569",
	},
	tableHeader: {
		flexDirection: "row",
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#cbd5e1",
		backgroundColor: "#f8fafc",
		paddingVertical: 6,
		paddingHorizontal: 6,
		marginTop: 4,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
		paddingVertical: 6,
		paddingHorizontal: 6,
	},
	colWide: {
		flex: 2.8,
	},
	colMid: {
		flex: 1.2,
	},
	colAmt: {
		flex: 1,
		textAlign: "right",
	},
	cellText: {
		fontSize: 9,
	},
	cellStrong: {
		fontSize: 9,
		fontWeight: 700,
	},
	footer: {
		marginTop: 12,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "#cbd5e1",
		flexDirection: "row",
		justifyContent: "space-between",
	},
});

type ContractorPayoutPrintData = {
	title: string;
	printedAt: Date | string;
	summary: {
		payoutCount: number;
		totalAmount: number;
		totalJobs: number;
	};
	payouts: Array<{
		id: number;
		amount: number;
		subTotal: number;
		charges: number;
		paymentMethod: string;
		checkNo: string | null;
		createdAt: Date | string;
		paidTo: {
			id: number;
			name: string;
			email: string | null;
		} | null;
		authorizedBy: {
			id: number;
			name: string;
		} | null;
		jobCount: number;
		adjustments: Array<{
			id: number;
			type: string;
			description: string | null;
			amount: number;
			createdAt: Date | string;
		}>;
		jobs: Array<{
			id: number;
			title: string | null;
			subtitle: string | null;
			amount: number;
			status: string | null;
			createdAt: Date | string;
			projectTitle: string | null;
			lotBlock: string | null;
			modelName: string | null;
		}>;
	}>;
};

export function ContractorPayoutPdfDocument({
	data,
	title,
}: {
	data: ContractorPayoutPrintData;
	baseUrl?: string;
	title?: string;
}) {
	return (
		<Document title={title || data.title}>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>Contractor Payout Report</Text>
					<Text style={styles.subtitle}>
						Printed {formatDate(data.printedAt)} • {data.summary.payoutCount} payout
						{data.summary.payoutCount === 1 ? "" : "s"}
					</Text>
				</View>

				<View style={styles.metricRow}>
					<View style={styles.metricCard}>
						<Text style={styles.metricLabel}>Payouts</Text>
						<Text style={styles.metricValue}>{data.summary.payoutCount}</Text>
					</View>
					<View style={styles.metricCard}>
						<Text style={styles.metricLabel}>Jobs Included</Text>
						<Text style={styles.metricValue}>{data.summary.totalJobs}</Text>
					</View>
					<View style={styles.metricCard}>
						<Text style={styles.metricLabel}>Total Paid</Text>
						<Text style={styles.metricValue}>
							{formatCurrency(data.summary.totalAmount)}
						</Text>
					</View>
				</View>

				{data.payouts.map((payout) => (
					<View key={payout.id} style={styles.payoutCard} wrap={false}>
						<View style={styles.rowBetween}>
							<View style={{ flex: 1 }}>
								<Text style={styles.payoutTitle}>Payout #{payout.id}</Text>
								<Text style={styles.muted}>
									{payout.paidTo?.name || "Unknown contractor"} •{" "}
									{formatDate(payout.createdAt)}
								</Text>
								<Text style={styles.muted}>
									Authorized by {payout.authorizedBy?.name || "Unknown payer"} •{" "}
									{payout.paymentMethod}
									{payout.checkNo ? ` • Check ${payout.checkNo}` : ""}
								</Text>
							</View>
							<View>
								<Text style={styles.totalValue}>
									{formatCurrency(payout.amount)}
								</Text>
								<Text style={[styles.muted, { textAlign: "right" }]}>
									{payout.jobCount} job{payout.jobCount === 1 ? "" : "s"}
								</Text>
							</View>
						</View>

						<Text style={styles.sectionLabel}>Included Jobs</Text>
						<View style={styles.tableHeader}>
							<Text style={[styles.cellStrong, styles.colWide]}>Job</Text>
							<Text style={[styles.cellStrong, styles.colMid]}>Project / Unit</Text>
							<Text style={[styles.cellStrong, styles.colMid]}>Status</Text>
							<Text style={[styles.cellStrong, styles.colAmt]}>Amount</Text>
						</View>
						{payout.jobs.map((job) => (
							<View key={job.id} style={styles.tableRow}>
								<View style={styles.colWide}>
									<Text style={styles.cellStrong}>
										#{job.id} {job.title || "Untitled job"}
										{job.subtitle ? ` - ${job.subtitle}` : ""}
									</Text>
									<Text style={styles.muted}>{formatDate(job.createdAt)}</Text>
								</View>
								<View style={styles.colMid}>
									<Text style={styles.cellText}>
										{job.projectTitle || "No project"}
									</Text>
									<Text style={styles.muted}>
										{[job.lotBlock, job.modelName].filter(Boolean).join(" • ") ||
											"No unit"}
									</Text>
								</View>
								<Text style={[styles.cellText, styles.colMid]}>
									{job.status || "Unknown"}
								</Text>
								<Text style={[styles.cellText, styles.colAmt]}>
									{formatCurrency(job.amount)}
								</Text>
							</View>
						))}

						<View style={styles.footer}>
							<Text style={styles.cellStrong}>
								Subtotal {formatCurrency(payout.subTotal)} • Charges{" "}
								{formatCurrency(payout.charges)}
							</Text>
							<Text style={styles.cellStrong}>
								Total {formatCurrency(payout.amount)}
							</Text>
						</View>
					</View>
				))}
			</Page>
		</Document>
	);
}
