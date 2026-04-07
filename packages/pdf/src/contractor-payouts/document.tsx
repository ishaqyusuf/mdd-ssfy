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

function getPayoutStatusLabel(isCancelled?: boolean) {
	return isCancelled ? "Cancelled" : "Paid";
}

function PayoutStatusBadge({ isCancelled }: { isCancelled?: boolean }) {
	return (
		<View
			style={[
				styles.statusBadge,
				isCancelled ? styles.statusCancelled : styles.statusPaid,
			]}
		>
			<Text
				style={isCancelled ? styles.statusCancelledText : styles.statusPaidText}
			>
				{getPayoutStatusLabel(isCancelled)}
			</Text>
		</View>
	);
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
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
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
	cancelledAmount: {
		textDecoration: "line-through",
		color: "#94a3b8",
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
	sectionCard: {
		borderWidth: 1,
		borderColor: "#dbe3ee",
		padding: 12,
		marginBottom: 12,
	},
	listRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	listRowLeft: {
		flex: 1,
	},
	listRowRight: {
		width: 132,
		alignItems: "flex-end",
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderWidth: 1,
		borderRadius: 999,
	},
	statusPaid: {
		backgroundColor: "#ecfdf3",
		borderColor: "#86efac",
	},
	statusCancelled: {
		backgroundColor: "#fff1f2",
		borderColor: "#fda4af",
	},
	statusPaidText: {
		fontSize: 8,
		fontWeight: 700,
		color: "#166534",
		textTransform: "uppercase",
	},
	statusCancelledText: {
		fontSize: 8,
		fontWeight: 700,
		color: "#be123c",
		textTransform: "uppercase",
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
		isCancelled?: boolean;
		cancelledAt?: Date | string | null;
		cancelledBy?: {
			id: number | null;
			name?: string | null;
		} | null;
		cancellationReason?: string | null;
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
	const resolvedTitle = title || data.title || "Contractor Payout Report";

	return (
		<Document title={resolvedTitle}>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{resolvedTitle}</Text>
					<Text style={styles.subtitle}>
						Printed {formatDate(data.printedAt)} • {data.summary.payoutCount}{" "}
						payout
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

				<View style={styles.sectionCard}>
					<Text style={styles.sectionLabel}>Payout Summary</Text>
					{data.payouts.map((payout) => (
						<View key={payout.id} style={styles.listRow}>
							<View style={styles.listRowLeft}>
								<View style={styles.titleRow}>
									<Text style={styles.payoutTitle}>
										Payout #{payout.id} •{" "}
										{payout.paidTo?.name || "Unknown contractor"}
									</Text>
									<PayoutStatusBadge isCancelled={payout.isCancelled} />
								</View>
								<Text style={styles.muted}>
									{formatDate(payout.createdAt)} • {payout.paymentMethod}
									{payout.checkNo ? ` • Check ${payout.checkNo}` : ""}
								</Text>
								<Text style={styles.muted}>
									{payout.jobCount} job{payout.jobCount === 1 ? "" : "s"} •
									Authorized by{" "}
									{` ${payout.authorizedBy?.name || "Unknown payer"}`}
								</Text>
								{payout.isCancelled ? (
									<Text style={styles.muted}>
										Cancelled {formatDate(payout.cancelledAt)} by{" "}
										{payout.cancelledBy?.name || "Unknown user"}
										{payout.cancellationReason
											? ` • ${payout.cancellationReason}`
											: ""}
									</Text>
								) : null}
							</View>
							<View style={styles.listRowRight}>
								<Text
									style={[
										styles.totalValue,
										payout.isCancelled && styles.cancelledAmount,
									]}
								>
									{formatCurrency(payout.amount)}
								</Text>
								<Text
									style={[
										styles.muted,
										payout.isCancelled && styles.cancelledAmount,
									]}
								>
									Charges {formatCurrency(payout.charges)}
								</Text>
							</View>
						</View>
					))}
				</View>
			</Page>

			{data.payouts.map((payout) => (
				<Page key={payout.id} size="LETTER" style={styles.page}>
					<View style={styles.header}>
						<View style={styles.titleRow}>
							<Text style={styles.title}>Payout #{payout.id}</Text>
							<PayoutStatusBadge isCancelled={payout.isCancelled} />
						</View>
						<Text style={styles.subtitle}>
							{payout.paidTo?.name || "Unknown contractor"} •{" "}
							{formatDate(payout.createdAt)}
						</Text>
						<Text style={styles.subtitle}>
							Authorized by {payout.authorizedBy?.name || "Unknown payer"} •{" "}
							{payout.paymentMethod}
							{payout.checkNo ? ` • Check ${payout.checkNo}` : ""}
						</Text>
						{payout.isCancelled ? (
							<Text style={styles.subtitle}>
								Cancelled {formatDate(payout.cancelledAt)} by{" "}
								{payout.cancelledBy?.name || "Unknown user"}
								{payout.cancellationReason
									? ` • ${payout.cancellationReason}`
									: ""}
							</Text>
						) : null}
					</View>

					<View style={styles.metricRow}>
						<View style={styles.metricCard}>
							<Text style={styles.metricLabel}>Jobs</Text>
							<Text style={styles.metricValue}>{payout.jobCount}</Text>
						</View>
						<View style={styles.metricCard}>
							<Text style={styles.metricLabel}>Subtotal</Text>
							<Text
								style={[
									styles.metricValue,
									payout.isCancelled && styles.cancelledAmount,
								]}
							>
								{formatCurrency(payout.subTotal)}
							</Text>
						</View>
						<View style={styles.metricCard}>
							<Text style={styles.metricLabel}>Charges</Text>
							<Text
								style={[
									styles.metricValue,
									payout.isCancelled && styles.cancelledAmount,
								]}
							>
								{formatCurrency(payout.charges)}
							</Text>
						</View>
						<View style={styles.metricCard}>
							<Text style={styles.metricLabel}>Status</Text>
							<Text style={styles.metricValue}>
								{getPayoutStatusLabel(payout.isCancelled)}
							</Text>
						</View>
						<View style={styles.metricCard}>
							<Text style={styles.metricLabel}>Total Paid</Text>
							<Text
								style={[
									styles.metricValue,
									payout.isCancelled && styles.cancelledAmount,
								]}
							>
								{formatCurrency(payout.amount)}
							</Text>
						</View>
					</View>

					<View style={styles.payoutCard}>
						<Text style={styles.sectionLabel}>Included Jobs</Text>
						<View style={styles.tableHeader}>
							<Text style={[styles.cellStrong, styles.colWide]}>Job</Text>
							<Text style={[styles.cellStrong, styles.colMid]}>
								Project / Unit
							</Text>
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
										{[job.lotBlock, job.modelName]
											.filter(Boolean)
											.join(" • ") || "No unit"}
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
							<Text
								style={[
									styles.cellStrong,
									payout.isCancelled && styles.cancelledAmount,
								]}
							>
								Subtotal {formatCurrency(payout.subTotal)} • Charges{" "}
								{formatCurrency(payout.charges)}
							</Text>
							<Text
								style={[
									styles.cellStrong,
									payout.isCancelled && styles.cancelledAmount,
								]}
							>
								Total {formatCurrency(payout.amount)}
							</Text>
						</View>
					</View>
				</Page>
			))}
		</Document>
	);
}
