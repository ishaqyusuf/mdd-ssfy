/** @jsxImportSource react */
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
	refundId: string;
	totalAmount: number;
	reason?: string | null;
	sales: { orderNo: string }[];
}

const currency = (value: number) =>
	Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		value || 0,
	);

export function SalesCustomerRefundCompletedEmail(props: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const orderNos = props.sales.map((sale) => sale.orderNo).join(", ");
	return (
		<EmailThemeProvider
			preview={
				<Preview>{`Your ${currency(props.totalAmount)} refund is complete`}</Preview>
			}
		>
			<Body
				className={`my-auto mx-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`my-[28px] mx-auto max-w-[640px] p-[20px] ${themeClasses.container}`}
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
							backgroundColor: "#f0fdf4",
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: "#bbf7d0",
							borderRadius: 10,
						}}
					>
						<Text style={{ color: "#15803d", margin: 0, fontSize: 12 }}>
							REFUND CONFIRMATION
						</Text>
						<Heading
							className={themeClasses.heading}
							style={{ color: lightStyles.text.color, fontSize: 28 }}
						>
							Your refund is complete
						</Heading>
						<Text
							className={themeClasses.text}
							style={{ color: lightStyles.text.color }}
						>
							Hi {props.customerName}, Square completed your refund of{" "}
							<strong>{currency(props.totalAmount)}</strong> for order
							{props.sales.length > 1 ? "s" : ""} {orderNos}.
						</Text>
					</Section>
					<Text
						className={themeClasses.text}
						style={{ color: lightStyles.text.color }}
					>
						Your bank may take 7–10 business days to display the credit. The
						timing is controlled by your bank after Square completes the refund.
					</Text>
					{props.reason ? (
						<Text
							className={themeClasses.mutedText}
							style={{ color: "#64748b" }}
						>
							Reason: {props.reason}
						</Text>
					) : null}
					<Text className={themeClasses.mutedText} style={{ color: "#64748b" }}>
						Refund reference: {props.refundId}
					</Text>
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
