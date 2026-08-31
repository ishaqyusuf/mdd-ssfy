/** @jsxImportSource react */
import { Column, Heading, Row, Section, Text } from "@react-email/components";
import { format } from "date-fns";
import {
	DealerProgramBanner,
	type DealerProgramBannerProps,
} from "../components/dealer-program-banner";
import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

interface Props {
	isQuote?: boolean;
	customerName: string;
	salesRepName?: string | null;
	note?: string;
	acceptQuoteLink?: string | null;
	paymentLink?: string;
	pdfLink?: string | null;
	hasPdfAttachment?: boolean;
	dealerProgramBanner?:
		| (DealerProgramBannerProps & {
				placement: "TOP" | "BOTTOM";
		  })
		| null;
	specialOrderApprovals?: Array<{
		orderId: string;
		approvalUrl: string;
		expiresAt: Date;
	}>;
	sales: {
		orderId: string;
		po?: string;
		date: Date;
		total: number;
		due: number;
	}[];
}

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

function SummaryMetric({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<Column
			className="gnd-standard-summary-column"
			style={{ paddingRight: 18, verticalAlign: "top", width: "33.33%" }}
		>
			<Text
				className="gnd-standard-muted m-0 text-[11px] font-semibold uppercase tracking-[0.8px]"
				style={{ color: standardEmailColors.muted }}
			>
				{label}
			</Text>
			<Text
				className={
					emphasis
						? "gnd-standard-heading m-0 mt-[7px] text-[25px] font-semibold leading-[29px]"
						: "gnd-standard-text m-0 mt-[7px] text-[16px] font-semibold leading-[22px]"
				}
				style={{
					color: emphasis
						? standardEmailColors.cypress
						: standardEmailColors.ink,
					fontFamily: emphasis
						? "Georgia, 'Times New Roman', serif"
						: "Geist, Helvetica, Arial, sans-serif",
				}}
			>
				{value}
			</Text>
		</Column>
	);
}

const SalesEmail = ({
	customerName = "Ishaq Yusuf",
	salesRepName,
	sales = [
		{
			date: new Date(),
			orderId: "47837PC",
			total: 100,
			due: 50,
			po: "ABSSDD",
		},
	],
	isQuote = false,
	note,
	acceptQuoteLink = null,
	paymentLink,
	pdfLink = null,
	hasPdfAttachment = false,
	dealerProgramBanner = null,
	specialOrderApprovals = [],
}: Props) => {
	const previewText = `${isQuote ? "Quote" : "Invoice"} from GND Millwork for ${customerName}`;
	const totalAmount = sales.reduce((acc, item) => acc + (item.total || 0), 0);
	const totalDue = sales.reduce((acc, item) => acc + (item.due || 0), 0);
	const primaryAmount = isQuote ? totalAmount : totalDue;
	const documentLabel = isQuote ? "Quote" : "Invoice";
	const documentMeta =
		sales.length === 1
			? `#${sales[0]?.orderId ?? ""}`
			: `${sales.length} documents`;
	const pdfFallbackAvailable = Boolean(pdfLink && !hasPdfAttachment);

	return (
		<StandardEmailLayout previewText={previewText}>
			<StandardEmailHeader
				documentLabel={documentLabel}
				documentMeta={documentMeta}
			/>

			{dealerProgramBanner?.placement === "TOP" ? (
				<Section className="gnd-standard-content px-[36px]">
					<DealerProgramBanner {...dealerProgramBanner} />
				</Section>
			) : null}

			<Section className="gnd-standard-content px-[36px] pt-[40px]">
				<Text
					className="gnd-standard-accent-text m-0 text-[11px] font-semibold uppercase tracking-[1.5px]"
					style={{ color: standardEmailColors.cypress }}
				>
					Sales document
				</Text>
				<Heading
					className="gnd-standard-heading m-0 mt-[12px] text-[32px] font-normal leading-[39px]"
					style={{
						color: standardEmailColors.ink,
						fontFamily: "Georgia, 'Times New Roman', serif",
					}}
				>
					{isQuote ? "Quote Ready for Review" : "Invoice Ready for Payment"}
				</Heading>
				<Text
					className="gnd-standard-text m-0 mt-[18px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					Hi {customerName},
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[8px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					{isQuote
						? "Please review the scope and pricing below. When everything looks right, you can accept the quote using the secure action in this email."
						: "Please review the invoice details below. If a balance is due, you can pay securely using the action in this email."}
				</Text>
			</Section>

			{note ? (
				<Section
					className="gnd-standard-panel gnd-standard-soft gnd-standard-content mx-[36px] mt-[24px] px-[18px] py-[16px]"
					style={{
						backgroundColor: standardEmailColors.soft,
						borderLeft: `3px solid ${standardEmailColors.brass}`,
					}}
				>
					<Text
						className="gnd-standard-muted m-0 text-[11px] font-semibold uppercase tracking-[0.9px]"
						style={{ color: standardEmailColors.muted }}
					>
						A note from your sales representative
					</Text>
					<Text
						className="gnd-standard-text m-0 mt-[8px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						{note}
					</Text>
				</Section>
			) : null}

			<Section
				className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-content mx-[36px] mt-[28px] px-[20px] py-[18px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					border: `1px solid ${standardEmailColors.border}`,
					borderRadius: 6,
				}}
			>
				<Row>
					<SummaryMetric
						emphasis
						label={isQuote ? "Quoted total" : "Amount due"}
						value={formatCurrency(primaryAmount)}
					/>
					<SummaryMetric
						label={isQuote ? "Documents" : "Invoice total"}
						value={isQuote ? String(sales.length) : formatCurrency(totalAmount)}
					/>
					<SummaryMetric
						label={isQuote ? "Prepared for" : "Documents"}
						value={isQuote ? customerName : String(sales.length)}
					/>
				</Row>
			</Section>

			<Section className="gnd-standard-content px-[36px] pt-[28px]">
				<table
					cellPadding="0"
					cellSpacing="0"
					style={{
						borderCollapse: "collapse",
						tableLayout: "fixed",
						width: "100%",
					}}
				>
					<thead>
						<tr
							className="gnd-standard-table-head gnd-standard-border"
							style={{
								backgroundColor: standardEmailColors.soft,
								borderBottom: `1px solid ${standardEmailColors.border}`,
								borderTop: `1px solid ${standardEmailColors.border}`,
							}}
						>
							<th
								align="left"
								style={{ padding: "12px 8px 12px 0", width: "24%" }}
							>
								<Text
									className="gnd-standard-muted m-0 text-[10px] font-semibold uppercase tracking-[0.8px]"
									style={{ color: standardEmailColors.muted }}
								>
									Date
								</Text>
							</th>
							<th align="left" style={{ padding: "12px 8px", width: "30%" }}>
								<Text
									className="gnd-standard-muted m-0 text-[10px] font-semibold uppercase tracking-[0.8px]"
									style={{ color: standardEmailColors.muted }}
								>
									{isQuote ? "Quote no." : "Invoice no."}
								</Text>
							</th>
							<th
								align="left"
								className="gnd-standard-hide-mobile"
								style={{ padding: "12px 8px", width: "20%" }}
							>
								<Text
									className="gnd-standard-muted m-0 text-[10px] font-semibold uppercase tracking-[0.8px]"
									style={{ color: standardEmailColors.muted }}
								>
									PO no.
								</Text>
							</th>
							<th
								align="right"
								style={{ padding: "12px 0 12px 8px", width: "26%" }}
							>
								<Text
									className="gnd-standard-muted m-0 text-[10px] font-semibold uppercase tracking-[0.8px]"
									style={{ color: standardEmailColors.muted }}
								>
									Amount
								</Text>
							</th>
						</tr>
					</thead>
					<tbody>
						{sales.map((transaction, index) => (
							<tr
								className={`${index % 2 ? "gnd-standard-row-alt" : "gnd-standard-row"} gnd-standard-border`}
								key={transaction.orderId}
								style={{
									backgroundColor:
										index % 2
											? standardEmailColors.soft
											: standardEmailColors.card,
									borderBottom: `1px solid ${standardEmailColors.border}`,
								}}
							>
								<td style={{ padding: "14px 8px 14px 0" }}>
									<Text
										className="gnd-standard-text m-0 text-[13px] leading-[19px]"
										style={{ color: standardEmailColors.ink }}
									>
										{format(new Date(transaction.date), "MMM d, yyyy")}
									</Text>
								</td>
								<td style={{ padding: "14px 8px" }}>
									<Text
										className="gnd-standard-text m-0 text-[13px] font-semibold leading-[19px]"
										style={{ color: standardEmailColors.ink }}
									>
										{transaction.orderId}
									</Text>
								</td>
								<td
									className="gnd-standard-hide-mobile"
									style={{ padding: "14px 8px" }}
								>
									<Text
										className="gnd-standard-text m-0 text-[13px] leading-[19px]"
										style={{ color: standardEmailColors.ink }}
									>
										{transaction.po || "—"}
									</Text>
								</td>
								<td align="right" style={{ padding: "14px 0 14px 8px" }}>
									<Text
										className="gnd-standard-text m-0 text-[13px] font-semibold leading-[19px]"
										style={{ color: standardEmailColors.ink }}
									>
										{formatCurrency(transaction.total)}
									</Text>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{hasPdfAttachment ? (
					<Text
						className="gnd-standard-muted m-0 mt-[12px] text-[12px] leading-[19px]"
						style={{ color: standardEmailColors.muted }}
					>
						The {isQuote ? "quote" : "invoice"} PDF is attached for your
						records.
					</Text>
				) : null}
			</Section>

			{isQuote ? (
				<Section
					className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-content mx-[36px] my-[30px] px-[22px] py-[22px]"
					style={{
						backgroundColor: standardEmailColors.soft,
						border: `1px solid ${standardEmailColors.border}`,
						borderRadius: 6,
					}}
				>
					<Text
						className="gnd-standard-accent-text m-0 text-[11px] font-semibold uppercase tracking-[1px]"
						style={{ color: standardEmailColors.cypress }}
					>
						Next step
					</Text>
					<Heading
						className="gnd-standard-heading m-0 mt-[8px] text-[20px] font-normal leading-[27px]"
						style={{
							color: standardEmailColors.ink,
							fontFamily: "Georgia, 'Times New Roman', serif",
						}}
					>
						Confirm the scope when you are ready.
					</Heading>
					<Text
						className="gnd-standard-text m-0 mt-[10px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						Accepting confirms the quoted scope and pricing and takes you to the
						next step.
					</Text>
					{acceptQuoteLink ? (
						<Section className="mt-[18px]">
							<StandardEmailButton href={acceptQuoteLink}>
								Accept Quote
							</StandardEmailButton>
						</Section>
					) : null}
					{pdfFallbackAvailable && pdfLink ? (
						<Section className="mt-[12px]">
							<StandardEmailButton href={pdfLink} variant="secondary">
								Download PDF
							</StandardEmailButton>
						</Section>
					) : null}
				</Section>
			) : paymentLink || pdfFallbackAvailable ? (
				<Section
					className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-content mx-[36px] my-[30px] px-[22px] py-[22px]"
					style={{
						backgroundColor: standardEmailColors.soft,
						border: `1px solid ${standardEmailColors.border}`,
						borderRadius: 6,
					}}
				>
					<Text
						className="gnd-standard-accent-text m-0 text-[11px] font-semibold uppercase tracking-[1px]"
						style={{ color: standardEmailColors.cypress }}
					>
						Secure actions
					</Text>
					<Heading
						className="gnd-standard-heading m-0 mt-[8px] text-[20px] font-normal leading-[27px]"
						style={{
							color: standardEmailColors.ink,
							fontFamily: "Georgia, 'Times New Roman', serif",
						}}
					>
						Complete the next step online.
					</Heading>
					<Text
						className="gnd-standard-text m-0 mt-[10px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						{paymentLink && pdfFallbackAvailable
							? "Make payment securely or download the invoice PDF for your records."
							: paymentLink
								? "Make payment securely online from any device."
								: "Download the invoice PDF for your records."}
					</Text>
					{paymentLink ? (
						<Section className="mt-[18px]">
							<StandardEmailButton href={paymentLink}>
								Make Payment
							</StandardEmailButton>
						</Section>
					) : null}
					{pdfFallbackAvailable && pdfLink ? (
						<Section className="mt-[12px]">
							<StandardEmailButton href={pdfLink} variant="secondary">
								Download PDF
							</StandardEmailButton>
						</Section>
					) : null}
				</Section>
			) : (
				<Section style={{ height: 30 }} />
			)}

			{specialOrderApprovals.map((approval) => (
				<Section
					className="gnd-standard-panel gnd-standard-content mx-[36px] mb-[26px] px-[20px] py-[18px]"
					key={approval.orderId}
					style={{
						backgroundColor: "#fff8e8",
						border: `1px solid ${standardEmailColors.brass}`,
						borderRadius: 6,
					}}
				>
					<Text
						className="m-0 text-[11px] font-semibold uppercase tracking-[0.9px]"
						style={{ color: "#855514" }}
					>
						Special Order · #{approval.orderId}
					</Text>
					<Text
						className="m-0 mt-[9px] text-[14px] leading-[22px]"
						style={{ color: "#4e3516" }}
					>
						Review the complete order and non-returnable policy, then approve or
						decline this revision. This secure link expires{" "}
						{format(approval.expiresAt, "MMM d, yyyy")}.
					</Text>
					<Section className="mt-[16px]">
						<StandardEmailButton href={approval.approvalUrl}>
							Review &amp; Approve Special Order
						</StandardEmailButton>
					</Section>
				</Section>
			))}

			{dealerProgramBanner?.placement === "BOTTOM" ? (
				<Section className="gnd-standard-content px-[36px] pb-[24px]">
					<DealerProgramBanner {...dealerProgramBanner} />
				</Section>
			) : null}

			<StandardEmailSignature senderName={salesRepName} />
		</StandardEmailLayout>
	);
};

SalesEmail.PreviewProps = {
	customerName: "Ishaq Yusuf",
	salesRepName: "Jordan Lee",
	note: "Thank you for choosing GND Millwork. I’m available if you would like to walk through any part of the invoice.",
	paymentLink: "https://gndprodesk.com/checkout/preview",
	hasPdfAttachment: true,
	sales: [
		{
			date: new Date("2026-08-29T12:00:00.000Z"),
			orderId: "47837PC",
			total: 100,
			due: 50,
			po: "ABSSDD",
		},
	],
} satisfies Props;

export default SalesEmail;
