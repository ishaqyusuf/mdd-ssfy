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
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "../components/theme";

interface Props {
  customerEmail: string;
  customerName: string;
  statementTotal: number;
  accountNo?: string | null;
  message?: string | null;
  lines: {
    salesId: number;
    orderNo: string;
    date: string;
    invoice: number;
    paid: number;
    pending: number;
    customer: string;
    phone?: string | null;
    address?: string | null;
  }[];
}

const formatCurrency = (value: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

export function CustomerStatementEmail({
  customerEmail,
  customerName,
  statementTotal,
  accountNo,
  message,
  lines,
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const previewText = `Statement for ${customerName} - ${formatCurrency(statementTotal)} due`;
  const intro =
    message ||
    `Good morning ${customerName}, please see below statement for the account.`;

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body
        className={`my-auto mx-auto font-sans ${themeClasses.body}`}
        style={lightStyles.body}
      >
        <Container
          className={`my-[28px] mx-auto p-[20px] max-w-[720px] ${themeClasses.container}`}
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
              Statement
            </Text>
            <Heading
              className={`text-[28px] leading-[34px] font-semibold p-0 mt-[8px] mb-[10px] ${themeClasses.heading}`}
              style={{ color: lightStyles.text.color }}
            >
              Account statement
            </Heading>
            <Text
              className={`m-0 text-[15px] leading-[24px] ${themeClasses.text}`}
              style={{ color: lightStyles.text.color }}
            >
              {intro}
            </Text>
          </Section>

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
                  Customer email
                </Text>
                <Text
                  className={`m-0 mt-[3px] text-[14px] font-semibold ${themeClasses.text}`}
                >
                  {customerEmail}
                </Text>
              </Column>
              <Column style={{ width: "33.3%" }}>
                <Text
                  className={`m-0 text-[12px] ${themeClasses.mutedText}`}
                  style={{ color: "#64748b" }}
                >
                  Account
                </Text>
                <Text
                  className={`m-0 mt-[3px] text-[14px] font-semibold ${themeClasses.text}`}
                >
                  {accountNo || "-"}
                </Text>
              </Column>
              <Column style={{ width: "33.3%" }}>
                <Text
                  className={`m-0 text-[12px] ${themeClasses.mutedText}`}
                  style={{ color: "#64748b" }}
                >
                  Total due
                </Text>
                <Text
                  className={`m-0 mt-[3px] text-[16px] font-semibold ${themeClasses.text}`}
                >
                  {formatCurrency(statementTotal)}
                </Text>
              </Column>
            </Row>
          </Section>

          <table
            style={{
              width: "100%",
              minWidth: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead style={{ backgroundColor: "#f8fafc" }}>
              <tr>
                {[
                  "Sn",
                  "Date",
                  "Order #",
                  "Invoice",
                  "Paid",
                  "Pending",
                  "Customer",
                  "Phone",
                  "Address",
                ].map((heading) => (
                  <th
                    key={heading}
                    align={
                      ["Invoice", "Paid", "Pending"].includes(heading)
                        ? "right"
                        : "left"
                    }
                    style={{
                      borderBottom: `1px solid ${lightStyles.container.borderColor}`,
                      padding: "9px 6px",
                    }}
                  >
                    <Text
                      className={`text-[11px] uppercase tracking-[0.6px] font-semibold m-0 ${themeClasses.mutedText}`}
                      style={{ color: "#64748b" }}
                    >
                      {heading}
                    </Text>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.salesId}-${line.orderNo}`}>
                  <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {index + 1}.
                    </Text>
                  </td>
                  <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {line.date}
                    </Text>
                  </td>
                  <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {line.orderNo}
                    </Text>
                  </td>
                  <td
                    align="right"
                    style={{ padding: "10px 6px", verticalAlign: "top" }}
                  >
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {formatCurrency(line.invoice)}
                    </Text>
                  </td>
                  <td
                    align="right"
                    style={{ padding: "10px 6px", verticalAlign: "top" }}
                  >
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {formatCurrency(line.paid)}
                    </Text>
                  </td>
                  <td
                    align="right"
                    style={{ padding: "10px 6px", verticalAlign: "top" }}
                  >
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {formatCurrency(line.pending)}
                    </Text>
                  </td>
                  <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {line.customer}
                    </Text>
                  </td>
                  <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {line.phone || "-"}
                    </Text>
                  </td>
                  <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                    <Text className={`m-0 text-[12px] ${themeClasses.text}`}>
                      {line.address || "-"}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Section className="mt-[16px]">
            <Row>
              <Column style={{ width: "70%" }} />
              <Column style={{ width: "30%" }}>
                <Text
                  className={`m-0 text-[12px] uppercase tracking-[0.8px] ${themeClasses.mutedText}`}
                  style={{ color: "#64748b", textAlign: "right" }}
                >
                  Total
                </Text>
                <Text
                  className={`m-0 mt-[4px] text-[20px] font-semibold ${themeClasses.text}`}
                  style={{ textAlign: "right" }}
                >
                  {formatCurrency(statementTotal)}
                </Text>
              </Column>
            </Row>
          </Section>

          <Text
            className={`mt-[20px] text-[14px] leading-[22px] ${themeClasses.text}`}
            style={{ color: lightStyles.text.color }}
          >
            If you have any questions about this statement, reply to this email
            and our team will help.
          </Text>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

export default CustomerStatementEmail;
