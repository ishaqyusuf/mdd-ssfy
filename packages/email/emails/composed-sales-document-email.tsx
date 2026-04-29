import {
	Body,
	Container,
	Heading,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { format } from "date-fns";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

type Props = {
	subject: string;
	customerName: string;
	message?: string;
	paymentLink?: string;
	attachSalesPdf?: boolean;
	sales: {
		orderId: string;
		po?: string;
		date: Date;
		total: number;
		due: number;
	}[];
};

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

export default function ComposedSalesDocumentEmail({
	subject,
	customerName,
	message,
	paymentLink,
	attachSalesPdf = false,
	sales,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const totalDue = sales.reduce((acc, sale) => acc + (sale.due || 0), 0);
	const messageLines = (message || "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	return (
		<EmailThemeProvider preview={<Preview>{subject}</Preview>}>
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
							backgroundColor: "#f8fafc",
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
							borderRadius: 10,
						}}
					>
						<Text
							className={`m-0 text-[12px] uppercase tracking-[1.6px] ${themeClasses.mutedText}`}
							style={{ color: "#64748b" }}
						>
							GND Millwork
						</Text>
						<Heading
							className={`text-[28px] leading-[34px] font-semibold p-0 mt-[8px] mb-[10px] ${themeClasses.heading}`}
							style={{ color: lightStyles.text.color }}
						>
							{subject}
						</Heading>
						<Text
							className={`m-0 text-[15px] leading-[24px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							Hi {customerName},
						</Text>
					</Section>

					{messageLines.length ? (
						<Section className="mb-[18px]">
							{messageLines.map((line, index) => (
								<Text
									key={`${line}-${index}`}
									className={`m-0 mb-[12px] text-[15px] leading-[24px] ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									{line}
								</Text>
							))}
						</Section>
					) : (
						<Text
							className={`m-0 mb-[18px] text-[15px] leading-[24px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							Please review the details below. Reply directly to this email if
							you have any questions.
						</Text>
					)}

					<Section
						className="mb-[18px] p-[16px]"
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
							borderRadius: 10,
							backgroundColor: "#fcfcfd",
						}}
					>
						<Text
							className={`m-0 mb-[10px] text-[12px] uppercase tracking-[0.8px] ${themeClasses.mutedText}`}
							style={{ color: "#64748b" }}
						>
							Sales Summary
						</Text>
						{sales.map((sale) => (
							<Section key={sale.orderId} className="mb-[12px] last:mb-0">
								<Text
									className={`m-0 text-[15px] font-semibold ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									#{sale.orderId}
								</Text>
								<Text
									className={`m-0 mt-[4px] text-[14px] ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									Date: {format(sale.date, "MMM d, yyyy")}
								</Text>
								{sale.po ? (
									<Text
										className={`m-0 mt-[2px] text-[14px] ${themeClasses.text}`}
										style={{ color: lightStyles.text.color }}
									>
										P.O.: {sale.po}
									</Text>
								) : null}
								<Text
									className={`m-0 mt-[2px] text-[14px] ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									Total: {formatCurrency(sale.total)}
								</Text>
								<Text
									className={`m-0 mt-[2px] text-[14px] ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									Balance Due: {formatCurrency(sale.due)}
								</Text>
							</Section>
						))}
					</Section>

					{attachSalesPdf ? (
						<Section
							className="mb-[18px] p-[14px]"
							style={{
								borderStyle: "solid",
								borderWidth: 1,
								borderColor: lightStyles.container.borderColor,
								borderRadius: 10,
								backgroundColor: "#f8fafc",
							}}
						>
							<Text
								className={`m-0 text-[14px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								The sales PDF is attached to this email for your reference.
							</Text>
						</Section>
					) : null}

					{paymentLink && totalDue > 0 ? (
						<Section className="mb-[22px]">
							<Text
								className={`m-0 mb-[12px] text-[14px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								You can use the secure payment button below to pay the current
								outstanding balance.
							</Text>
							<Button href={paymentLink}>Make Payment</Button>
						</Section>
					) : null}

					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
