/** @jsxImportSource react */
import {
	Document,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";

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
		padding: 24,
		fontSize: 10,
		color: "#0f172a",
		backgroundColor: "#ffffff",
	},
	pageContent: {
		position: "relative",
		zIndex: 1,
		flex: 1,
	},
	watermark: {
		position: "absolute",
		top: "30%",
		left: "15%",
		width: "70%",
		opacity: 0.08,
		transform: "rotate(-28deg)",
		zIndex: 0,
	},
	watermarkImage: {
		width: 360,
		height: 360,
		objectFit: "contain",
	},
	cancelledWatermark: {
		position: "absolute",
		top: "43%",
		left: "8%",
		width: "84%",
		transform: "rotate(-28deg)",
		zIndex: 0,
		alignItems: "center",
	},
	cancelledWatermarkText: {
		fontSize: 46,
		fontWeight: 800,
		letterSpacing: 6,
		color: "rgba(190,18,60,0.12)",
		textTransform: "uppercase",
	},
	coverPage: {
		padding: 38,
		fontSize: 10,
		color: "#0f172a",
		backgroundColor: "#ffffff",
	},
	coverContent: {
		position: "relative",
		zIndex: 1,
		flex: 1,
		justifyContent: "center",
	},
	coverBrand: {
		alignItems: "center",
		marginBottom: 26,
	},
	logo: {
		width: 150,
		height: 64,
		objectFit: "contain",
		marginBottom: 8,
	},
	logoFallback: {
		fontSize: 26,
		fontWeight: 800,
		letterSpacing: 1,
		marginBottom: 8,
	},
	companyLine: {
		fontSize: 9,
		color: "#475569",
		marginBottom: 2,
		textAlign: "center",
	},
	coverTitle: {
		fontSize: 24,
		fontWeight: 800,
		textAlign: "center",
		marginBottom: 5,
	},
	coverSubtitle: {
		fontSize: 10,
		color: "#475569",
		textAlign: "center",
		marginBottom: 18,
	},
	coverCard: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		padding: 16,
		marginBottom: 12,
		backgroundColor: "#ffffff",
	},
	coverCardTitle: {
		fontSize: 9,
		fontWeight: 700,
		color: "#64748b",
		textTransform: "uppercase",
		marginBottom: 8,
	},
	coverInfoGrid: {
		flexDirection: "row",
		gap: 12,
	},
	coverInfoColumn: {
		flex: 1,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 8,
		paddingVertical: 3,
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	infoLabel: {
		fontSize: 8.5,
		color: "#64748b",
	},
	infoValue: {
		fontSize: 9,
		color: "#0f172a",
		fontWeight: 700,
		textAlign: "right",
		maxWidth: "62%",
	},
	header: {
		marginBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#cbd5e1",
		paddingBottom: 10,
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
		gap: 8,
		marginBottom: 10,
	},
	metricCard: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		padding: 8,
		backgroundColor: "#ffffff",
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
		padding: 10,
		marginBottom: 10,
		backgroundColor: "#ffffff",
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
		paddingVertical: 5,
		paddingHorizontal: 6,
		marginTop: 4,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
		paddingVertical: 5,
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
	companyAddress?: {
		address1: string;
		address2: string;
		phone: string;
		fax?: string | null;
	} | null;
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
			description: string | null;
			isCustom?: boolean | null;
			amount: number;
			status: string | null;
			createdAt: Date | string;
			projectTitle: string | null;
			lotBlock: string | null;
			modelName: string | null;
		}>;
	}>;
};

type ContractorPayoutJob =
	ContractorPayoutPrintData["payouts"][number]["jobs"][number];

function normalizeInlineText(value?: string | null) {
	return String(value || "")
		.replace(/\s+/g, " ")
		.trim();
}

function isGenericCustomJob(job: ContractorPayoutJob) {
	const title = normalizeInlineText(job.title).toLowerCase();
	const subtitle = normalizeInlineText(job.subtitle).toLowerCase();

	return (
		job.isCustom === true ||
		title === "custom job" ||
		subtitle === "custom" ||
		(title === "custom job" && subtitle === "custom")
	);
}

function splitDescription(value?: string | null) {
	const description = normalizeInlineText(value);
	if (!description) {
		return {
			lead: null,
			detail: null,
		};
	}

	const semicolonParts = description
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean);

	if (semicolonParts.length > 1) {
		return {
			lead: semicolonParts[0],
			detail: semicolonParts.slice(1).join("; "),
		};
	}

	return {
		lead: description,
		detail: null,
	};
}

function getJobDisplay(job: ContractorPayoutJob) {
	const genericCustomJob = isGenericCustomJob(job);
	const description = splitDescription(job.description);
	const subtitle = normalizeInlineText(job.subtitle);
	const title = normalizeInlineText(job.title) || "Untitled job";
	const defaultTitle =
		subtitle && !genericCustomJob ? `${title} - ${subtitle}` : title;
	const label =
		genericCustomJob && description.lead ? description.lead : defaultTitle;
	const detail =
		genericCustomJob && description.lead
			? description.detail
			: normalizeInlineText(job.description) || null;
	const structuredUnit = [job.lotBlock, job.modelName]
		.map((item) => normalizeInlineText(item))
		.filter(Boolean)
		.join(" • ");

	return {
		label,
		detail,
		projectLabel:
			normalizeInlineText(job.projectTitle) ||
			(genericCustomJob ? "Custom job" : "No project"),
		unitLabel:
			structuredUnit ||
			(genericCustomJob ? "Details in description" : "No unit"),
	};
}

function CompanyAddressBlock({
	address,
}: {
	address: ContractorPayoutPrintData["companyAddress"];
}) {
	if (!address) return null;

	return (
		<View>
			<Text style={styles.companyLine}>{address.address1}</Text>
			<Text style={styles.companyLine}>{address.address2}</Text>
			<Text style={styles.companyLine}>
				Phone: {address.phone}
				{address.fax ? ` • Fax: ${address.fax}` : ""}
			</Text>
			<Text style={styles.companyLine}>support@gndmillwork.com</Text>
		</View>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.infoRow}>
			<Text style={styles.infoLabel}>{label}</Text>
			<Text style={styles.infoValue}>{value}</Text>
		</View>
	);
}

function ReportPage({
	baseUrl,
	cancelled,
	cover = false,
	children,
}: {
	baseUrl?: string;
	cancelled?: boolean;
	cover?: boolean;
	children: ReactNode;
}) {
	const watermarkSrc = baseUrl ? `${baseUrl}/logo-grayscale.png` : null;

	return (
		<Page size="LETTER" style={cover ? styles.coverPage : styles.page}>
			{watermarkSrc ? (
				<View fixed style={styles.watermark}>
					<Image src={watermarkSrc} style={styles.watermarkImage} />
				</View>
			) : null}
			{cancelled ? (
				<View fixed style={styles.cancelledWatermark}>
					<Text style={styles.cancelledWatermarkText}>CANCELLED</Text>
				</View>
			) : null}
			<View style={cover ? styles.coverContent : styles.pageContent}>
				{children}
			</View>
		</Page>
	);
}

function PayoutCoverPage({
	data,
	title,
	baseUrl,
}: {
	data: ContractorPayoutPrintData;
	title: string;
	baseUrl?: string;
}) {
	const firstPayout = data.payouts[0];
	const singlePayout = data.payouts.length === 1 ? firstPayout : null;
	const contractorLabel =
		singlePayout?.paidTo?.name ||
		(data.payouts.length === 1 ? "Unknown contractor" : "Multiple contractors");
	const logoSrc = baseUrl ? `${baseUrl}/logo.png` : null;

	return (
		<ReportPage
			baseUrl={baseUrl}
			cover
			cancelled={data.payouts.length === 1 && !!singlePayout?.isCancelled}
		>
			<View style={styles.coverBrand}>
				{logoSrc ? (
					<Image src={logoSrc} style={styles.logo} />
				) : (
					<Text style={styles.logoFallback}>GND</Text>
				)}
				<CompanyAddressBlock address={data.companyAddress} />
			</View>

			<Text style={styles.coverTitle}>{title}</Text>
			<Text style={styles.coverSubtitle}>
				Contractor payout report • Printed {formatDate(data.printedAt)}
			</Text>

			<View style={styles.coverCard}>
				<Text style={styles.coverCardTitle}>Contractor Information</Text>
				<View style={styles.coverInfoGrid}>
					<View style={styles.coverInfoColumn}>
						<InfoRow label="Contractor" value={contractorLabel} />
						<InfoRow
							label="Email"
							value={singlePayout?.paidTo?.email || "No email on file"}
						/>
						<InfoRow
							label="Authorized By"
							value={singlePayout?.authorizedBy?.name || "Multiple payers"}
						/>
					</View>
					<View style={styles.coverInfoColumn}>
						<InfoRow
							label="Payouts"
							value={String(data.summary.payoutCount)}
						/>
						<InfoRow label="Jobs" value={String(data.summary.totalJobs)} />
						<InfoRow
							label="Total Paid"
							value={formatCurrency(data.summary.totalAmount)}
						/>
					</View>
				</View>
			</View>

			{singlePayout ? (
				<View style={styles.coverCard}>
					<Text style={styles.coverCardTitle}>Payout Details</Text>
					<View style={styles.coverInfoGrid}>
						<View style={styles.coverInfoColumn}>
							<InfoRow label="Payout" value={`#${singlePayout.id}`} />
							<InfoRow
								label="Date"
								value={formatDate(singlePayout.createdAt)}
							/>
							<InfoRow
								label="Status"
								value={getPayoutStatusLabel(singlePayout.isCancelled)}
							/>
						</View>
						<View style={styles.coverInfoColumn}>
							<InfoRow label="Method" value={singlePayout.paymentMethod} />
							<InfoRow
								label="Check"
								value={singlePayout.checkNo || "Not provided"}
							/>
							<InfoRow
								label="Charges"
								value={formatCurrency(singlePayout.charges)}
							/>
						</View>
					</View>
				</View>
			) : null}

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
		</ReportPage>
	);
}

export function ContractorPayoutPdfDocument({
	data,
	title,
	baseUrl,
}: {
	data: ContractorPayoutPrintData;
	baseUrl?: string;
	title?: string;
}) {
	const resolvedTitle = title || data.title || "Contractor Payout Report";

	return (
		<Document title={resolvedTitle}>
			<PayoutCoverPage
				data={data}
				title={resolvedTitle}
				baseUrl={baseUrl}
			/>

			{data.payouts.map((payout) => (
				<ReportPage
					key={payout.id}
					baseUrl={baseUrl}
					cancelled={payout.isCancelled}
				>
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
									...(payout.isCancelled ? [styles.cancelledAmount] : []),
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
									...(payout.isCancelled ? [styles.cancelledAmount] : []),
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
									...(payout.isCancelled ? [styles.cancelledAmount] : []),
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
						{payout.jobs.map((job) => {
							const display = getJobDisplay(job);

							return (
								<View key={job.id} style={styles.tableRow} wrap={false}>
									<View style={styles.colWide}>
										<Text style={styles.cellStrong}>
											#{job.id} {display.label}
										</Text>
										{display.detail ? (
											<Text style={styles.cellText}>{display.detail}</Text>
										) : null}
										<Text style={styles.muted}>{formatDate(job.createdAt)}</Text>
									</View>
									<View style={styles.colMid}>
										<Text style={styles.cellText}>{display.projectLabel}</Text>
										<Text style={styles.muted}>{display.unitLabel}</Text>
									</View>
									<Text style={[styles.cellText, styles.colMid]}>
										{job.status || "Unknown"}
									</Text>
									<Text style={[styles.cellText, styles.colAmt]}>
										{formatCurrency(job.amount)}
									</Text>
								</View>
							);
						})}

						<View style={styles.footer}>
							<Text
								style={[
									styles.cellStrong,
									...(payout.isCancelled ? [styles.cancelledAmount] : []),
								]}
							>
								Subtotal {formatCurrency(payout.subTotal)} • Charges{" "}
								{formatCurrency(payout.charges)}
							</Text>
							<Text
								style={[
									styles.cellStrong,
									...(payout.isCancelled ? [styles.cancelledAmount] : []),
								]}
							>
								Total {formatCurrency(payout.amount)}
							</Text>
						</View>
					</View>
				</ReportPage>
			))}
		</Document>
	);
}
