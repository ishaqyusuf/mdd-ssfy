/** @jsxImportSource react */
import { Body, Container, Heading, Preview, Text } from "@react-email/components";
import { Logo } from "../components/logo";
import {
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

interface Props {
	dealerName: string;
	quoteNo: string;
	customerName?: string | null;
	reason?: string | null;
}

export default function DealerSalesRequestRejectedEmail({
	dealerName,
	quoteNo,
	customerName,
	reason,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = `Quote ${quoteNo} needs review`;

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
						Order Request Not Approved
					</Heading>
					<Text className={`font-medium ${themeClasses.text}`}>
						Hi {dealerName},
					</Text>
					<Text className={themeClasses.text}>
						Your request to make quote {quoteNo}
						{customerName ? ` for ${customerName}` : ""} an order was not
						approved yet.
					</Text>
					{reason ? <Text className={themeClasses.text}>{reason}</Text> : null}
					<Text className="text-[12px] leading-tight text-gray-500">
						Please contact your sales rep if you need help updating the quote.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
