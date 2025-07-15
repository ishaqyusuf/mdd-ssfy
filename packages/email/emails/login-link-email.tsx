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
  revokeLink: string;
}

const LoginEmail = ({ customerName, loginLink, revokeLink }: Props) => {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Your GND Millwork login link`;

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
            Log In to GND Millwork
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
            Use the secure button below to log in to your account. This link
            will expire shortly for your security.
          </Text>

          <Section className="text-center mt-[40px] mb-[50px]">
            <Button href={loginLink}>Log In Now</Button>
          </Section>

          <Text
            className="text-[12px] leading-tight text-gray-500"
            style={{ color: lightStyles.text.color }}
          >
            {/* If you didn’t request this email, you can safely ignore it. */}
            If you did not request this login link, you can{" "}
            <a
              href={revokeLink}
              style={{
                color: "#d92d20",
                textDecoration: "underline",
              }}
            >
              destroy this request
            </a>{" "}
            and prevent unauthorized access.
          </Text>
        </Container>
      </Body>
    </EmailThemeProvider>
  );
};
export default LoginEmail;
