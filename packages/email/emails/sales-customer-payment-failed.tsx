import {
	Body,
	Container,
	Heading,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

interface Props {
	customerName: string;
	paymentMethod?: string | null;
	totalAmount?: number | null;
	reason?: string | null;
	sales: {
		orderNo: string;
		remainingDue?: number | null;
	}[];
}

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

export function SalesCustomerPaymentFailedEmail(props: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = `Payment attempt incomplete for order${props.sales.length > 1 ? "s" : ""} ${props.sales.map((sale) => sale.orderNo).join(", ")}`;

	return (
		<EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
			<Body
				className={`my-auto mx-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`my-[28px] mx-auto p-[20px] max-w-[640px] ${themeClasses.container}`}
					style={{
						borderStyle: "solid",
						borderWidth: 1,
						borderColor: lightStyles.container.borderColor,
						borderRadius: 12,
						backgroundColor: lightStyles.body.backgroundColor,
					}}
				>
					<Logo />

					<Section
						className="mt-[20px] mb-[20px] p-[20px]"
						style={{
							backgroundColor: "#fff7ed",
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: "#fed7aa",
							borderRadius: 10,
						}}
					>
						<Text
							className={`m-0 text-[12px] uppercase tracking-[1.6px] ${themeClasses.mutedText}`}
							style={{ color: "#c2410c" }}
						>
							Payment Update
						</Text>
						<Heading
							className={`text-[28px] leading-[34px] font-semibold p-0 mt-[8px] mb-[10px] ${themeClasses.heading}`}
							style={{ color: lightStyles.text.color }}
						>
							Payment was not completed
						</Heading>
						<Text
							className={`m-0 text-[15px] leading-[24px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							Hi {props.customerName}, we could not complete your payment
							attempt for the order{props.sales.length > 1 ? "s" : ""} below.
						</Text>
					</Section>

					{props.totalAmount != null || props.paymentMethod ? (
						<Text
							className={`m-0 mb-[16px] text-[14px] leading-[22px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							{props.totalAmount != null
								? `Attempted amount: ${formatCurrency(props.totalAmount)}. `
								: ""}
							{props.paymentMethod ? `Payment method: ${props.paymentMethod}.` : ""}
						</Text>
					) : null}

					{props.reason ? (
						<Text
							className={`m-0 mb-[16px] text-[14px] leading-[22px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							Reason: {props.reason}
						</Text>
					) : null}

					{props.sales.map((sale) => (
						<Section
							key={sale.orderNo}
							className="mb-[12px] p-[12px]"
							style={{
								borderStyle: "solid",
								borderWidth: 1,
								borderColor: lightStyles.container.borderColor,
								borderRadius: 10,
								backgroundColor: "#fcfcfd",
							}}
						>
							<Text className={`m-0 font-semibold ${themeClasses.text}`}>
								{sale.orderNo}
							</Text>
							<Text
								className={`m-0 mt-[4px] text-[14px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								Outstanding balance:{" "}
								{formatCurrency(Number(sale.remainingDue || 0))}
							</Text>
						</Section>
					))}

					<Text
						className={`mt-[20px] text-[14px] leading-[22px] ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						Please retry your payment or contact our team if you need help
						completing it.
					</Text>

					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
