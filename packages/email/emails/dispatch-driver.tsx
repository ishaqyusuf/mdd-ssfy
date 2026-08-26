/** @jsxImportSource react */
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

type DispatchNotificationEmailProps = {
	orderNo?: string;
	dispatchId?: number;
	deliveryMode?: "pickup" | "delivery" | "ship";
	dueDate?: Date | string;
	recipientName?: string;
	event?: "assigned" | "created";
};

function formatDueDate(value?: Date | string) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

export function DispatchNotificationEmail({
	orderNo = "-",
	dispatchId = 0,
	deliveryMode = "delivery",
	dueDate,
	recipientName = "Team member",
	event = "assigned",
}: DispatchNotificationEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const isAssigned = event === "assigned";
	const title = isAssigned ? "New Dispatch Assigned" : "New Dispatch Created";
	const formattedDueDate = formatDueDate(dueDate);

	return (
		<EmailThemeProvider
			preview={<Preview>{`${title}: Order ${orderNo}`}</Preview>}
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
						{title}
					</Heading>
					<Text>Hi {recipientName},</Text>
					<Text>
						Dispatch <strong>#{dispatchId}</strong> for order{" "}
						<strong>{orderNo}</strong> has been{" "}
						{isAssigned ? "assigned to you" : "created"}.
					</Text>
					<Text>Delivery mode: {deliveryMode}.</Text>
					{formattedDueDate ? <Text>Due date: {formattedDueDate}.</Text> : null}
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

export function DispatchDriver(props: DispatchNotificationEmailProps) {
	return <DispatchNotificationEmail {...props} event="assigned" />;
}

export function DispatchCreatedEmail(props: DispatchNotificationEmailProps) {
	return <DispatchNotificationEmail {...props} event="created" />;
}

export default DispatchDriver;
