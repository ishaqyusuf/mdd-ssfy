import {
  Body,
  Button,
  Container,
  Heading,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Footer } from "components/footer";
import { Logo } from "components/logo";
import {
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "components/theme";

interface Props {
  name: string;
  resetLink: string;
}
export default function StorefrontPasswordResetRequest({
  name = "Ishaq Yusuf",
  resetLink = "https://example.com",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Reset your GND Millwork password`;

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
            Reset Your Password
          </Heading>
          <Text
            className={`font-medium ${themeClasses.text}`}
            style={{ color: lightStyles.text.color }}
          >
            Hi {name},
          </Text>
          <Text
            className={themeClasses.text}
            style={{ color: lightStyles.text.color }}
          >
            We received a request to reset your password for your GND Millwork
            account. Click the button below to set a new password.
          </Text>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={resetLink}>Reset Password</Button>
          </Section>

          <Text
            className="text-[12px] leading-tight text-gray-500"
            style={{ color: lightStyles.text.color }}
          >
            This link will expire in 1 hour. If you didn’t request a password
            reset, please ignore this email or contact our support team.
          </Text>
          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
