import {
	Body,
	Column,
	Container,
	Heading,
	Preview,
	Row,
	Section,
	Text,
} from "@react-email/components";
import { format } from "date-fns";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

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
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
			<Body
				className={`my-auto mx-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`my-[28px] mx-auto p-[20px] max-w-[700px] ${themeClasses.container}`}
					style={{
						borderStyle: "solid",
						borderWidth: 1,
						borderColor: lightStyles.container.borderColor,
						borderRadius: 12,
					}}
				>
					<Logo />
					<Heading
						className={`text-[24px] leading-[30px] mb-[8px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						Sales Reminder Schedule Summary
					</Heading>
					<Text className={`m-0 mb-[12px] ${themeClasses.text}`}>
						Hi {recipientName}, this is the {label(triggerType)} run summary
						from {authorName}.
					</Text>

					<Section
						className="mb-[16px] p-[14px]"
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
							borderRadius: 10,
							backgroundColor: "#f8fafc",
						}}
					>
						<Row>
							<Column style={{ width: "25%" }}>
								<Text className={`m-0 text-[12px] ${themeClasses.mutedText}`}>
									Status
								</Text>
								<Text
									className={`m-0 mt-[2px] text-[15px] font-semibold ${themeClasses.text}`}
								>
									{label(statusUsed)}
								</Text>
							</Column>
							<Column style={{ width: "25%" }}>
								<Text className={`m-0 text-[12px] ${themeClasses.mutedText}`}>
									Delivered
								</Text>
								<Text
									className={`m-0 mt-[2px] text-[15px] font-semibold ${themeClasses.text}`}
								>
									{deliveredGroupCount}
								</Text>
							</Column>
							<Column style={{ width: "25%" }}>
								<Text className={`m-0 text-[12px] ${themeClasses.mutedText}`}>
									Failed
								</Text>
								<Text
									className={`m-0 mt-[2px] text-[15px] font-semibold ${themeClasses.text}`}
								>
									{failedGroupCount}
								</Text>
							</Column>
							<Column style={{ width: "25%" }}>
								<Text className={`m-0 text-[12px] ${themeClasses.mutedText}`}>
									Skipped Sales
								</Text>
								<Text
									className={`m-0 mt-[2px] text-[15px] font-semibold ${themeClasses.text}`}
								>
									{skippedSalesCount}
								</Text>
							</Column>
						</Row>
					</Section>

					<Section className="mb-[18px]">
						<Text className={`m-0 ${themeClasses.text}`}>
							Found sales: <strong>{foundSalesCount}</strong> | Valid sales:{" "}
							<strong>{validSalesCount}</strong> | Recipient groups:{" "}
							<strong>{groupedRecipientCount}</strong>
						</Text>
						<Text className={`m-0 mt-[4px] ${themeClasses.text}`}>
							Total pending: <strong>{currency(totalPendingAmount)}</strong> |
							Total sales value: <strong>{currency(totalSalesAmount)}</strong>
						</Text>
					</Section>

					<Heading
						className={`text-[18px] mb-[8px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						Successful Recipients ({successfulRecipients.length})
					</Heading>
					{successfulRecipients.length === 0 ? (
						<Text className={`mt-[6px] ${themeClasses.text}`}>
							No reminder emails were delivered in this run.
						</Text>
					) : (
						successfulRecipients.map((recipient) => (
							<Section
								key={`${recipient.recipientRole}-${recipient.recipientId}`}
								className="mb-[14px] p-[12px]"
								style={{
									borderStyle: "solid",
									borderWidth: 1,
									borderColor: lightStyles.container.borderColor,
									borderRadius: 10,
								}}
							>
								<Text
									className={`m-0 text-[14px] font-semibold ${themeClasses.text}`}
								>
									{recipient.recipientName} ({recipient.recipientEmail})
								</Text>
								<Text
									className={`m-0 mt-[2px] text-[13px] ${themeClasses.mutedText}`}
								>
									Role: {recipient.recipientRole} | Sales:{" "}
									{recipient.salesCount} | Pending:{" "}
									{currency(recipient.totalPendingAmount)} | Total:{" "}
									{currency(recipient.totalSalesAmount)}
								</Text>
								<table style={{ width: "100%", marginTop: 8 }}>
									<thead>
										<tr>
											<th align="left">
												<Text
													className={`m-0 text-[12px] ${themeClasses.mutedText}`}
												>
													Date
												</Text>
											</th>
											<th align="left">
												<Text
													className={`m-0 text-[12px] ${themeClasses.mutedText}`}
												>
													Order
												</Text>
											</th>
											<th align="left">
												<Text
													className={`m-0 text-[12px] ${themeClasses.mutedText}`}
												>
													PO
												</Text>
											</th>
											<th align="left">
												<Text
													className={`m-0 text-[12px] ${themeClasses.mutedText}`}
												>
													Due
												</Text>
											</th>
										</tr>
									</thead>
									<tbody>
										{recipient.sales.map((sale) => (
											<tr key={sale.saleId}>
												<td>
													<Text
														className={`m-0 text-[13px] ${themeClasses.text}`}
													>
														{formatDate(sale.date)}
													</Text>
												</td>
												<td>
													<Text
														className={`m-0 text-[13px] ${themeClasses.text}`}
													>
														{sale.orderId}
													</Text>
												</td>
												<td>
													<Text
														className={`m-0 text-[13px] ${themeClasses.text}`}
													>
														{sale.po || "-"}
													</Text>
												</td>
												<td>
													<Text
														className={`m-0 text-[13px] ${themeClasses.text}`}
													>
														{currency(sale.due)}
													</Text>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</Section>
						))
					)}
					{successfulRecipientsTruncated > 0 ? (
						<Text
							className={`m-0 mt-[6px] text-[12px] ${themeClasses.mutedText}`}
						>
							+ {successfulRecipientsTruncated} more recipient groups omitted.
						</Text>
					) : null}

					<Heading
						className={`text-[18px] mt-[10px] mb-[8px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						Skipped Sales ({skippedSales.length})
					</Heading>
					{skippedSales.length === 0 ? (
						<Text className={`mt-[6px] ${themeClasses.text}`}>
							No sales were skipped due to missing emails.
						</Text>
					) : (
						<table style={{ width: "100%" }}>
							<thead>
								<tr>
									<th align="left">
										<Text
											className={`m-0 text-[12px] ${themeClasses.mutedText}`}
										>
											Order
										</Text>
									</th>
									<th align="left">
										<Text
											className={`m-0 text-[12px] ${themeClasses.mutedText}`}
										>
											Customer
										</Text>
									</th>
									<th align="left">
										<Text
											className={`m-0 text-[12px] ${themeClasses.mutedText}`}
										>
											Reasons
										</Text>
									</th>
									<th align="left">
										<Text
											className={`m-0 text-[12px] ${themeClasses.mutedText}`}
										>
											Due
										</Text>
									</th>
								</tr>
							</thead>
							<tbody>
								{skippedSales.map((sale) => (
									<tr key={sale.saleId}>
										<td>
											<Text className={`m-0 text-[13px] ${themeClasses.text}`}>
												{sale.orderId}
											</Text>
										</td>
										<td>
											<Text className={`m-0 text-[13px] ${themeClasses.text}`}>
												{sale.customerName || "-"}
											</Text>
										</td>
										<td>
											<Text className={`m-0 text-[13px] ${themeClasses.text}`}>
												{sale.reasons.join(", ")}
											</Text>
										</td>
										<td>
											<Text className={`m-0 text-[13px] ${themeClasses.text}`}>
												{currency(sale.amountDue)}
											</Text>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
					{skippedSalesTruncated > 0 ? (
						<Text
							className={`m-0 mt-[6px] text-[12px] ${themeClasses.mutedText}`}
						>
							+ {skippedSalesTruncated} more skipped sales omitted.
						</Text>
					) : null}
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

export default SalesReminderScheduleAdminNotificationEmail;
