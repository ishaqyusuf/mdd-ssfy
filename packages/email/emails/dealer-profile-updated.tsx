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
	previousProfileName?: string | null;
	newProfileName: string;
	effectiveAt: string;
	dealershipUrl?: string | null;
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

export default function DealerProfileUpdatedEmail({
	dealerName,
	previousProfileName,
	newProfileName,
	effectiveAt,
	dealershipUrl,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const assigned = !previousProfileName;
	const previewText = assigned
		? "Your GND dealership profile has been assigned"
		: "Your GND dealership profile has been updated";

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
						{assigned
							? "Dealership Profile Assigned"
							: "Dealership Profile Updated"}
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
						Your GND dealership profile has been{" "}
						{assigned ? "assigned" : "updated"} to {newProfileName}. This
						profile applies to new quotes and account pricing from{" "}
						{formatDate(effectiveAt)}.
					</Text>
					<Text
						className={themeClasses.text}
						style={{ color: lightStyles.text.color }}
					>
						Existing saved quotes keep their saved pricing unless you explicitly
						refresh pricing on that quote.
					</Text>

					{dealershipUrl ? (
						<Section className="text-center mt-[30px] mb-[40px]">
							<Button href={dealershipUrl}>View Dealer Account</Button>
						</Section>
					) : null}
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
