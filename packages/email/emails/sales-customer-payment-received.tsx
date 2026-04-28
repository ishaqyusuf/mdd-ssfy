import {
	Body,
	Column,
	Container,
	Heading,
	Preview,
	Row,
	Section,
	Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

interface Props {
	customerName: string;
	paymentMethod: string;
	totalAmount: number;
	note?: string | null;
	invoiceDownloadUrl?: string | null;
	sales: {
		orderNo: string;
		amountApplied?: number | null;
		remainingDue?: number | null;
	}[];
}

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

export function SalesCustomerPaymentReceivedEmail(props: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const previewText = `Payment received for order${props.sales.length > 1 ? "s" : ""} ${props.sales.map((sale) => sale.orderNo).join(", ")}`;

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
							backgroundColor: "#f0fdf4",
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: "#bbf7d0",
							borderRadius: 10,
						}}
					>
						<Text
							className={`m-0 text-[12px] uppercase tracking-[1.6px] ${themeClasses.mutedText}`}
							style={{ color: "#15803d" }}
						>
							Payment Receipt
						</Text>
						<Heading
							className={`text-[28px] leading-[34px] font-semibold p-0 mt-[8px] mb-[10px] ${themeClasses.heading}`}
							style={{ color: lightStyles.text.color }}
						>
							Payment received
						</Heading>
						<Text
							className={`m-0 text-[15px] leading-[24px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							Hi {props.customerName}, we received your payment of{" "}
							<strong>{formatCurrency(props.totalAmount)}</strong> via{" "}
							{props.paymentMethod}.
						</Text>
					</Section>

					{props.note ? (
						<Section
							className="mb-[16px] p-[12px]"
							style={{
								borderStyle: "solid",
								borderWidth: 1,
								borderColor: lightStyles.container.borderColor,
								borderRadius: 10,
								backgroundColor: "#f8fafc",
							}}
						>
							<Text
								className={`m-0 mb-[4px] text-[12px] uppercase tracking-[0.8px] ${themeClasses.mutedText}`}
								style={{ color: "#64748b" }}
							>
								Note
							</Text>
							<Text
								className={`m-0 text-[14px] leading-[22px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								{props.note}
							</Text>
						</Section>
					) : null}

					<Section
						className="mb-[18px] p-[14px]"
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
							borderRadius: 10,
							backgroundColor: "#fcfcfd",
						}}
					>
						<Row>
							<Column style={{ width: "50%" }}>
								<Text
									className={`m-0 text-[12px] ${themeClasses.mutedText}`}
									style={{ color: "#64748b" }}
								>
									Orders
								</Text>
								<Text
									className={`m-0 mt-[3px] text-[16px] font-semibold ${themeClasses.text}`}
								>
									{props.sales.length}
								</Text>
							</Column>
							<Column style={{ width: "50%" }}>
								<Text
									className={`m-0 text-[12px] ${themeClasses.mutedText}`}
									style={{ color: "#64748b" }}
								>
									Amount received
								</Text>
								<Text
									className={`m-0 mt-[3px] text-[16px] font-semibold ${themeClasses.text}`}
								>
									{formatCurrency(props.totalAmount)}
								</Text>
							</Column>
						</Row>
					</Section>

					<table style={{ width: "100%", minWidth: "100%" }}>
						<thead style={{ width: "100%", backgroundColor: "#f8fafc" }}>
							<tr>
								<th align="left">
									<Text
										className={`text-[12px] uppercase tracking-[0.8px] font-semibold m-0 ${themeClasses.mutedText}`}
										style={{ color: "#64748b" }}
									>
										Order
									</Text>
								</th>
								<th align="left">
									<Text
										className={`text-[12px] uppercase tracking-[0.8px] font-semibold m-0 ${themeClasses.mutedText}`}
										style={{ color: "#64748b" }}
									>
										Applied
									</Text>
								</th>
								<th align="right">
									<Text
										className={`text-[12px] uppercase tracking-[0.8px] font-semibold m-0 ${themeClasses.mutedText}`}
										style={{ color: "#64748b" }}
									>
										Balance
									</Text>
								</th>
							</tr>
						</thead>
						<tbody>
							{props.sales.map((sale) => (
								<tr key={sale.orderNo}>
									<td style={{ padding: "12px 0" }}>
										<Text className={`m-0 ${themeClasses.text}`}>{sale.orderNo}</Text>
									</td>
									<td style={{ padding: "12px 0" }}>
										<Text className={`m-0 ${themeClasses.text}`}>
											{sale.amountApplied == null
												? "Recorded"
												: formatCurrency(sale.amountApplied)}
										</Text>
									</td>
									<td style={{ padding: "12px 0" }} align="right">
										<Text className={`m-0 ${themeClasses.text}`}>
											{formatCurrency(Number(sale.remainingDue || 0))}
										</Text>
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{props.invoiceDownloadUrl ? (
						<Section className="mt-[24px] text-center">
							<Button href={props.invoiceDownloadUrl}>
								{props.sales.length > 1 ? "Download invoices" : "Download invoice"}
							</Button>
						</Section>
					) : null}

					<Text
						className={`mt-[20px] text-[14px] leading-[22px] ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						If you have any questions about this payment, reply to this email and
						our team will help.
					</Text>

					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
