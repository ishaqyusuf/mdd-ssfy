
import {
  Body,
  Container,
  Heading,
  Preview,
  Section,
  Text,
  Row,
  Column,
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
  orderDate?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  items?: {
    name: string;
    quantity: number;
    price: number;
  }[];
  total?: number;
}
export default function StorefrontOrderConfirmation({
  name = "Ishaq Yusuf",
  orderId = "123456",
  orderDate = new Date().toLocaleDateString(),
  shippingAddress = {
    street: "123 Main St",
    city: "Anytown",
    state: "CA",
    zip: "12345",
  },
  items = [
    { name: "Product 1", quantity: 1, price: 50 },
    { name: "Product 2", quantity: 2, price: 25 },
  ],
  total = 100,
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Your GND Millwork Order #${orderId}`;

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
            Thank you for your order!
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
            We've received your order and will notify you once it has shipped.
            Here are the details:
          </Text>

          <Section>
            <Text
              className={themeClasses.text}
              style={{ color: lightStyles.text.color }}
            >
              <strong>Order ID:</strong> {orderId}
              <br />
              <strong>Order Date:</strong> {orderDate}
            </Text>
          </Section>

          <Section>
            <Heading
              as="h2"
              className={`text-[18px] font-normal p-0 my-[20px] mx-0 ${themeClasses.heading}`}
              style={{ color: lightStyles.text.color }}
            >
              Shipping to:
            </Heading>
            <Text
              className={themeClasses.text}
              style={{ color: lightStyles.text.color }}
            >
              {shippingAddress.street}
              <br />
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
            </Text>
          </Section>

          <Section>
            <Heading
              as="h2"
              className={`text-[18px] font-normal p-0 my-[20px] mx-0 ${themeClasses.heading}`}
              style={{ color: lightStyles.text.color }}
            >
              Order Summary:
            </Heading>
            {items.map((item) => (
              <Row key={item.name}>
                <Column>{item.name}</Column>
                <Column align="right">
                  {item.quantity} x ${item.price.toFixed(2)}
                </Column>
              </Row>
            ))}
            <Row>
              <Column>
                <strong>Total</strong>
              </Column>
              <Column align="right">
                <strong>${total.toFixed(2)}</strong>
              </Column>
            </Row>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
