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

type Props = {
	preview: string;
	recipientName: string;
	headline: string;
	orderNo: string;
	message: string;
};

export default function SpecialOrderStatusNotificationEmail({
	preview,
	recipientName,
	headline,
	orderNo,
	message,
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	return (
		<EmailThemeProvider preview={<Preview>{preview}</Preview>}>
			<Body
				className={`my-auto mx-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`my-[28px] mx-auto p-[20px] max-w-[640px] ${themeClasses.container}`}
				>
					<Logo />
					<Section className="mt-[20px] mb-[18px] rounded-[12px] border border-solid border-[#f59e0b] bg-[#fffbeb] p-[20px]">
						<Text className="m-0 text-[12px] uppercase tracking-[1.4px] text-[#92400e]">
							Special Order · #{orderNo}
						</Text>
						<Heading className="m-0 mt-[8px] text-[26px] leading-[32px] font-semibold text-[#451a03]">
							{headline}
						</Heading>
					</Section>
					<Text
						className={`m-0 mb-[12px] text-[15px] leading-[24px] ${themeClasses.text}`}
					>
						Hi {recipientName},
					</Text>
					<Text
						className={`m-0 mb-[20px] text-[15px] leading-[24px] ${themeClasses.text}`}
					>
						{message}
					</Text>
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
