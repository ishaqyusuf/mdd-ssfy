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

export type ContractorAccountingAlertEmailProps = {
	actionUrl: string;
	message: string;
	title: string;
};

export default function ContractorAccountingAlertEmail({
	actionUrl,
	message,
	title,
}: ContractorAccountingAlertEmailProps) {
	return (
		<StandardEmailLayout previewText={title}>
			<StandardEmailHeader
				documentLabel="Contractor alert"
				documentMeta="Accounting"
			/>
			<StandardEmailHero eyebrow="Attention needed" title={title}>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					{message}
				</Text>
			</StandardEmailHero>
			<Section className="gnd-standard-content px-[36px] pb-[30px] pt-[24px]">
				<StandardEmailButton href={actionUrl}>
					Open contractor accounting alerts
				</StandardEmailButton>
			</Section>
			<StandardEmailSignature
				department="Contractor accounting · GND Millwork"
				senderName="GND Millwork Accounting Team"
			/>
		</StandardEmailLayout>
	);
}

ContractorAccountingAlertEmail.PreviewProps = {
	title: "Contractor accounting alert",
	message:
		"A scheduled contractor balance needs review before the next payment run.",
	actionUrl: "https://gndprodesk.com/contractors/accounting?manageAlerts=true",
} satisfies ContractorAccountingAlertEmailProps;
