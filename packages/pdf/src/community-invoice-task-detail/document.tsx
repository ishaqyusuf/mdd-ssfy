import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatDate(value?: Date | string | null) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

const styles = StyleSheet.create({
	page: {
		padding: 24,
		fontSize: 9,
		color: "#0f172a",
	},
	header: {
		marginBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#cbd5e1",
		paddingBottom: 8,
	},
	title: {
		fontSize: 15,
		fontWeight: 700,
	},
	subtitle: {
		marginTop: 3,
		fontSize: 8.5,
		color: "#475569",
	},
	filterLine: {
		marginTop: 4,
		fontSize: 8.5,
		color: "#334155",
	},
	metricGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		marginBottom: 8,
	},
	metricCard: {
		width: "23.5%",
		borderWidth: 1,
		borderColor: "#e2e8f0",
		paddingVertical: 6,
		paddingHorizontal: 7,
	},
	metricLabel: {
		fontSize: 7.5,
		textTransform: "uppercase",
		color: "#64748b",
	},
	metricValue: {
		marginTop: 2,
		fontSize: 10,
		fontWeight: 700,
	},
	projectSection: {
		marginTop: 4,
		marginBottom: 10,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "#cbd5e1",
	},
	projectTitle: {
		fontSize: 11,
		fontWeight: 700,
	},
	projectSubtitle: {
		marginTop: 2,
		fontSize: 8.5,
		color: "#475569",
	},
	unitSection: {
		marginTop: 6,
		marginBottom: 8,
		padding: 8,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	unitHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 6,
	},
	unitTitle: {
		fontSize: 10,
		fontWeight: 700,
	},
	unitSubtitle: {
		marginTop: 2,
		fontSize: 8,
		color: "#64748b",
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#f8fafc",
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#cbd5e1",
		paddingVertical: 5,
		paddingHorizontal: 4,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
		paddingVertical: 4,
		paddingHorizontal: 4,
	},
	cellStrong: {
		fontSize: 8,
		fontWeight: 700,
	},
	cellText: {
		fontSize: 8,
	},
	colTask: {
		flex: 2.2,
		paddingRight: 6,
	},
	colDate: {
		flex: 0.95,
	},
	colAmount: {
		flex: 0.85,
		textAlign: "right",
	},
	colCheck: {
		flex: 0.95,
	},
	emptyState: {
		marginTop: 18,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 12,
		fontSize: 9,
		color: "#475569",
	},
});

type CommunityInvoiceTaskDetailPdfData = {
	title: string;
	printedAt: Date | string;
	filterSummary?: string[];
	data: Array<{
		projectTitle: string;
		builderName: string;
		summary: {
			unitCount: number;
			taskCount: number;
			totalCost: number;
			totalTax: number;
			totalDue: number;
			totalPaid: number;
			totalOpenBalance: number;
		};
		units: Array<{
			unitId: number;
			lot: string;
			block: string;
			lotBlock: string;
			modelName: string;
			taskCount: number;
			totalCost: number;
			totalTax: number;
			totalDue: number;
			totalPaid: number;
			totalOpenBalance: number;
			tasks: Array<{
				id: number;
				taskName: string;
				taskDate: Date | string | null;
				cost: number;
				tax: number;
				due: number;
				paid: number;
				openBalance: number;
				checkNo: string | null;
				checkDate: Date | string | null;
			}>;
		}>;
	}>;
	summary: {
		totalProjects: number;
		totalUnits: number;
		totalTasks: number;
		totalCost: number;
		totalTax: number;
		totalDue: number;
		totalPaid: number;
		totalOpenBalance: number;
	};
};

function MetricGrid({
	items,
}: {
	items: Array<{ label: string; value: string }>;
}) {
	return (
		<View style={styles.metricGrid}>
			{items.map((item) => (
				<View key={item.label} style={styles.metricCard}>
					<Text style={styles.metricLabel}>{item.label}</Text>
					<Text style={styles.metricValue}>{item.value}</Text>
				</View>
			))}
		</View>
	);
}

export function CommunityInvoiceTaskDetailPdfDocument({
	data,
	title,
}: {
	data: CommunityInvoiceTaskDetailPdfData;
	title?: string;
}) {
	const resolvedTitle =
		title || data.title || "Community Invoice Task Detail Report";

	return (
		<Document title={resolvedTitle}>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{resolvedTitle}</Text>
					<Text style={styles.subtitle}>
						Printed {formatDate(data.printedAt)}
					</Text>
					{data.filterSummary?.length ? (
						<Text style={styles.filterLine}>
							Filters: {data.filterSummary.join(" • ")}
						</Text>
					) : null}
				</View>

				<MetricGrid
					items={[
						{ label: "Projects", value: String(data.summary.totalProjects) },
						{ label: "Units", value: String(data.summary.totalUnits) },
						{ label: "Tasks", value: String(data.summary.totalTasks) },
						{ label: "Total Cost", value: formatCurrency(data.summary.totalCost) },
						{ label: "Total Tax", value: formatCurrency(data.summary.totalTax) },
						{ label: "Total Due", value: formatCurrency(data.summary.totalDue) },
						{ label: "Total Paid", value: formatCurrency(data.summary.totalPaid) },
						{
							label: "Open Balance",
							value: formatCurrency(data.summary.totalOpenBalance),
						},
					]}
				/>

				{data.data.length ? (
					data.data.map((project) => (
						<View
							key={`${project.projectTitle}-${project.builderName}`}
							style={styles.projectSection}
						>
							<View wrap={false}>
								<Text style={styles.projectTitle}>{project.projectTitle}</Text>
								<Text style={styles.projectSubtitle}>
									Builder: {project.builderName}
								</Text>
								<MetricGrid
									items={[
										{ label: "Units", value: String(project.summary.unitCount) },
										{ label: "Tasks", value: String(project.summary.taskCount) },
										{
											label: "Cost",
											value: formatCurrency(project.summary.totalCost),
										},
										{
											label: "Tax",
											value: formatCurrency(project.summary.totalTax),
										},
										{
											label: "Due",
											value: formatCurrency(project.summary.totalDue),
										},
										{
											label: "Paid",
											value: formatCurrency(project.summary.totalPaid),
										},
										{
											label: "Open",
											value: formatCurrency(project.summary.totalOpenBalance),
										},
									]}
								/>
							</View>

							{project.units.map((unit) => (
								<View key={unit.unitId} style={styles.unitSection}>
									<View style={styles.unitHeader}>
										<View>
											<Text style={styles.unitTitle}>{unit.lotBlock}</Text>
											<Text style={styles.unitSubtitle}>
												Model: {unit.modelName}
											</Text>
										</View>
									</View>

									<MetricGrid
										items={[
											{ label: "Tasks", value: String(unit.taskCount) },
											{
												label: "Cost",
												value: formatCurrency(unit.totalCost),
											},
											{
												label: "Tax",
												value: formatCurrency(unit.totalTax),
											},
											{
												label: "Due",
												value: formatCurrency(unit.totalDue),
											},
											{
												label: "Paid",
												value: formatCurrency(unit.totalPaid),
											},
											{
												label: "Open",
												value: formatCurrency(unit.totalOpenBalance),
											},
										]}
									/>

									<View style={styles.tableHeader}>
										<Text style={[styles.cellStrong, styles.colTask]}>Task</Text>
										<Text style={[styles.cellStrong, styles.colDate]}>
											Task Date
										</Text>
										<Text style={[styles.cellStrong, styles.colAmount]}>Cost</Text>
										<Text style={[styles.cellStrong, styles.colAmount]}>Tax</Text>
										<Text style={[styles.cellStrong, styles.colAmount]}>Due</Text>
										<Text style={[styles.cellStrong, styles.colAmount]}>Paid</Text>
										<Text style={[styles.cellStrong, styles.colAmount]}>Open</Text>
										<Text style={[styles.cellStrong, styles.colCheck]}>Check No</Text>
										<Text style={[styles.cellStrong, styles.colCheck]}>
											Check Date
										</Text>
									</View>
									{unit.tasks.map((task) => (
										<View key={task.id} style={styles.tableRow}>
											<Text style={[styles.cellText, styles.colTask]}>
												{task.taskName}
											</Text>
											<Text style={[styles.cellText, styles.colDate]}>
												{formatDate(task.taskDate)}
											</Text>
											<Text style={[styles.cellText, styles.colAmount]}>
												{formatCurrency(task.cost)}
											</Text>
											<Text style={[styles.cellText, styles.colAmount]}>
												{formatCurrency(task.tax)}
											</Text>
											<Text style={[styles.cellText, styles.colAmount]}>
												{formatCurrency(task.due)}
											</Text>
											<Text style={[styles.cellText, styles.colAmount]}>
												{formatCurrency(task.paid)}
											</Text>
											<Text style={[styles.cellText, styles.colAmount]}>
												{formatCurrency(task.openBalance)}
											</Text>
											<Text style={[styles.cellText, styles.colCheck]}>
												{task.checkNo || "-"}
											</Text>
											<Text style={[styles.cellText, styles.colCheck]}>
												{formatDate(task.checkDate)}
											</Text>
										</View>
									))}
								</View>
							))}
						</View>
					))
				) : (
					<Text style={styles.emptyState}>
						No invoice tasks matched the selected filters.
					</Text>
				)}
			</Page>
		</Document>
	);
}
