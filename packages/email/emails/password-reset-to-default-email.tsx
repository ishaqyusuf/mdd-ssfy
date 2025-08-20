import {
  Body,
  Container,
  Heading,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
  Button,
} from "components/theme";
import { Logo } from "components/logo";

interface Props {
  customerName: string;
  loginLink: string;
}

const PasswordResetPasswordToDefaultEmail = ({
  customerName = "Ishaq Yusuf",
  loginLink = "https://example.com",
}: Props) => {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Your GND Millwork password has been reset`;

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
            Your Password Has Been Reset
          </Heading>
          <Text
            className={`font-medium ${themeClasses.text}`}
            style={{ color: lightStyles.text.color }}
          >
            Hi {customerName},
          </Text>
          <Text
            className={themeClasses.text}
            style={{ color: lightStyles.text.color }}
          >
            Your password has been reset to the default by an administrator.
            Please use the default password below to log in and change it
            immediately for your security.
          </Text>

          <Section className="text-center my-[30px]">
            <Text
              className={`text-[16px] font-mono tracking-wide bg-gray-100 py-2 px-4 inline-block rounded ${themeClasses.text}`}
              style={{
                backgroundColor: "#f3f4f6",
                color: lightStyles.text.color,
              }}
            >
              Millwork
            </Text>
          </Section>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={loginLink}>Log In to Your Account</Button>
          </Section>

          <Text
            className="text-[12px] leading-tight text-gray-500"
            style={{ color: lightStyles.text.color }}
          >
            If you didn’t request this reset, please contact our support team
            immediately.
          </Text>
        </Container>
      </Body>
    </EmailThemeProvider>
  );
};
export default PasswordResetPasswordToDefaultEmail;
