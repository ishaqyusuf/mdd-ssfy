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
  storeUrl: string;
}
export default function StorefrontWelcomeEmail({
  name = "Ishaq Yusuf",
  storeUrl = "https://example.com",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Welcome to GND Millwork`;

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
            Welcome to GND Millwork!
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
            We're excited to have you on board. Get ready to explore our wide
            selection of high-quality millwork products. To get started, visit
            our store.
          </Text>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={storeUrl}>Go to Store</Button>
          </Section>

          <Text
            className="text-[12px] leading-tight text-gray-500"
            style={{ color: lightStyles.text.color }}
          >
            If you have any questions, feel free to contact our support team.
          </Text>
          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}