import { cn } from "@gnd/ui/cn";
import { formatDate } from "@gnd/utils/dayjs";
import { getAppUrl } from "@gnd/utils/envs";
import {
  Body,
  Container,
  Heading,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Logo } from "components/logo";
import { StoreFrontAd } from "components/storefront-ad";
import {
  Button,
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "components/theme";
import { format } from "date-fns";

interface Props {
  isQuote?: boolean;
  customerName: string;
  paymentLink?: string;
  pdfLink?: string;
  sales: {
    orderId: string;
    po?: string;
    date: Date;
    total: number;
    due: number;
  }[];
}

const baseAppUrl = getAppUrl();
const SalesEmail = ({
  customerName = "Ishaq Yusuf",
  sales = [
    {
      date: new Date(),
      orderId: "47837PC",
      total: 100,
      due: 50,
      po: "ABSSDD",
    },
  ],
  isQuote = false,
  paymentLink = "https://payment.com",
  pdfLink = "https://pdf.com",
}: Props) => {
  const props = { customerName, sales, isQuote, paymentLink, pdfLink };
  const text = `You've Received ${
    props.isQuote ? "a quote" : "an Invoice"
  } from GND Millwork 
        `;
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  return (
    <EmailThemeProvider preview={<Preview>{text}</Preview>}>
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
            You've Received {props.isQuote ? " a Quote" : " an Invoice"} <br />{" "}
            from GND Millwork
          </Heading>
          <br />
          <span
            className={`font-medium ${themeClasses.text}`}
            style={{ color: lightStyles.text.color }}
          >
            Hi {props.customerName},
          </span>
          <Text
            className={themeClasses.text}
            style={{ color: lightStyles.text.color }}
          >
            {props.isQuote
              ? "Please review your quote"
              : `Please review your invoice and make sure to pay it
                            on time`}
            . If you have any questions, feel free to reply to this email.
          </Text>
          <br />
          <table
            style={{ width: "100% !important", minWidth: "100%" }}
            className="border-collapse w-full"
          >
            <thead style={{ width: "100%" }}>
              <tr
                className={`border-0 border-t-[1px] border-b-[1px] border-solid h-[45px] ${themeClasses.border}`}
                style={{ borderColor: lightStyles.container.borderColor }}
              >
                <th align="left" style={{ width: "20%" }}>
                  <Text
                    className={`text-[14px] font-semibold m-0 p-0 ${themeClasses.text}`}
                    style={{ color: lightStyles.text.color }}
                  >
                    Date
                  </Text>
                </th>
                <th align="left" style={{ width: "30%" }}>
                  <Text
                    className={`text-[14px] font-semibold m-0 p-0 ${themeClasses.text}`}
                    style={{ color: lightStyles.text.color }}
                  >
                    Invoice No.
                  </Text>
                </th>
                <th align="left" style={{ width: "20%" }}>
                  <Text
                    className={`text-[14px] font-semibold m-0 p-0 ${themeClasses.text}`}
                    style={{ color: lightStyles.text.color }}
                  >
                    PO No.
                  </Text>
                </th>
                <th align="left" style={{ width: "30%" }}>
                  <Text
                    className={`text-[14px] font-semibold m-0 p-0 ${themeClasses.text}`}
                    style={{ color: lightStyles.text.color }}
                  >
                    Amount
                  </Text>
                </th>
              </tr>
            </thead>

            <tbody style={{ width: "100%", minWidth: "100% !important" }}>
              {props.sales.map((transaction) => (
                <tr
                  key={transaction.orderId}
                  className={`border-0 border-b-[1px] border-solid h-[45px] ${themeClasses.border}`}
                  style={{ borderColor: lightStyles.container.borderColor }}
                >
                  <td align="left" style={{ width: "20%" }}>
                    <Text
                      className={`text-[14px] m-0 p-0 mt-1 pb-1 ${themeClasses.text}`}
                      style={{ color: lightStyles.text.color }}
                    >
                      {format(new Date(transaction.date), "MMM d")}
                    </Text>
                  </td>
                  <td align="left" style={{ width: "30%" }}>
                    <Text
                      className="text-[14px] m-0 p-0 mt-1 pb-1 line-clamp-1"
                      // style={{
                      //   color: props.isQuote ? "#00C969 !important" : "inherit",
                      // }}
                    >
                      {transaction.orderId}
                    </Text>
                  </td>
                  <td align="left" style={{ width: "20%" }}>
                    <Text
                      className="text-[14px] m-0 p-0 mt-1 pb-1 line-clamp-1"
                      // style={{
                      //   color: props.isQuote ? "#00C969 !important" : "inherit",
                      // }}
                    >
                      {transaction.po}
                    </Text>
                  </td>
                  <td align="left" style={{ width: "30%" }}>
                    <Text
                      className={cn(
                        "text-[14px] m-0 p-0 mt-1 pb-1"
                        // props.isQuote ? "text-[#00C969]" : themeClasses.text,
                      )}
                      // style={{
                      //   color: props.isQuote
                      //     ? "#00C969 !important"
                      //     : lightStyles.text.color,
                      // }}
                    >
                      {Intl.NumberFormat("en", {
                        style: "currency",
                        currency: "USD",
                      }).format(transaction.total)}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Section className="text-center mt-[50px] mb-[50px]">
            <Button href={props.pdfLink!}>
              View {props.isQuote ? ` Quote` : " Invoice"}
            </Button>
          </Section>
          <br />
          {!props.paymentLink || (
            <>
              <Text
                className={`text-[14px] ${themeClasses.text}`}
                style={{ color: lightStyles.text.color }}
              >
                Use the link below to make payment on your device.
                <br /> Your payment will be processed securely and instantly.
              </Text>

              <Section className="text-center mt-[50px] mb-[50px]">
                <Button href={props.paymentLink}> Make Payment</Button>
              </Section>
            </>
          )}
          <br />
          <StoreFrontAd />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
};
export default SalesEmail;
