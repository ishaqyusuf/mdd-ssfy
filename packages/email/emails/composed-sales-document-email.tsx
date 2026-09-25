/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";
import { format } from "date-fns";
import {
	DealerProgramBanner,
	type DealerProgramBannerProps,
} from "../components/dealer-program-banner";
import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailPriorityAction,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

type Props = {
	subject: string;
	customerName: string;
	salesRepName?: string | null;
	message?: string;
	paymentLink?: string;
	pdfLink?: string;
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
};

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

export default function ComposedSalesDocumentEmail({
	subject,
	customerName,
	salesRepName,
	message,
	paymentLink,
	pdfLink,
	hasPdfAttachment = false,
	sales,
	dealerProgramBanner,
	specialOrderApprovals = [],
}: Props) {
	const totalAmount = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
	const totalDue = sales.reduce((acc, sale) => acc + (sale.due || 0), 0);
	const documentMeta =
		sales.length === 1
			? `#${sales[0]?.orderId ?? ""}`
			: `${sales.length} documents`;
	const messageLineCounts = new Map<string, number>();
	const messageLines = (message || "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const count = messageLineCounts.get(line) || 0;
			messageLineCounts.set(line, count + 1);

			return {
				key: count ? `${line}-${count}` : line,
				line,
			};
		});

	return (
		<StandardEmailLayout previewText={subject}>
			<StandardEmailHeader
				documentLabel="Sales document"
				documentMeta={documentMeta}
			/>

			{dealerProgramBanner?.placement === "TOP" ? (
				<Section className="gnd-standard-content px-[36px]">
					<DealerProgramBanner {...dealerProgramBanner} />
				</Section>
			) : null}

			<StandardEmailHero
				eyebrow="A note from your sales representative"
				recipientName={customerName}
				title={subject}
			>
				{messageLines.length ? (
					<Section className="mt-[8px]">
						{messageLines.map(({ key, line }) => (
							<Text
								key={key}
								className="gnd-standard-text m-0 mt-[9px] text-[16px] leading-[25px]"
								style={{ color: standardEmailColors.ink }}
							>
								{line}
							</Text>
						))}
					</Section>
				) : (
					<Text
						className="gnd-standard-text m-0 mt-[9px] text-[16px] leading-[25px]"
						style={{ color: standardEmailColors.ink }}
					>
						Please review the details below. Reply directly to this email if you
						have any questions.
					</Text>
				)}
			</StandardEmailHero>

			<StandardEmailPriorityAction
				actionLabel="Make payment"
				href={totalDue > 0 ? paymentLink : null}
				label="Outstanding balance"
				value={formatCurrency(totalDue)}
			/>

			<Section className="gnd-standard-content px-[36px] pt-[20px]">
				<Row>
					<StandardEmailMetric
						label="Document total"
						value={formatCurrency(totalAmount)}
					/>
					<StandardEmailMetric label="Documents" value={String(sales.length)} />
				</Row>
			</Section>

			<Section className="gnd-standard-content px-[36px] pt-[28px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Document summary
				</Text>
				{sales.map((sale, index) => (
					<Section
						key={sale.orderId}
						className={`${index % 2 ? "gnd-standard-row-alt" : "gnd-standard-row"} gnd-standard-border mt-[10px] px-[16px] py-[15px]`}
						style={{
							backgroundColor:
								index % 2 ? standardEmailColors.soft : standardEmailColors.card,
							border: `1px solid ${standardEmailColors.border}`,
							borderRadius: 6,
						}}
					>
						<Row>
							<Column
								className="gnd-standard-mobile-stack"
								style={{ verticalAlign: "top", width: "58%" }}
							>
								<Text
									className="gnd-standard-text m-0 text-[15px] font-semibold leading-[21px]"
									style={{ color: standardEmailColors.ink }}
								>
									#{sale.orderId}
								</Text>
								<Text
									className="gnd-standard-muted m-0 mt-[4px] text-[13px] leading-[19px]"
									style={{ color: standardEmailColors.muted }}
								>
									{format(sale.date, "MMM d, yyyy")}
									{sale.po ? ` · PO ${sale.po}` : ""}
								</Text>
							</Column>
							<Column
								align="right"
								className="gnd-standard-mobile-stack"
								style={{ verticalAlign: "top", width: "42%" }}
							>
								<Text
									className="gnd-standard-text m-0 text-[15px] font-semibold leading-[21px]"
									style={{ color: standardEmailColors.ink }}
								>
									{formatCurrency(sale.total)}
								</Text>
								<Text
									className="gnd-standard-muted m-0 mt-[4px] text-[12px] leading-[18px]"
									style={{ color: standardEmailColors.muted }}
								>
									{formatCurrency(sale.due)} due
								</Text>
							</Column>
						</Row>
					</Section>
				))}
				{hasPdfAttachment ? (
					<Text
						className="gnd-standard-muted m-0 mt-[12px] text-[12px] leading-[19px]"
						style={{ color: standardEmailColors.muted }}
					>
						The PDF is attached for your records.
					</Text>
				) : null}
			</Section>

			{pdfLink && !hasPdfAttachment ? (
				<Section className="gnd-standard-content px-[36px] pt-[20px] pb-[24px]">
					<Text
						className="gnd-standard-muted m-0 mb-[12px] text-[12px] leading-[19px]"
						style={{ color: standardEmailColors.muted }}
					>
						Download a PDF copy for your records.
					</Text>
					<StandardEmailButton href={pdfLink} variant="secondary">
						Download PDF
					</StandardEmailButton>
				</Section>
			) : null}

			{specialOrderApprovals.length ? (
				<Section className="gnd-standard-content px-[36px] pb-[30px]">
					{specialOrderApprovals.map((approval) => (
						<Section
							key={approval.orderId}
							className="gnd-standard-soft gnd-standard-border mb-[14px] p-[18px]"
							style={{
								backgroundColor: standardEmailColors.soft,
								border: `1px solid ${standardEmailColors.border}`,
								borderRadius: 6,
							}}
						>
							<Text
								className="gnd-standard-accent-text m-0 text-[12px] font-semibold uppercase tracking-[0.9px]"
								style={{ color: standardEmailColors.cypress }}
							>
								Special Order · #{approval.orderId}
							</Text>
							<Text
								className="gnd-standard-text m-0 mt-[8px] mb-[14px] text-[15px] leading-[24px]"
								style={{ color: standardEmailColors.ink }}
							>
								Review the complete order and non-returnable policy, then
								approve or decline this revision. This secure link expires{" "}
								{format(approval.expiresAt, "MMM d, yyyy")}.
							</Text>
							<StandardEmailButton href={approval.approvalUrl}>
								Review &amp; Approve Special Order
							</StandardEmailButton>
						</Section>
					))}
				</Section>
			) : null}

			{dealerProgramBanner?.placement === "BOTTOM" ? (
				<Section className="gnd-standard-content px-[36px] pb-[30px]">
					<DealerProgramBanner {...dealerProgramBanner} />
				</Section>
			) : null}
			<StandardEmailSignature senderName={salesRepName} />
		</StandardEmailLayout>
	);
}

ComposedSalesDocumentEmail.PreviewProps = {
	subject: "Your GND invoice is ready",
	customerName: "Jordan Lee",
	salesRepName: "Taylor Morgan",
	message: "Thank you for your order. Please review the invoice details below.",
	paymentLink: "https://gndprodesk.com/pay/preview",
	pdfLink: "https://gndprodesk.com/documents/preview",
	hasPdfAttachment: true,
	sales: [
		{
			orderId: "GND-10482",
			po: "PO-7731",
			date: new Date("2026-08-29T09:00:00.000Z"),
			total: 2480,
			due: 1240,
		},
	],
} satisfies Props;
