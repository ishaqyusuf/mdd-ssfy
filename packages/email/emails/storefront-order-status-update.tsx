
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
  orderStatus?: string;
  orderUrl?: string;
}
export default function StorefrontOrderStatusUpdate({
  name = "Ishaq Yusuf",
  orderId = "123456",
  orderStatus = "Processing",
  orderUrl = "https://example.com/orders/123456",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Update on your GND Millwork Order #${orderId}`;

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
            Your Order Status is now: {orderStatus}
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
            There's an update on your order. The status is now "{orderStatus}".
            You can view the full details of your order by clicking the button
            below.
          </Text>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={orderUrl}>View Your Order</Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
