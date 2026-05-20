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
	resetLink: string;
	expiresInMinutes?: number | null;
}

export default function DealerPasswordResetEmail({
	dealerName,
	resetLink,
	expiresInMinutes = 60,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = "Reset your GND dealer portal password";

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
						Reset Your Dealer Portal Password
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
						We received a request to reset your GND dealer portal password.
						Use the secure button below to choose a new password.
					</Text>

					<Section className="text-center mt-[30px] mb-[40px]">
						<Button href={resetLink}>Reset Password</Button>
					</Section>

					<Text
						className="text-[12px] leading-tight text-gray-500"
						style={{ color: lightStyles.text.color }}
					>
						This link expires in {expiresInMinutes || 60} minutes. If you did
						not request a password reset, you can safely ignore this email.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
