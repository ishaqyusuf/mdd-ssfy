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
	quoteNo: string;
	orderNo?: string | null;
	customerName?: string | null;
	total?: number | null;
	orderUrl?: string | null;
	paymentUrl?: string | null;
}

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export default function DealerSalesRequestApprovedEmail({
	dealerName,
	quoteNo,
	orderNo,
	customerName,
	total,
	orderUrl,
	paymentUrl,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = `Quote ${quoteNo} was approved`;

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
						Quote Approved
					</Heading>
					<Text className={`font-medium ${themeClasses.text}`}>
						Hi {dealerName},
					</Text>
					<Text className={themeClasses.text}>
						Your request to make quote {quoteNo} an order has been approved.
					</Text>
					<Text className={themeClasses.text}>
						{orderNo ? `Order: ${orderNo}` : null}
						{customerName ? ` - Customer: ${customerName}` : null}
						{typeof total === "number" ? ` - Total: ${currency(total)}` : null}
					</Text>
					{paymentUrl ? (
						<Section className="text-center mt-[30px] mb-[16px]">
							<Button href={paymentUrl}>Make Payment</Button>
						</Section>
					) : null}
					{orderUrl ? (
						<Section className="text-center mt-[30px] mb-[40px]">
							<Button href={orderUrl}>View Order</Button>
						</Section>
					) : null}
					<Text className="text-[12px] leading-tight text-gray-500">
						You can review the order from your dealer portal.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
