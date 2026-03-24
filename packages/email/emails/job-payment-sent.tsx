import {
	Body,
	Container,
	Heading,
	Preview,
	Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

type JobPaymentSentEmailProps = {
	recipientName?: string;
	paymentId?: number;
	jobCount?: number;
	amount?: number;
	paymentMethod?: string;
};

function formatCurrency(value?: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function JobPaymentSentEmail(props: JobPaymentSentEmailProps) {
	const {
		recipientName = "Contractor",
		paymentId = 0,
		jobCount = 0,
		amount = 0,
		paymentMethod = "Check",
	} = props;
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = `Payment #${paymentId} sent`;

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
						Payment Sent
					</Heading>
					<Text>Hi {recipientName},</Text>
					<Text>
						Your payment batch <strong>#{paymentId}</strong> has been sent for{" "}
						<strong>
							{jobCount} job{jobCount === 1 ? "" : "s"}
						</strong>
						.
					</Text>
					<Text>
						Amount: <strong>{formatCurrency(amount)}</strong>
					</Text>
					<Text>
						Payment method: <strong>{paymentMethod}</strong>
					</Text>
					<br />
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

export default JobPaymentSentEmail;
