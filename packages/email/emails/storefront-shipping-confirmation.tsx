
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
  orderId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}
export default function StorefrontShippingConfirmation({
  name = "Ishaq Yusuf",
  orderId = "123456",
  trackingNumber = "1Z999AA10123456789",
  trackingUrl = "https://www.fedex.com/fedextrack/?trknbr=123456789012",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Your GND Millwork Order #${orderId} has shipped!`;

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
            Your Order Has Shipped!
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
            Great news! Your order from GND Millwork has shipped. You can track
            your package using the tracking number below.
          </Text>

          <Section className="text-center my-[30px]">
            <Text
              className={`text-[16px] font-mono tracking-wide bg-gray-100 py-2 px-4 inline-block rounded ${themeClasses.text}`}
              style={{
                backgroundColor: "#f3f4f6",
                color: lightStyles.text.color,
              }}
            >
              {trackingNumber}
            </Text>
          </Section>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={trackingUrl}>Track Your Package</Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
