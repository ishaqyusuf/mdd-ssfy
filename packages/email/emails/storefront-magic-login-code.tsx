import {
  Body,
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
  code: string;
}
export default function StorefrontMagicLoginCode({
  name = "Ishaq Yusuf",
  code = "123456",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Your magic login code for GND Millwork`;

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
            Your Magic Login Code
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
            Here is your magic login code to sign in to your GND Millwork
            account.
          </Text>

          <Section className="text-center my-[30px]">
            <Text
              className={`text-[16px] font-mono tracking-wide bg-gray-100 py-2 px-4 inline-block rounded ${themeClasses.text}`}
              style={{
                backgroundColor: "#f3f4f6",
                color: lightStyles.text.color,
              }}
            >
              {code}
            </Text>
          </Section>

          <Text
            className="text-[12px] leading-tight text-gray-500"
            style={{ color: lightStyles.text.color }}
          >
            This code will expire in 10 minutes. If you didn’t request this
            code, please ignore this email or contact our support team if you
            have any concerns.
          </Text>
          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}