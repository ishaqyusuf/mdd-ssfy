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
	recipientName?: string | null;
	dealerName: string;
	quoteNo: string;
	customerName?: string | null;
	requestedAt: string;
	requestUrl: string;
}

function formatRequestedAt(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: new Intl.DateTimeFormat("en-US", {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(date);
}

export default function DealerSalesRequestEmail({
	recipientName,
	dealerName,
	quoteNo,
	customerName,
	requestedAt,
	requestUrl,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider
			preview={
				<Preview>{`${dealerName} requested approval for ${quoteNo}`}</Preview>
			}
		>
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
						Dealer Order Request
					</Heading>
					<Text className={`font-medium ${themeClasses.text}`}>
						Hi {recipientName || "Sales Team"},
					</Text>
					<Text className={themeClasses.text}>
						{dealerName} requested approval to make quote {quoteNo} an order.
					</Text>
					<Text className={themeClasses.text}>
						{customerName ? `Customer: ${customerName}. ` : ""}
						Requested {formatRequestedAt(requestedAt)}.
					</Text>
					<Section className="text-center mt-[30px] mb-[40px]">
						<Button href={requestUrl}>Review Request</Button>
					</Section>
					<Text className="text-[12px] leading-tight text-gray-500">
						Review the quote, complete any missing details, and approve or
						reject the request from GND Prodesk.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
