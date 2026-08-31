/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";

import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

export interface SalesDailyPaymentReportEmailProps {
	reportDate: string;
	periodStart: string;
	periodEnd: string;
	timezone: string;
	generatedAt: string;
	totalPaymentsReceived: number;
	totalRefunds: number;
	netReceived: number;
	paymentCount: number;
	methodTotals: {
		paymentMethod: string;
		count: number;
		netReceived: number;
	}[];
	exceptionCount: number;
	downloadUrl?: string | null;
}

const currency = (value: number) =>
	Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		Number(value) || 0,
	);

const titleCase = (value: string) =>
	value
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");

export function SalesDailyPaymentReportEmail(
	props: SalesDailyPaymentReportEmailProps,
) {
	const exceptionLabel = `${props.exceptionCount} exception${props.exceptionCount === 1 ? "" : "s"}`;

	return (
		<StandardEmailLayout
			previewText={`${currency(props.netReceived)} net received on ${props.reportDate}`}
		>
			<StandardEmailHeader
				documentLabel="Daily payment report"
				documentMeta={props.reportDate}
			/>

			<StandardEmailHero
				eyebrow="Sales reporting"
				title={`${currency(props.netReceived)} Net Received`}
			>
				<Text
					className="gnd-standard-muted m-0 mt-[14px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.muted }}
				>
					{props.periodStart} to {props.periodEnd} · {props.timezone}
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid p-[20px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Row>
					<StandardEmailMetric
						emphasis
						label="Gross received"
						value={currency(props.totalPaymentsReceived)}
					/>
					<StandardEmailMetric
						label="Refunds"
						value={currency(props.totalRefunds)}
					/>
					<StandardEmailMetric
						label="Payments"
						value={String(props.paymentCount)}
					/>
				</Row>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[8px] pt-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Payment method breakdown
				</Text>
			</Section>

			{props.methodTotals.length ? (
				props.methodTotals.map((method, index) => (
					<Section
						className={`gnd-standard-panel gnd-standard-border mx-[36px] mt-[10px] rounded-[6px] border border-solid px-[20px] py-[15px] ${index % 2 === 1 ? "gnd-standard-row-alt" : "gnd-standard-row"}`}
						key={method.paymentMethod}
						style={{
							backgroundColor:
								index % 2 === 1
									? standardEmailColors.soft
									: standardEmailColors.card,
							borderColor: standardEmailColors.border,
						}}
					>
						<Row>
							<Column style={{ width: "48%" }}>
								<Text
									className="gnd-standard-text m-0 text-[14px] font-semibold"
									style={{ color: standardEmailColors.ink }}
								>
									{titleCase(method.paymentMethod)}
								</Text>
							</Column>
							<Column align="right" style={{ width: "20%" }}>
								<Text
									className="gnd-standard-muted m-0 text-[12px]"
									style={{ color: standardEmailColors.muted }}
								>
									{method.count} payment{method.count === 1 ? "" : "s"}
								</Text>
							</Column>
							<Column align="right" style={{ width: "32%" }}>
								<Text
									className="gnd-standard-text m-0 text-[14px] font-semibold"
									style={{ color: standardEmailColors.ink }}
								>
									{currency(method.netReceived)}
								</Text>
							</Column>
						</Row>
					</Section>
				))
			) : (
				<Section
					className="gnd-standard-panel gnd-standard-border mx-[36px] mt-[10px] rounded-[6px] border border-solid px-[20px] py-[16px]"
					style={{ borderColor: standardEmailColors.border }}
				>
					<Text
						className="gnd-standard-muted m-0 text-[14px]"
						style={{ color: standardEmailColors.muted }}
					>
						No payments were recorded in this period.
					</Text>
				</Section>
			)}

			<Section
				className={`gnd-standard-panel gnd-standard-border mx-[36px] mt-[22px] rounded-[6px] border border-solid px-[20px] py-[17px] ${props.exceptionCount ? "gnd-standard-soft-danger" : "gnd-standard-soft-green"}`}
				style={{
					backgroundColor: props.exceptionCount
						? standardEmailColors.softDanger
						: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Text
					className={
						props.exceptionCount
							? "gnd-standard-danger-text m-0 text-[14px] font-semibold leading-[22px]"
							: "gnd-standard-accent-text m-0 text-[14px] font-semibold leading-[22px]"
					}
					style={{
						color: props.exceptionCount
							? standardEmailColors.danger
							: standardEmailColors.cypress,
					}}
				>
					{exceptionLabel} flagged for accounting review.
				</Text>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[24px]">
				{props.downloadUrl ? (
					<StandardEmailButton href={props.downloadUrl}>
						Download Excel report
					</StandardEmailButton>
				) : null}
				<Text
					className="gnd-standard-muted m-0 mt-[16px] text-[13px] leading-[21px]"
					style={{ color: standardEmailColors.muted }}
				>
					The attached workbook includes summary, method breakdown, payment
					detail, and exceptions tabs. Generated at {props.generatedAt}.
				</Text>
			</Section>

			<StandardEmailSignature
				department="Sales reporting · GND Millwork"
				senderName="GND Millwork Reports"
			/>
		</StandardEmailLayout>
	);
}

export const createSalesDailyPaymentReportEmail = (
	props: SalesDailyPaymentReportEmailProps,
) => <SalesDailyPaymentReportEmail {...props} />;

SalesDailyPaymentReportEmail.PreviewProps = {
	reportDate: "2026-08-29",
	periodStart: "08/29/2026, 00:00",
	periodEnd: "08/29/2026, 23:59",
	timezone: "America/New_York",
	generatedAt: "08/30/2026, 00:02",
	totalPaymentsReceived: 18_640,
	totalRefunds: 520,
	netReceived: 18_120,
	paymentCount: 14,
	methodTotals: [
		{ paymentMethod: "card", count: 7, netReceived: 9860 },
		{ paymentMethod: "check", count: 4, netReceived: 5420 },
		{ paymentMethod: "zelle", count: 3, netReceived: 2840 },
	],
	exceptionCount: 2,
	downloadUrl: "https://gndprodesk.com/reports/preview.xlsx",
} satisfies SalesDailyPaymentReportEmailProps;

export default SalesDailyPaymentReportEmail;
