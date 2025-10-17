
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
  productName?: string;
  productReviewUrl?: string;
}
export default function StorefrontProductReview({
  name = "Ishaq Yusuf",
  productName = "Product 1",
  productReviewUrl = "https://example.com/review/product-1",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `We'd love to hear your feedback on your recent purchase`;

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
            How did you like your {productName}?
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
            Thank you for your recent purchase. We'd love to hear your
            feedback on the {productName}. Your review will help other customers
            make informed decisions.
          </Text>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={productReviewUrl}>Leave a Review</Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
