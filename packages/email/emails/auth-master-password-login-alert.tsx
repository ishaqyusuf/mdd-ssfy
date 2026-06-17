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
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

interface Props {
	accountName?: string | null;
	accountEmail: string;
	appSurface: "www" | "dealership";
	loginAt: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	sessionId: string;
	actorLabel: string;
	supportEmail: string;
}

function formatSurface(surface: Props["appSurface"]) {
	return surface === "dealership" ? "GND Dealership" : "GND Workspace";
}

export default function AuthMasterPasswordLoginAlertEmail({
	accountName,
	accountEmail,
	appSurface,
	loginAt,
	ipAddress,
	userAgent,
	sessionId,
	actorLabel,
	supportEmail,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = "Master password login activity";

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
						Master password login activity
					</Heading>

					<Text
						className={themeClasses.text}
						style={{ color: lightStyles.text.color }}
					>
						A {formatSurface(appSurface)} account was accessed using{" "}
						{actorLabel || "Master password"}.
					</Text>

					<Section
						className="my-[28px] rounded-[12px] p-[18px]"
						style={{
							backgroundColor: "#f8fafc",
							borderColor: "#e2e8f0",
							borderStyle: "solid",
							borderWidth: 1,
						}}
					>
						<Text
							className="m-0 text-[14px]"
							style={{ color: lightStyles.text.color }}
						>
							<strong>Account:</strong> {accountName || "Unnamed account"}
						</Text>
						<Text
							className="m-0 mt-[8px] text-[14px]"
							style={{ color: lightStyles.text.color }}
						>
							<strong>Email:</strong> {accountEmail}
						</Text>
						<Text
							className="m-0 mt-[8px] text-[14px]"
							style={{ color: lightStyles.text.color }}
						>
							<strong>Surface:</strong> {formatSurface(appSurface)}
						</Text>
						<Text
							className="m-0 mt-[8px] text-[14px]"
							style={{ color: lightStyles.text.color }}
						>
							<strong>When:</strong> {loginAt}
						</Text>
						<Text
							className="m-0 mt-[8px] text-[14px]"
							style={{ color: lightStyles.text.color }}
						>
							<strong>IP address:</strong> {ipAddress || "Unavailable"}
						</Text>
						<Text
							className="m-0 mt-[8px] text-[14px]"
							style={{ color: lightStyles.text.color }}
						>
							<strong>Session ID:</strong> {sessionId}
						</Text>
						<Text
							className="m-0 mt-[8px] text-[12px] leading-[18px]"
							style={{ color: "#64748b" }}
						>
							{userAgent || "User agent unavailable"}
						</Text>
					</Section>

					<Text
						className="text-[12px] leading-tight text-gray-500"
						style={{ color: lightStyles.text.color }}
					>
						This message is for security monitoring recipients. If this access
						was not expected, contact {supportEmail}.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
