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
		marginBottom: 12,
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
		fontSize: 14,
		fontWeight: 700,
	},
	bucketRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 14,
	},
	tableHeader: {
		flexDirection: "row",
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#cbd5e1",
		backgroundColor: "#f8fafc",
		paddingVertical: 6,
		paddingHorizontal: 6,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
		paddingVertical: 6,
		paddingHorizontal: 6,
	},
	colProject: {
		flex: 2.1,
	},
	colUnit: {
		flex: 1.5,
	},
	colOpen: {
		flex: 0.9,
	},
	colAge: {
		flex: 0.7,
	},
	colBucket: {
		flex: 1,
	},
	colAmount: {
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
	muted: {
		fontSize: 8,
		color: "#64748b",
		marginTop: 2,
	},
});

type CommunityInvoiceAgingPdfData = {
	title: string;
	printedAt: Date | string;
	data: Array<{
		id: number;
		createdAt: Date | string;
		projectTitle: string;
		builderName: string;
		lotBlock: string;
		modelName: string;
		taskCount: number;
		jobCount: number;
		totalDue: number;
		totalPaid: number;
		chargeBack: number;
		openBalance: number;
		ageDays: number;
		agingBucket: string;
	}>;
	summary: {
		totalUnits: number;
		totalDue: number;
		totalPaid: number;
		totalOpenBalance: number;
		totalChargeBack: number;
		buckets: {
			current: number;
			days31To60: number;
			days61To90: number;
			days90Plus: number;
		};
	};
};

export function CommunityInvoiceAgingPdfDocument({
	data,
	title,
}: {
	data: CommunityInvoiceAgingPdfData;
	title?: string;
	baseUrl?: string;
}) {
	const resolvedTitle = title || data.title || "Community Invoice Aging Report";

	return (
		<Document title={resolvedTitle}>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{resolvedTitle}</Text>
					<Text style={styles.subtitle}>
						Printed {formatDate(data.printedAt)} • {data.summary.totalUnits}{" "}
						open unit{data.summary.totalUnits === 1 ? "" : "s"}
					</Text>
				</View>

				<View style={styles.metricRow}>
					<MetricCard
						title="Open Units"
						value={String(data.summary.totalUnits)}
					/>
					<MetricCard
						title="Total Due"
						value={formatCurrency(data.summary.totalDue)}
					/>
					<MetricCard
						title="Total Paid"
						value={formatCurrency(data.summary.totalPaid)}
					/>
					<MetricCard
						title="Open Balance"
						value={formatCurrency(data.summary.totalOpenBalance)}
					/>
				</View>

				<View style={styles.bucketRow}>
					<MetricCard
						title="Current"
						value={formatCurrency(data.summary.buckets.current)}
					/>
					<MetricCard
						title="31-60 Days"
						value={formatCurrency(data.summary.buckets.days31To60)}
					/>
					<MetricCard
						title="61-90 Days"
						value={formatCurrency(data.summary.buckets.days61To90)}
					/>
					<MetricCard
						title="90+ Days"
						value={formatCurrency(data.summary.buckets.days90Plus)}
					/>
				</View>

				<View style={styles.tableHeader}>
					<Text style={[styles.cellStrong, styles.colProject]}>
						Project / Builder
					</Text>
					<Text style={[styles.cellStrong, styles.colUnit]}>Unit</Text>
					<Text style={[styles.cellStrong, styles.colOpen]}>Opened</Text>
					<Text style={[styles.cellStrong, styles.colAge]}>Age</Text>
					<Text style={[styles.cellStrong, styles.colBucket]}>Bucket</Text>
					<Text style={[styles.cellStrong, styles.colAmount]}>Open</Text>
				</View>
				{data.data.map((item) => (
					<View key={item.id} style={styles.tableRow}>
						<View style={styles.colProject}>
							<Text style={styles.cellStrong}>{item.projectTitle}</Text>
							<Text style={styles.muted}>{item.builderName}</Text>
						</View>
						<View style={styles.colUnit}>
							<Text style={styles.cellStrong}>{item.lotBlock}</Text>
							<Text style={styles.muted}>{item.modelName}</Text>
						</View>
						<Text style={[styles.cellText, styles.colOpen]}>
							{formatDate(item.createdAt)}
						</Text>
						<Text style={[styles.cellText, styles.colAge]}>
							{item.ageDays}d
						</Text>
						<Text style={[styles.cellText, styles.colBucket]}>
							{item.agingBucket}
						</Text>
						<Text style={[styles.cellText, styles.colAmount]}>
							{formatCurrency(item.openBalance)}
						</Text>
					</View>
				))}
			</Page>
		</Document>
	);
}

function MetricCard({ title, value }: { title: string; value: string }) {
	return (
		<View style={styles.metricCard}>
			<Text style={styles.metricLabel}>{title}</Text>
			<Text style={styles.metricValue}>{value}</Text>
		</View>
	);
}
