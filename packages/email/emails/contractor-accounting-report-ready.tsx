/** @jsxImportSource react */
import { Section, Text } from "@react-email/components";
import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

export type ContractorAccountingReportReadyEmailProps = {
	from: string;
	kind: string;
	to: string;
	url: string;
};

export default function ContractorAccountingReportReadyEmail({
	from,
	kind,
	to,
	url,
}: ContractorAccountingReportReadyEmailProps) {
	return (
		<StandardEmailLayout previewText="Your scheduled contractor accounting report is ready">
			<StandardEmailHeader
				documentLabel="Report ready"
				documentMeta="Contractor accounting"
			/>
			<StandardEmailHero
				eyebrow="Scheduled report"
				title="Your Contractor Report Is Ready"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					Your scheduled contractor accounting report is ready.
				</Text>
			</StandardEmailHero>
			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[24px] rounded-[6px] border border-solid px-[20px] py-[18px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Text
					className="gnd-standard-muted m-0 text-[11px] font-semibold uppercase tracking-[0.9px]"
					style={{ color: standardEmailColors.muted }}
				>
					Report period
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[5px] text-[15px] font-semibold leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					{kind.replaceAll("_", " ")} · {from} through {to}
				</Text>
			</Section>
			<Section className="gnd-standard-content px-[36px] pb-[30px] pt-[20px]">
				<StandardEmailButton href={url}>
					Download the report
				</StandardEmailButton>
			</Section>
			<StandardEmailSignature
				department="Contractor accounting · GND Millwork"
				senderName="GND Millwork Accounting Team"
			/>
		</StandardEmailLayout>
	);
}

ContractorAccountingReportReadyEmail.PreviewProps = {
	kind: "PAYABLES_SUMMARY",
	from: "2026-09-01",
	to: "2026-09-24",
	url: "https://gndprodesk.com/contractors/accounting/reports/preview",
} satisfies ContractorAccountingReportReadyEmailProps;
