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

type Props = {
	customerName?: string | null;
	orderNo: string;
	approvalUrl: string;
	expiresAt: string;
};

export default function SpecialOrderApprovalRequestEmail({
	customerName,
	orderNo,
	approvalUrl,
	expiresAt,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	return (
		<EmailThemeProvider
			preview={<Preview>{`Review Special Order ${orderNo}`}</Preview>}
		>
			<Body
				className={`my-auto mx-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`my-[40px] mx-auto max-w-[600px] p-[20px] ${themeClasses.container}`}
					style={{
						borderStyle: "solid",
						borderWidth: 1,
						borderColor: lightStyles.container.borderColor,
					}}
				>
					<Logo />
					<Heading className={`my-[30px] text-center text-[21px] font-normal ${themeClasses.heading}`}>
						Special Order review
					</Heading>
					<Text className={themeClasses.text}>
						Hi {customerName || "Customer"},
					</Text>
					<Text className={themeClasses.text}>
						Please review the complete details and Special Order policy for order {orderNo}.
					</Text>
					<Section className="mb-[36px] mt-[28px] text-center">
						<Button href={approvalUrl}>Review and Sign</Button>
					</Section>
					<Text className="text-[12px] leading-tight text-gray-500">
						This secure link expires {new Date(expiresAt).toLocaleString()}. It can no longer be used after approval or decline.
					</Text>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
