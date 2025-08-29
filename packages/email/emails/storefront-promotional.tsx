import {
  Body,
  Button,
  Container,
  Heading,
  Preview,
  Section,
  Text,
  Img,
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
  promoCode?: string;
  promoUrl?: string;
  promoImageUrl?: string;
}
export default function StorefrontPromotional({
  name = "Ishaq Yusuf",
  promoCode = "SAVE10",
  promoUrl = "https://example.com/sale",
  promoImageUrl = "https://via.placeholder.com/560x300",
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Don't miss out on our latest promotion!`;

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
            Our Biggest Sale of the Year!
          </Heading>
          <Section>
            <Img
              src={promoImageUrl}
              alt="Promotional Image"
              width="100%"
              style={{ maxHeight: 300, objectFit: "cover" }}
            />
          </Section>
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
            Don't miss out on our biggest sale of the year! For a limited time,
            get 10% off your entire order with the code below.
          </Text>

          <Section className="text-center my-[30px]">
            <Text
              className={`text-[16px] font-mono tracking-wide bg-gray-100 py-2 px-4 inline-block rounded ${themeClasses.text}`}
              style={{
                backgroundColor: "#f3f4f6",
                color: lightStyles.text.color,
              }}
            >
              {promoCode}
            </Text>
          </Section>

          <Section className="text-center mt-[30px] mb-[40px]">
            <Button href={promoUrl}>Shop Now</Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
