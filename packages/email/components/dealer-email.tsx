/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";
import type React from "react";

import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "./standard-email";

type DealerEmailFrameProps = {
	children?: React.ReactNode;
	description: React.ReactNode;
	documentLabel: string;
	documentMeta: string;
	eyebrow: string;
	previewText: string;
	recipientName: string;
	title: string;
};

export function DealerEmailFrame({
	children,
	description,
	documentLabel,
	documentMeta,
	eyebrow,
	previewText,
	recipientName,
	title,
}: DealerEmailFrameProps) {
	return (
		<StandardEmailLayout previewText={previewText}>
			<StandardEmailHeader
				documentLabel={documentLabel}
				documentMeta={documentMeta}
			/>
			<StandardEmailHero
				eyebrow={eyebrow}
				recipientName={recipientName}
				title={title}
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					{description}
				</Text>
			</StandardEmailHero>
			{children}
			<StandardEmailSignature
				department="Dealership · GND Millwork"
				senderName="GND Millwork Dealer Team"
			/>
		</StandardEmailLayout>
	);
}

type DealerEmailDetailProps = {
	label: string;
	value: React.ReactNode;
};

export function DealerEmailDetails({
	items,
}: {
	items: DealerEmailDetailProps[];
}) {
	const rows = Array.from({ length: Math.ceil(items.length / 2) }, (_, index) =>
		items.slice(index * 2, index * 2 + 2),
	);

	return (
		<Section
			className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[26px] rounded-[6px] border border-solid px-[20px] py-[18px]"
			style={{
				backgroundColor: standardEmailColors.softGreen,
				borderColor: standardEmailColors.border,
			}}
		>
			{rows.map((row, rowIndex) => (
				<Row key={row[0]?.label} className={rowIndex ? "mt-[16px]" : ""}>
					{row.map((item) => (
						<Column
							key={item.label}
							className="gnd-standard-mobile-stack"
							style={{ paddingRight: 12, verticalAlign: "top", width: "50%" }}
						>
							<Text
								className="gnd-standard-muted m-0 text-[11px] font-semibold uppercase tracking-[0.9px]"
								style={{ color: standardEmailColors.muted }}
							>
								{item.label}
							</Text>
							<Text
								className="gnd-standard-text m-0 mt-[4px] text-[15px] font-semibold leading-[22px]"
								style={{ color: standardEmailColors.ink }}
							>
								{item.value}
							</Text>
						</Column>
					))}
				</Row>
			))}
		</Section>
	);
}

export function DealerEmailNote({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<Section
			className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-brass-border mx-[36px] mt-[18px] rounded-[6px] border border-solid px-[20px] py-[17px]"
			style={{
				backgroundColor: standardEmailColors.soft,
				borderColor: standardEmailColors.border,
				borderLeft: `4px solid ${standardEmailColors.brass}`,
			}}
		>
			<Text
				className="gnd-standard-muted m-0 text-[11px] font-semibold uppercase tracking-[0.9px]"
				style={{ color: standardEmailColors.muted }}
			>
				{label}
			</Text>
			<Text
				className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
				style={{ color: standardEmailColors.ink }}
			>
				{children}
			</Text>
		</Section>
	);
}

export function DealerEmailActions({
	children,
}: {
	children?: React.ReactNode;
}) {
	return (
		<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[26px]">
			{children}
		</Section>
	);
}

export { StandardEmailButton };
