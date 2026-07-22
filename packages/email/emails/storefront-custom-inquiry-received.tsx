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
	name?: string;
	reference?: string;
	projectSummary?: string;
};

export default function StorefrontCustomInquiryReceived({
	name = "there",
	reference = "CMW-REQUEST",
	projectSummary = "Custom millwork project",
}: Props) {
	const themeClasses = getEmailThemeClasses();
	const styles = getEmailInlineStyles("light");
	return (
		<EmailThemeProvider
			preview={<Preview>We received your custom millwork request</Preview>}
		>
			<Body
				className={`my-auto mx-auto font-sans ${themeClasses.body}`}
				style={styles.body}
			>
				<Container
					className={`my-[40px] mx-auto max-w-[600px] p-[24px] ${themeClasses.container}`}
					style={{
						borderStyle: "solid",
						borderWidth: 1,
						borderColor: styles.container.borderColor,
					}}
				>
					<Logo />
					<Heading
						className={`mt-[28px] text-[24px] font-normal ${themeClasses.heading}`}
						style={{ color: styles.text.color }}
					>
						Your project request is with our team.
					</Heading>
					<Text
						className={themeClasses.text}
						style={{ color: styles.text.color }}
					>
						Hi {name},
					</Text>
					<Text
						className={themeClasses.text}
						style={{ color: styles.text.color }}
					>
						We received your custom millwork brief. An office team member will
						review the scope and follow up if we need measurements, material
						details, or other information before preparing a quote.
					</Text>
					<Section
						style={{
							backgroundColor: "#f4f4f5",
							borderRadius: 8,
							padding: "4px 16px",
							margin: "24px 0",
						}}
					>
						<Text
							className={themeClasses.text}
							style={{ color: styles.text.color }}
						>
							<strong>Reference:</strong> {reference}
						</Text>
						<Text
							className={themeClasses.text}
							style={{ color: styles.text.color }}
						>
							<strong>Project:</strong> {projectSummary}
						</Text>
					</Section>
					<Text
						className={themeClasses.text}
						style={{ color: styles.text.color }}
					>
						This confirmation is not a quote or order. Keep the reference above
						if you contact us about the request.
					</Text>
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
