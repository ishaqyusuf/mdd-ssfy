/** @jsxImportSource react */
import { Column, Heading, Row, Section, Text } from "@react-email/components";
import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

interface Props {
	customerEmail: string;
	customerName: string;
	salesRepName?: string | null;
	statementTotal: number;
	accountNo?: string | null;
	message?: string | null;
	paymentLink?: string | null;
	lines: {
		salesId: number;
		orderNo: string;
		poNo?: string | null;
		date: string;
		invoice: number;
		paid: number;
		pending: number;
		customer: string;
		phone?: string | null;
		address?: string | null;
	}[];
}

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

function StatementAmount({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: number;
	emphasis?: boolean;
}) {
	return (
		<Column style={{ paddingRight: 10, verticalAlign: "top", width: "33.33%" }}>
			<Text
				className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.7px]"
				style={{ color: standardEmailColors.muted }}
			>
				{label}
			</Text>
			<Text
				className="gnd-standard-text m-0 mt-[5px] text-[14px] font-semibold leading-[20px]"
				style={{
					color: emphasis
						? standardEmailColors.cypress
						: standardEmailColors.ink,
				}}
			>
				{formatCurrency(value)}
			</Text>
		</Column>
	);
}

export function CustomerStatementEmail({
	customerEmail,
	customerName,
	salesRepName,
	statementTotal,
	accountNo,
	message,
	paymentLink,
	lines,
}: Props) {
	const previewText = `Statement for ${customerName} — ${formatCurrency(statementTotal)} due`;
	const intro =
		message || "Please review the current statement for your account below.";
	const documentMeta =
		accountNo || `${lines.length} open order${lines.length === 1 ? "" : "s"}`;

	return (
		<StandardEmailLayout previewText={previewText}>
			<StandardEmailHeader
				documentLabel="Account statement"
				documentMeta={documentMeta}
			/>

			<StandardEmailHero
				eyebrow="Customer account"
				recipientName={customerName}
				title="Your Account Statement"
			>
				<Text
					className="gnd-standard-text m-0 mt-[9px] text-[16px] leading-[25px]"
					style={{ color: standardEmailColors.ink }}
				>
					{intro}
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border gnd-standard-content mx-[36px] mt-[28px] px-[20px] py-[18px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					border: `1px solid ${standardEmailColors.border}`,
					borderRadius: 6,
				}}
			>
				<Row>
					<StandardEmailMetric
						emphasis
						label="Total due"
						value={formatCurrency(statementTotal)}
					/>
					<StandardEmailMetric
						label="Open orders"
						value={String(lines.length)}
					/>
					<StandardEmailMetric
						label="Account"
						value={accountNo || "Not assigned"}
					/>
				</Row>
			</Section>

			{paymentLink ? (
				<Section
					className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-content mx-[36px] mt-[28px] px-[22px] py-[22px]"
					style={{
						backgroundColor: standardEmailColors.soft,
						border: `1px solid ${standardEmailColors.border}`,
						borderRadius: 6,
					}}
				>
					<Text
						className="gnd-standard-accent-text m-0 text-[12px] font-semibold uppercase tracking-[1px]"
						style={{ color: standardEmailColors.cypress }}
					>
						Payment options
					</Text>
					<Heading
						className="gnd-standard-heading m-0 mt-[8px] text-[20px] font-normal leading-[27px]"
						style={{
							color: standardEmailColors.ink,
							fontFamily: "Georgia, 'Times New Roman', serif",
						}}
					>
						Choose what you would like to pay
					</Heading>
					<Text
						className="gnd-standard-text m-0 mt-[8px] mb-[16px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						Pay all open items or select individual orders in the secure payment
						portal.
					</Text>
					<StandardEmailButton href={paymentLink}>
						Open payment portal
					</StandardEmailButton>
				</Section>
			) : null}

			<Section className="gnd-standard-content px-[36px] py-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Open order details
				</Text>

				{lines.length ? (
					lines.map((line, index) => (
						<Section
							key={`${line.salesId}-${line.orderNo}`}
							className={`${index % 2 ? "gnd-standard-row-alt" : "gnd-standard-row"} gnd-standard-border mt-[10px] px-[16px] py-[16px]`}
							style={{
								backgroundColor:
									index % 2
										? standardEmailColors.soft
										: standardEmailColors.card,
								border: `1px solid ${standardEmailColors.border}`,
								borderRadius: 6,
							}}
						>
							<Row>
								<Column
									className="gnd-standard-mobile-stack"
									style={{ verticalAlign: "top", width: "60%" }}
								>
									<Text
										className="gnd-standard-text m-0 text-[15px] font-semibold leading-[21px]"
										style={{ color: standardEmailColors.ink }}
									>
										Order #{line.orderNo}
									</Text>
									<Text
										className="gnd-standard-muted m-0 mt-[4px] text-[13px] leading-[19px]"
										style={{ color: standardEmailColors.muted }}
									>
										{line.date} · P.O. {line.poNo || "—"}
									</Text>
								</Column>
								<Column
									align="right"
									className="gnd-standard-mobile-stack"
									style={{ verticalAlign: "top", width: "40%" }}
								>
									<Text
										className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.7px]"
										style={{ color: standardEmailColors.muted }}
									>
										Balance due
									</Text>
									<Text
										className="gnd-standard-heading m-0 mt-[4px] text-[18px] font-semibold leading-[23px]"
										style={{
											color: standardEmailColors.cypress,
											fontFamily: "Georgia, 'Times New Roman', serif",
										}}
									>
										{formatCurrency(line.pending)}
									</Text>
								</Column>
							</Row>

							<Section
								className="gnd-standard-border mt-[14px] pt-[14px]"
								style={{ borderTop: `1px solid ${standardEmailColors.border}` }}
							>
								<Row>
									<StatementAmount label="Invoice" value={line.invoice} />
									<StatementAmount label="Paid" value={line.paid} />
									<StatementAmount
										emphasis
										label="Pending"
										value={line.pending}
									/>
								</Row>
							</Section>

							<Text
								className="gnd-standard-muted m-0 mt-[13px] text-[12px] leading-[19px]"
								style={{ color: standardEmailColors.muted }}
							>
								{line.customer}
								{line.phone ? ` · ${line.phone}` : ""}
								{line.address ? (
									<>
										<br />
										{line.address}
									</>
								) : null}
							</Text>
						</Section>
					))
				) : (
					<Section
						className="gnd-standard-soft gnd-standard-border mt-[10px] px-[18px] py-[18px]"
						style={{
							backgroundColor: standardEmailColors.soft,
							border: `1px solid ${standardEmailColors.border}`,
							borderRadius: 6,
						}}
					>
						<Text
							className="gnd-standard-text m-0 text-[14px] leading-[22px]"
							style={{ color: standardEmailColors.ink }}
						>
							There are no open orders on this statement.
						</Text>
					</Section>
				)}

				<Text
					className="gnd-standard-text m-0 mt-[20px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					Statement recipient: {customerEmail}. If you have questions about an
					order or balance, reply directly to this email.
				</Text>
			</Section>

			<StandardEmailSignature senderName={salesRepName} />
		</StandardEmailLayout>
	);
}

CustomerStatementEmail.PreviewProps = {
	customerEmail: "jordan@example.invalid",
	customerName: "Jordan Lee",
	salesRepName: "Taylor Morgan",
	statementTotal: 1975,
	accountNo: "ACCT-2048",
	message: "Please see the current statement for your account.",
	paymentLink: "https://gndprodesk.com/pay/preview",
	lines: [
		{
			salesId: 10482,
			orderNo: "GND-10482",
			poNo: "PO-7731",
			date: "Aug 29, 2026",
			invoice: 2480,
			paid: 1240,
			pending: 1240,
			customer: "Jordan Lee",
			phone: "+1 (555) 010-2048",
			address: "1200 Market Street, Philadelphia, PA",
		},
		{
			salesId: 10461,
			orderNo: "GND-10461",
			poNo: "PO-7684",
			date: "Aug 18, 2026",
			invoice: 980,
			paid: 490,
			pending: 490,
			customer: "Jordan Lee",
			phone: "+1 (555) 010-2048",
			address: "1200 Market Street, Philadelphia, PA",
		},
		{
			salesId: 10394,
			orderNo: "GND-10394",
			date: "Aug 4, 2026",
			invoice: 735,
			paid: 490,
			pending: 245,
			customer: "Jordan Lee",
			phone: "+1 (555) 010-2048",
			address: "1200 Market Street, Philadelphia, PA",
		},
	],
} satisfies Props;

export default CustomerStatementEmail;
