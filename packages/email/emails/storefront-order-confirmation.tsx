/** @jsxImportSource react */

import { Column, Row, Section, Text } from "@react-email/components";

import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

interface Props {
	name?: string;
	orderId?: string;
	orderDate?: string;
	shippingAddress?: {
		street: string;
		city: string;
		state: string;
		zip: string;
	};
	items?: {
		name: string;
		quantity: number;
		price: number;
	}[];
	total?: number;
}

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		value || 0,
	);

export default function StorefrontOrderConfirmation({
	name = "Jordan Lee",
	orderId = "STORE-10482",
	orderDate = "August 30, 2026",
	shippingAddress = {
		street: "13285 SW 131st St",
		city: "Miami",
		state: "FL",
		zip: "33186",
	},
	items = [
		{ name: "Shaker cabinet door — Snow White", quantity: 4, price: 86 },
		{ name: "Soft-close hinge set", quantity: 2, price: 28 },
	],
	total = 400,
}: Props) {
	const itemLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;

	return (
		<StandardEmailLayout
			previewText={`Your GND Millwork order #${orderId} is confirmed`}
		>
			<StandardEmailHeader
				documentLabel="Order confirmation"
				documentMeta={`#${orderId}`}
			/>

			<StandardEmailHero
				eyebrow="Order received"
				recipientName={name}
				title="Thank You for Your Order"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					We have received your order and will let you know when it ships. Keep
					this confirmation for your records.
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
						label="Order total"
						value={formatCurrency(total)}
					/>
					<StandardEmailMetric label="Order date" value={orderDate} />
					<StandardEmailMetric label="Contents" value={itemLabel} />
				</Row>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[8px] pt-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Order summary
				</Text>
			</Section>

			{items.map((item, index) => (
				<Section
					className={`gnd-standard-panel gnd-standard-border mx-[36px] mt-[10px] rounded-[6px] border border-solid px-[20px] py-[16px] ${index % 2 === 1 ? "gnd-standard-row-alt" : "gnd-standard-row"}`}
					key={`${item.name}-${index}`}
					style={{
						backgroundColor:
							index % 2 === 1
								? standardEmailColors.soft
								: standardEmailColors.card,
						borderColor: standardEmailColors.border,
					}}
				>
					<Row>
						<Column
							className="gnd-standard-mobile-stack"
							style={{ width: "58%" }}
						>
							<Text
								className="gnd-standard-text m-0 text-[15px] font-semibold leading-[22px]"
								style={{ color: standardEmailColors.ink }}
							>
								{item.name}
							</Text>
							<Text
								className="gnd-standard-muted m-0 mt-[5px] text-[12px] leading-[18px]"
								style={{ color: standardEmailColors.muted }}
							>
								{item.quantity} × {formatCurrency(item.price)} each
							</Text>
						</Column>
						<Column
							align="right"
							className="gnd-standard-mobile-stack"
							style={{ width: "42%" }}
						>
							<Text
								className="gnd-standard-muted m-0 text-[12px] uppercase tracking-[0.7px]"
								style={{ color: standardEmailColors.muted }}
							>
								Line total
							</Text>
							<Text
								className="gnd-standard-text m-0 mt-[5px] text-[15px] font-semibold"
								style={{ color: standardEmailColors.ink }}
							>
								{formatCurrency(item.quantity * item.price)}
							</Text>
						</Column>
					</Row>
				</Section>
			))}

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[10px] rounded-[6px] border border-solid px-[20px] py-[17px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Row>
					<Column>
						<Text
							className="gnd-standard-text m-0 text-[14px] font-semibold"
							style={{ color: standardEmailColors.ink }}
						>
							Order total
						</Text>
					</Column>
					<Column align="right">
						<Text
							className="gnd-standard-heading m-0 text-[20px] font-semibold"
							style={{ color: standardEmailColors.cypress }}
						>
							{formatCurrency(total)}
						</Text>
					</Column>
				</Row>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-border mx-[36px] mb-[34px] mt-[24px] rounded-[6px] border border-solid px-[20px] py-[18px]"
				style={{ borderColor: standardEmailColors.border }}
			>
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.9px]"
					style={{ color: standardEmailColors.muted }}
				>
					Shipping to
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[8px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					{shippingAddress.street}
					<br />
					{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
				</Text>
			</Section>

			<StandardEmailSignature />
		</StandardEmailLayout>
	);
}
