import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

import { formatCurrency } from "@gnd/utils/format";
import {
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "components/theme";
import { Logo } from "components/logo";

export default function SalesRepPaymentNotificationEmail(props: any) {
  const {
    ordersNo = ["ABC"],
    amount = 100,
    repName = "Pablo Cruz",
    customerName = "Ishaq Yusuf",
  } = props;
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const previewText = `Payment Received - Order{ordersNo?.length > 0 ? "s" : ""} #
        ${ordersNo.join(", ")}`;
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
            Payment Received
          </Heading>
          <Text>Hi {repName},</Text>
          <Text>
            A payment of <strong>{formatCurrency.format(amount)}</strong> has
            been received from {customerName} for Order{" "}
            <strong>#{ordersNo.join(", ")}</strong>.
          </Text>
          <Text>Please verify the transaction in your sales dashboard.</Text>
          <Text>Best regards,</Text>
          <Text>Sales Team</Text>
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
