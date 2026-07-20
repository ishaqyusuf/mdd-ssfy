/** @jsxImportSource react */
import {
	Body,
	Container,
	Heading,
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
	preview: string;
	heading: string;
	recipientName?: string | null;
	message: string;
	actionLabel?: string | null;
	actionUrl?: string | null;
	note?: string | null;
};

export default function DealerProgramStatusEmail({
	preview,
	heading,
	recipientName,
	message,
	actionLabel,
	actionUrl,
	note,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider preview={<Preview>{preview}</Preview>}>
			<Body className={themeClasses.body} style={lightStyles.body}>
				<Container
					className={`my-[40px] mx-auto p-[24px] max-w-[600px] ${themeClasses.container}`}
					style={{
						border: `1px solid ${lightStyles.container.borderColor}`,
						borderRadius: 12,
					}}
				>
					<Logo />
					<Heading
						className={`mt-[28px] text-[24px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						{heading}
					</Heading>
					<Text className={themeClasses.text} style={lightStyles.text}>
						Hi {recipientName || "there"},
					</Text>
					<Text className={themeClasses.text} style={lightStyles.text}>
						{message}
					</Text>
					{note ? (
						<Section
							className="my-[20px] p-[14px]"
							style={{
								backgroundColor: "#f8fafc",
								borderRadius: 8,
							}}
						>
							<Text className="m-0 text-[14px]" style={lightStyles.text}>
								{note}
							</Text>
						</Section>
					) : null}
					{actionLabel && actionUrl ? (
						<Section className="mt-[28px]">
							<Button href={actionUrl}>{actionLabel}</Button>
						</Section>
					) : null}
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
