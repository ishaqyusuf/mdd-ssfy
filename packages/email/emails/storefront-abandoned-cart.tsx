
import {
  Body,
  Button,
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
  cartUrl?: string;
  items?: {
    name: string;
    quantity: number;
    price: number;
  }[];
}
export default function StorefrontAbandonedCart({
  name = "Ishaq Yusuf",
  cartUrl = "https://example.com/cart",
  items = [
    { name: "Product 1", quantity: 1, price: 50 },
    { name: "Product 2", quantity: 2, price: 25 },
  ],
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `You left items in your cart at GND Millwork`;

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
            You have items in your cart
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
            We noticed you left some items in your shopping cart. Don't miss
            out! Complete your purchase now.
          </Text>

          <Section>
            <Heading
              as="h2"
              className={`text-[18px] font-normal p-0 my-[20px] mx-0 ${themeClasses.heading}`}
              style={{ color: lightStyles.text.color }}
            >
              Your Cart:
            </Heading>
            {items.map((item) => (
              <Row key={item.name}>
                <Column>{item.name}</Column>
                <Column align="right">
                  {item.quantity} x ${item.price.toFixed(2)}
                </Column>
              </Row>
            ))}
          </Section>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={cartUrl}>Complete Your Purchase</Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
