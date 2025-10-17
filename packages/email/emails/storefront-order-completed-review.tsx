
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
  reviewUrl?: string;
}
export default function StorefrontOrderCompletedReview({
  name = "Ishaq Yusuf",
  orderId = "123456",
  reviewUrl = "https://example.com/review/order/123456",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `How was your experience with GND Millwork?`;

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
            How was your experience?
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
            Thank you for your recent order. We'd love to hear your feedback on
            your overall experience with us. Your review will help us improve our
            service.
          </Text>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={reviewUrl}>Leave a Review</Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
