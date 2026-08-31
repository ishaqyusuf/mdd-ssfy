/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";
import { format } from "date-fns";

import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

type SalesRow = {
	saleId: number;
	orderId: string;
	po?: string | null;
	date: Date | string;
	due: number;
	total: number;
};

type SuccessRecipient = {
	recipientRole: "customer" | "address";
	recipientId: number;
	recipientName: string;
	recipientEmail: string;
	salesCount: number;
	totalPendingAmount: number;
	totalSalesAmount: number;
	sales: SalesRow[];
};

type SkippedSale = {
	saleId: number;
	orderId: string;
	customerName?: string | null;
	customerEmail?: string | null;
	addressEmail?: string | null;
	salesRepEmail?: string | null;
	reasons: string[];
	amountDue: number;
	grandTotal: number;
};

type Props = {
	recipientName?: string;
	authorName?: string;
	triggerType: "scheduled" | "now" | "test";
	statusUsed: "active" | "inactive";
	foundSalesCount: number;
	validSalesCount: number;
	groupedRecipientCount: number;
	deliveredGroupCount: number;
	failedGroupCount: number;
	skippedSalesCount: number;
	totalPendingAmount: number;
	totalSalesAmount: number;
	successfulRecipients: SuccessRecipient[];
	skippedSales: SkippedSale[];
	successfulRecipientsTruncated?: number;
	skippedSalesTruncated?: number;
};

const currency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function formatDate(value: Date | string) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return format(date, "MMM d, yyyy");
}

export function SalesReminderScheduleAdminNotificationEmail({
	recipientName = "Admin",
	authorName = "System",
	triggerType = "scheduled",
	statusUsed = "active",
	foundSalesCount = 0,
	validSalesCount = 0,
	groupedRecipientCount = 0,
	deliveredGroupCount = 0,
	failedGroupCount = 0,
	skippedSalesCount = 0,
	totalPendingAmount = 0,
	totalSalesAmount = 0,
	successfulRecipients = [],
	skippedSales = [],
	successfulRecipientsTruncated = 0,
	skippedSalesTruncated = 0,
}: Props) {
	const previewText = `Sales reminder ${label(triggerType)} run: ${deliveredGroupCount} delivered`;
	const needsAttention = failedGroupCount + skippedSalesCount > 0;

	return (
		<StandardEmailLayout previewText={previewText}>
			<StandardEmailHeader
				documentLabel="Reminder run"
				documentMeta={`${label(triggerType)} · ${label(statusUsed)}`}
			/>

			<StandardEmailHero
				eyebrow="Sales automation"
				recipientName={recipientName}
				title="Sales Reminder Run Summary"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					This is the {label(triggerType).toLowerCase()} run summary from{" "}
					{authorName}. Delivery results and any skipped sales are listed below.
				</Text>
			</StandardEmailHero>

			<Section
				className={`gnd-standard-panel gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid p-[20px] ${needsAttention ? "gnd-standard-soft-danger" : "gnd-standard-soft-green"}`}
				style={{
					backgroundColor: needsAttention
						? standardEmailColors.softDanger
						: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Row>
					<StandardEmailMetric
						emphasis
						label="Delivered"
						value={String(deliveredGroupCount)}
					/>
					<StandardEmailMetric
						label="Failed"
						value={String(failedGroupCount)}
					/>
					<StandardEmailMetric
						label="Skipped sales"
						value={String(skippedSalesCount)}
					/>
				</Row>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-border mx-[36px] mt-[16px] rounded-[6px] border border-solid p-[20px]"
				style={{ borderColor: standardEmailColors.border }}
			>
				<Row>
					<StandardEmailMetric
						label="Sales found"
						value={String(foundSalesCount)}
					/>
					<StandardEmailMetric
						label="Valid sales"
						value={String(validSalesCount)}
					/>
					<StandardEmailMetric
						label="Recipient groups"
						value={String(groupedRecipientCount)}
					/>
				</Row>
				<Row style={{ marginTop: 18 }}>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "50%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Total pending
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[16px] font-semibold"
							style={{ color: standardEmailColors.ink }}
						>
							{currency(totalPendingAmount)}
						</Text>
					</Column>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "50%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Total sales value
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[16px] font-semibold"
							style={{ color: standardEmailColors.ink }}
						>
							{currency(totalSalesAmount)}
						</Text>
					</Column>
				</Row>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[3px] pt-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Successful recipients · {successfulRecipients.length}
				</Text>
			</Section>

			{successfulRecipients.length ? (
				successfulRecipients.map((recipient) => (
					<Section
						className="gnd-standard-panel gnd-standard-border mx-[36px] mt-[12px] rounded-[6px] border border-solid p-[20px]"
						key={`${recipient.recipientRole}-${recipient.recipientId}`}
						style={{ borderColor: standardEmailColors.border }}
					>
						<Text
							className="gnd-standard-text m-0 text-[15px] font-semibold leading-[22px]"
							style={{ color: standardEmailColors.ink }}
						>
							{recipient.recipientName}
						</Text>
						<Text
							className="gnd-standard-muted m-0 mt-[3px] text-[12px] leading-[18px]"
							style={{
								color: standardEmailColors.muted,
								wordBreak: "break-word",
							}}
						>
							{recipient.recipientEmail} · {label(recipient.recipientRole)} ·{" "}
							{recipient.salesCount} sale
							{recipient.salesCount === 1 ? "" : "s"}
						</Text>
						<Row style={{ marginTop: 14 }}>
							<Column
								className="gnd-standard-mobile-stack"
								style={{ width: "50%" }}
							>
								<Text
									className="gnd-standard-muted m-0 text-[12px] uppercase tracking-[0.7px]"
									style={{ color: standardEmailColors.muted }}
								>
									Pending
								</Text>
								<Text
									className="gnd-standard-text m-0 mt-[4px] text-[14px] font-semibold"
									style={{ color: standardEmailColors.ink }}
								>
									{currency(recipient.totalPendingAmount)}
								</Text>
							</Column>
							<Column
								className="gnd-standard-mobile-stack"
								style={{ width: "50%" }}
							>
								<Text
									className="gnd-standard-muted m-0 text-[12px] uppercase tracking-[0.7px]"
									style={{ color: standardEmailColors.muted }}
								>
									Sales value
								</Text>
								<Text
									className="gnd-standard-text m-0 mt-[4px] text-[14px] font-semibold"
									style={{ color: standardEmailColors.ink }}
								>
									{currency(recipient.totalSalesAmount)}
								</Text>
							</Column>
						</Row>

						{recipient.sales.map((sale) => (
							<Section
								className="gnd-standard-soft gnd-standard-border mt-[12px] rounded-[5px] border border-solid px-[14px] py-[12px]"
								key={sale.saleId}
								style={{
									backgroundColor: standardEmailColors.soft,
									borderColor: standardEmailColors.border,
								}}
							>
								<Row>
									<Column
										className="gnd-standard-mobile-stack"
										style={{ width: "70%" }}
									>
										<Text
											className="gnd-standard-text m-0 text-[13px] font-semibold"
											style={{ color: standardEmailColors.ink }}
										>
											{sale.orderId} · {formatDate(sale.date)}
										</Text>
										<Text
											className="gnd-standard-muted m-0 mt-[3px] text-[12px]"
											style={{ color: standardEmailColors.muted }}
										>
											PO {sale.po || "—"}
										</Text>
									</Column>
									<Column
										align="right"
										className="gnd-standard-mobile-stack"
										style={{ width: "30%" }}
									>
										<Text
											className="gnd-standard-muted m-0 text-[12px] uppercase"
											style={{ color: standardEmailColors.muted }}
										>
											Due
										</Text>
										<Text
											className="gnd-standard-text m-0 mt-[3px] text-[13px] font-semibold"
											style={{ color: standardEmailColors.ink }}
										>
											{currency(sale.due)}
										</Text>
									</Column>
								</Row>
							</Section>
						))}
					</Section>
				))
			) : (
				<Section className="gnd-standard-content px-[36px] pt-[9px]">
					<Text
						className="gnd-standard-muted m-0 text-[14px]"
						style={{ color: standardEmailColors.muted }}
					>
						No reminder emails were delivered in this run.
					</Text>
				</Section>
			)}

			{successfulRecipientsTruncated > 0 ? (
				<Section className="gnd-standard-content px-[36px] pt-[10px]">
					<Text
						className="gnd-standard-muted m-0 text-[12px]"
						style={{ color: standardEmailColors.muted }}
					>
						+ {successfulRecipientsTruncated} more recipient groups omitted.
					</Text>
				</Section>
			) : null}

			<Section className="gnd-standard-content px-[36px] pb-[3px] pt-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Skipped sales · {skippedSales.length}
				</Text>
			</Section>

			{skippedSales.length ? (
				skippedSales.map((sale) => (
					<Section
						className="gnd-standard-panel gnd-standard-soft-danger gnd-standard-border mx-[36px] mt-[12px] rounded-[6px] border border-solid p-[18px]"
						key={sale.saleId}
						style={{
							backgroundColor: standardEmailColors.softDanger,
							borderColor: standardEmailColors.border,
						}}
					>
						<Row>
							<Column
								className="gnd-standard-mobile-stack"
								style={{ width: "72%" }}
							>
								<Text
									className="gnd-standard-text m-0 text-[14px] font-semibold"
									style={{ color: standardEmailColors.ink }}
								>
									{sale.orderId} ·{" "}
									{sale.customerName || "Customer not provided"}
								</Text>
								<Text
									className="gnd-standard-danger-text m-0 mt-[6px] text-[13px] leading-[20px]"
									style={{ color: standardEmailColors.danger }}
								>
									{sale.reasons.join(", ")}
								</Text>
							</Column>
							<Column
								align="right"
								className="gnd-standard-mobile-stack"
								style={{ width: "28%" }}
							>
								<Text
									className="gnd-standard-muted m-0 text-[12px] uppercase"
									style={{ color: standardEmailColors.muted }}
								>
									Due
								</Text>
								<Text
									className="gnd-standard-danger-text m-0 mt-[3px] text-[14px] font-semibold"
									style={{ color: standardEmailColors.danger }}
								>
									{currency(sale.amountDue)}
								</Text>
							</Column>
						</Row>
					</Section>
				))
			) : (
				<Section className="gnd-standard-content px-[36px] pt-[9px]">
					<Text
						className="gnd-standard-muted m-0 text-[14px]"
						style={{ color: standardEmailColors.muted }}
					>
						No sales were skipped due to missing emails.
					</Text>
				</Section>
			)}

			{skippedSalesTruncated > 0 ? (
				<Section className="gnd-standard-content px-[36px] pb-[10px] pt-[10px]">
					<Text
						className="gnd-standard-muted m-0 text-[12px]"
						style={{ color: standardEmailColors.muted }}
					>
						+ {skippedSalesTruncated} more skipped sales omitted.
					</Text>
				</Section>
			) : null}

			<Section className="pb-[30px]" />
			<StandardEmailSignature
				department="Sales automation · GND Millwork"
				senderName={authorName}
			/>
		</StandardEmailLayout>
	);
}

SalesReminderScheduleAdminNotificationEmail.PreviewProps = {
	recipientName: "Sales Admin",
	authorName: "GND Scheduler",
	triggerType: "scheduled",
	statusUsed: "active",
	foundSalesCount: 3,
	validSalesCount: 2,
	groupedRecipientCount: 1,
	deliveredGroupCount: 1,
	failedGroupCount: 0,
	skippedSalesCount: 1,
	totalPendingAmount: 1240,
	totalSalesAmount: 2480,
	successfulRecipients: [
		{
			recipientRole: "customer",
			recipientId: 2048,
			recipientName: "Jordan Lee",
			recipientEmail: "jordan@example.invalid",
			salesCount: 1,
			totalPendingAmount: 1240,
			totalSalesAmount: 2480,
			sales: [
				{
					saleId: 10482,
					orderId: "GND-10482",
					po: "PO-7731",
					date: "2026-08-29T09:00:00.000Z",
					due: 1240,
					total: 2480,
				},
			],
		},
	],
	skippedSales: [
		{
			saleId: 10483,
			orderId: "GND-10483",
			customerName: "Sample Customer",
			customerEmail: null,
			addressEmail: null,
			salesRepEmail: "alex@example.invalid",
			reasons: ["Customer email is missing"],
			amountDue: 320,
			grandTotal: 640,
		},
	],
	successfulRecipientsTruncated: 0,
	skippedSalesTruncated: 0,
} satisfies Props;

export default SalesReminderScheduleAdminNotificationEmail;
