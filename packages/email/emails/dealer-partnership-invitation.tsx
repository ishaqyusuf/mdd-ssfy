/** @jsxImportSource react */
import {
	Body,
	Container,
	Heading,
	Img,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

type Props = {
	recipientName: string;
	headline: string;
	benefitText: string;
	ctaLabel: string;
	invitationUrl: string;
	imageUrl?: string | null;
	accentColor?: string | null;
};

export default function DealerPartnershipInvitationEmail({
	recipientName,
	headline,
	benefitText,
	ctaLabel,
	invitationUrl,
	imageUrl,
	accentColor = "#0f766e",
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider preview={<Preview>{headline}</Preview>}>
			<Body className={themeClasses.body} style={lightStyles.body}>
				<Container
					className={`my-[40px] mx-auto max-w-[600px] overflow-hidden ${themeClasses.container}`}
					style={{
						border: `1px solid ${lightStyles.container.borderColor}`,
						borderRadius: 12,
					}}
				>
					<Section className="p-[24px] pb-0">
						<Logo />
					</Section>
					{imageUrl ? (
						<Img
							alt="Dealership partnership"
							className="mt-[24px] h-auto w-full"
							src={imageUrl}
						/>
					) : null}
					<Section
						className="mx-[24px] my-[24px] p-[24px]"
						style={{
							backgroundColor: "#f8fafc",
							borderLeft: `4px solid ${accentColor || "#0f766e"}`,
							borderRadius: 8,
						}}
					>
						<Text className={themeClasses.text} style={lightStyles.text}>
							Hi {recipientName},
						</Text>
						<Heading
							className={`my-[16px] text-[26px] ${themeClasses.heading}`}
							style={{ color: lightStyles.text.color }}
						>
							{headline}
						</Heading>
						<Text className={themeClasses.text} style={lightStyles.text}>
							{benefitText}
						</Text>
						<Section className="mt-[28px]">
							<Button href={invitationUrl}>{ctaLabel}</Button>
						</Section>
					</Section>
					<Text className="mx-[24px] mb-[24px] text-[12px] leading-[18px] text-gray-500">
						This secure invitation expires in 30 days. Open it to review the
						customer information we have on file and request partnership.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
