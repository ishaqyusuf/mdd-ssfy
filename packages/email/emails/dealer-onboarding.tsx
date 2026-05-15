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

interface Props {
	dealerName: string;
	onboardingLink: string;
	expiresAt?: string | null;
}

export default function DealerOnboardingEmail({
	dealerName,
	onboardingLink,
	expiresAt,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = "Set up your GND dealer account";

	return (
		<EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
			<Body
				className={`my-auto mx-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`my-[40px] mx-auto p-[20px] max-w-[600px] ${themeClasses.container}`}
					style={{
						borderStyle: "solid",
						borderWidth: 1,
						borderColor: lightStyles.container.borderColor,
					}}
				>
					<Logo />
					<Heading
						className={`text-[21px] font-normal text-center p-0 my-[30px] mx-0 ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						Set Up Your Dealer Account
					</Heading>
					<Text
						className={`font-medium ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						Hi {dealerName},
					</Text>
					<Text
						className={themeClasses.text}
						style={{ color: lightStyles.text.color }}
					>
						Your GND dealer account is ready. Use the secure button below to
						create your password and finish setup.
					</Text>

					<Section className="text-center mt-[30px] mb-[40px]">
						<Button href={onboardingLink}>Set Up Dealer Account</Button>
					</Section>

					{expiresAt ? (
						<Text
							className="text-[12px] leading-tight text-gray-500"
							style={{ color: lightStyles.text.color }}
						>
							This setup link expires on{" "}
							{new Intl.DateTimeFormat("en", {
								month: "short",
								day: "numeric",
								year: "numeric",
							}).format(new Date(expiresAt))}
							.
						</Text>
					) : null}
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
