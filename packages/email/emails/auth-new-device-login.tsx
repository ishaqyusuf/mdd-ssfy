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
	deviceLabel: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	loginAt: string;
	supportEmail: string;
	securityMessage: string;
}

function formatSurface(surface: Props["appSurface"]) {
	return surface === "dealership" ? "GND Dealership" : "GND Workspace";
}

export default function AuthNewDeviceLoginEmail({
	accountName,
	accountEmail,
	appSurface,
	deviceLabel,
	ipAddress,
	userAgent,
	loginAt,
	supportEmail,
	securityMessage,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = "New device login to your GND account";

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
						New device login
					</Heading>

					<Text
						className={`font-medium ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						Hi {accountName || accountEmail},
					</Text>
					<Text
						className={themeClasses.text}
						style={{ color: lightStyles.text.color }}
					>
						Your {formatSurface(appSurface)} account was just accessed from a
						device we have not seen before.
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
							<strong>Device:</strong> {deviceLabel}
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
							className="m-0 mt-[8px] text-[12px] leading-[18px]"
							style={{ color: "#64748b" }}
						>
							{userAgent || "User agent unavailable"}
						</Text>
					</Section>

					<Text
						className={themeClasses.text}
						style={{ color: lightStyles.text.color }}
					>
						{securityMessage}
					</Text>
					<Text
						className="text-[12px] leading-tight"
						style={{ color: "#64748b" }}
					>
						This security alert was sent to {accountEmail}. Support contact:{" "}
						{supportEmail}.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
