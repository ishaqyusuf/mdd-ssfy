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
	loginLink: string;
	expiresInMinutes?: number | null;
}

export default function DealerMagicLoginLinkEmail({
	dealerName,
	loginLink,
	expiresInMinutes = 10,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = "Your GND dealer portal login link";

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
						Log In to Your Dealer Portal
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
						Use the secure button below to log in to your GND dealer portal.
						This link expires shortly and can only be used once.
					</Text>

					<Section className="text-center mt-[30px] mb-[40px]">
						<Button href={loginLink}>Log In to Dealer Portal</Button>
					</Section>

					<Text
						className="text-[12px] leading-tight text-gray-500"
						style={{ color: lightStyles.text.color }}
					>
						This link expires in {expiresInMinutes || 10} minutes. If you did
						not request this email, you can safely ignore it.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
