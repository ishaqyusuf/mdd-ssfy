
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
  name?: string;
  anniversaryYear?: number;
  discountCode?: string;
  storeUrl?: string;
}
export default function StorefrontCustomerAnniversary({
  name = "Ishaq Yusuf",
  anniversaryYear = 1,
  discountCode = "THANKYOU10",
  storeUrl = "https://example.com",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Happy Anniversary from GND Millwork!`;

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
            Happy {anniversaryYear} Year Anniversary!
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
            We're so grateful for your loyalty over the past year. To show our
            appreciation, here's a special discount just for you.
          </Text>

          <Section className="text-center my-[30px]">
            <Text
              className={`text-[16px] font-mono tracking-wide bg-gray-100 py-2 px-4 inline-block rounded ${themeClasses.text}`}
              style={{
                backgroundColor: "#f3f4f6",
                color: lightStyles.text.color,
              }}
            >
              {discountCode}
            </Text>
          </Section>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={storeUrl}>Shop Now</Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
