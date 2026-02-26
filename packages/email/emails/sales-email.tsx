import {
  Body,
  Column,
  Container,
  Heading,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { Logo } from "components/logo";
import { Footer } from "components/footer";
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

const formatCurrency = (value: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

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
  const previewText = `You've received ${
    props.isQuote ? "a quote" : "an Invoice"
  } from GND Millwork`;
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const totalAmount = props.sales.reduce((acc, item) => acc + (item.total || 0), 0);
  const totalDue = props.sales.reduce((acc, item) => acc + (item.due || 0), 0);

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body
        className={`my-auto mx-auto font-sans ${themeClasses.body}`}
        style={lightStyles.body}
      >
        <Container
          className={`my-[28px] mx-auto p-[20px] max-w-[640px] ${themeClasses.container}`}
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: lightStyles.container.borderColor,
            borderRadius: 12,
            backgroundColor: lightStyles.body.backgroundColor,
          }}
        >
          <Logo />

          <Section
            className="mt-[20px] mb-[20px] p-[20px]"
            style={{
              backgroundColor: "#f8fafc",
              borderStyle: "solid",
              borderWidth: 1,
              borderColor: lightStyles.container.borderColor,
              borderRadius: 10,
            }}
          >
            <Text
              className={`m-0 text-[12px] uppercase tracking-[1.6px] ${themeClasses.mutedText}`}
              style={{ color: "#64748b" }}
            >
              GND Millwork
            </Text>
            <Heading
              className={`text-[28px] leading-[34px] font-semibold p-0 mt-[8px] mb-[10px] ${themeClasses.heading}`}
              style={{ color: lightStyles.text.color }}
            >
              {props.isQuote ? "Quote Ready for Review" : "Invoice Ready for Payment"}
            </Heading>
            <Text
              className={`m-0 text-[15px] leading-[24px] ${themeClasses.text}`}
              style={{ color: lightStyles.text.color }}
            >
              Hi {props.customerName}, please review the details below.
            </Text>
          </Section>

          <Text
            className={`m-0 mt-[4px] mb-[16px] ${themeClasses.text}`}
            style={{ color: lightStyles.text.color }}
          >
            {props.isQuote
              ? "Please take a look at the quote and confirm the scope and pricing."
              : "Please review your invoice and submit payment before the due date."}{" "}
            If you have any questions, reply directly to this email.
          </Text>

          <Section
            className="mb-[18px] p-[14px]"
            style={{
              borderStyle: "solid",
              borderWidth: 1,
              borderColor: lightStyles.container.borderColor,
              borderRadius: 10,
              backgroundColor: "#fcfcfd",
            }}
          >
            <Row>
              <Column style={{ width: "33.3%" }}>
                <Text
                  className={`m-0 text-[12px] ${themeClasses.mutedText}`}
                  style={{ color: "#64748b" }}
                >
                  Documents
                </Text>
                <Text className={`m-0 mt-[3px] text-[16px] font-semibold ${themeClasses.text}`}>
                  {props.sales.length}
                </Text>
              </Column>
              <Column style={{ width: "33.3%" }}>
                <Text
                  className={`m-0 text-[12px] ${themeClasses.mutedText}`}
                  style={{ color: "#64748b" }}
                >
                  Total
                </Text>
                <Text className={`m-0 mt-[3px] text-[16px] font-semibold ${themeClasses.text}`}>
                  {formatCurrency(totalAmount)}
                </Text>
              </Column>
              <Column style={{ width: "33.3%" }}>
                <Text
                  className={`m-0 text-[12px] ${themeClasses.mutedText}`}
                  style={{ color: "#64748b" }}
                >
                  Amount Due
                </Text>
                <Text className={`m-0 mt-[3px] text-[16px] font-semibold ${themeClasses.text}`}>
                  {formatCurrency(totalDue)}
                </Text>
              </Column>
            </Row>
          </Section>

          <table
            style={{ width: "100%", minWidth: "100%" }}
            className="border-collapse w-full"
          >
            <thead style={{ width: "100%", backgroundColor: "#f8fafc" }}>
              <tr
                className={`border-0 border-t-[1px] border-b-[1px] border-solid h-[44px] ${themeClasses.border}`}
                style={{ borderColor: lightStyles.container.borderColor, borderRadius: 8 }}
              >
                <th align="left" style={{ width: "20%" }}>
                  <Text
                    className={`text-[12px] uppercase tracking-[0.8px] font-semibold m-0 p-0 ${themeClasses.mutedText}`}
                    style={{ color: "#64748b" }}
                  >
                    Date
                  </Text>
                </th>
                <th align="left" style={{ width: "30%" }}>
                  <Text
                    className={`text-[12px] uppercase tracking-[0.8px] font-semibold m-0 p-0 ${themeClasses.mutedText}`}
                    style={{ color: "#64748b" }}
                  >
                    {props.isQuote ? "Quote No." : "Invoice No."}
                  </Text>
                </th>
                <th align="left" style={{ width: "20%" }}>
                  <Text
                    className={`text-[12px] uppercase tracking-[0.8px] font-semibold m-0 p-0 ${themeClasses.mutedText}`}
                    style={{ color: "#64748b" }}
                  >
                    PO No.
                  </Text>
                </th>
                <th align="left" style={{ width: "30%" }}>
                  <Text
                    className={`text-[12px] uppercase tracking-[0.8px] font-semibold m-0 p-0 ${themeClasses.mutedText}`}
                    style={{ color: "#64748b" }}
                  >
                    Amount
                  </Text>
                </th>
              </tr>
            </thead>

            <tbody style={{ width: "100%", minWidth: "100%" }}>
              {props.sales.map((transaction, index) => (
                <tr
                  key={transaction.orderId}
                  className={`border-0 border-b-[1px] border-solid h-[45px] ${themeClasses.border}`}
                  style={{
                    borderColor: lightStyles.container.borderColor,
                    backgroundColor: index % 2 ? "#fafafa" : "#ffffff",
                  }}
                >
                  <td align="left" style={{ width: "20%" }}>
                    <Text
                      className={`text-[14px] m-0 p-0 mt-1 pb-1 ${themeClasses.text}`}
                      style={{ color: lightStyles.text.color }}
                    >
                      {format(new Date(transaction.date), "MMM d, yyyy")}
                    </Text>
                  </td>
                  <td align="left" style={{ width: "30%" }}>
                    <Text
                      className={`text-[14px] m-0 p-0 mt-1 pb-1 ${themeClasses.text}`}
                      style={{ color: lightStyles.text.color }}
                    >
                      {transaction.orderId}
                    </Text>
                  </td>
                  <td align="left" style={{ width: "20%" }}>
                    <Text
                      className={`text-[14px] m-0 p-0 mt-1 pb-1 ${themeClasses.text}`}
                      style={{ color: lightStyles.text.color }}
                    >
                      {transaction.po || "-"}
                    </Text>
                  </td>
                  <td align="left" style={{ width: "30%" }}>
                    <Text className="text-[14px] m-0 p-0 mt-1 pb-1 font-semibold">
                      {formatCurrency(transaction.total)}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Section
            className="mt-[22px] p-[16px]"
            style={{
              borderStyle: "solid",
              borderWidth: 1,
              borderColor: lightStyles.container.borderColor,
              borderRadius: 10,
              backgroundColor: "#f8fafc",
            }}
          >
            <Text className={`m-0 text-[14px] ${themeClasses.text}`}>
              {props.isQuote
                ? "Open your quote to review details and respond quickly."
                : "Open your invoice for the full breakdown and downloadable PDF."}
            </Text>
          </Section>

          <Section className="text-center mt-[22px] mb-[26px]">
            <Button href={props.pdfLink!}>
              View {props.isQuote ? "Quote" : "Invoice"}
            </Button>
          </Section>

          {props.paymentLink && (
            <>
              <Text
                className={`text-[14px] text-center ${themeClasses.text}`}
                style={{ color: lightStyles.text.color }}
              >
                Make payment securely online from any device.
              </Text>

              <Section className="text-center mt-[16px] mb-[26px]">
                <Button href={props.paymentLink}>Make Payment</Button>
              </Section>
            </>
          )}

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
};
export default SalesEmail;
